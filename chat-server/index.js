var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var users = {};
var usersTimeData = {};
var friendships = [];
var messages = [];
var currentOpenTabs = {}

app.use('/static', express.static(__dirname + '/static'));

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {

	socket.on('login', function(object) {
		if (object.username in users) {
			users[object.username] = socket;
			var userFriends = [];
			var userNotifs = [];
			for (i = 0; i < friendships.length; i++) {
				if (friendships[i][0] === object.username)
					userFriends.push({friend: friendships[i][1], status: users[friendships[i][1]] === null ? false:true});
				if (friendships[i][1] === object.username) {
					userNotifs.push({friend: friendships[i][0], unseenNum: friendships[i][2]})
					if (users[friendships[i][0]])
						users[friendships[i][0]].emit('online friend', {friend: object.username, openTab: currentOpenTabs[friendships[i][0]]});
				}
			}
			socket.emit('login', {friends: userFriends, notifs: userNotifs, lastOnline: usersTimeData});
		}
		else {
			users[object.username] = socket;
			currentOpenTabs[object.username] = "";
		}
	});

	function contains(a, obj) {
		for (var i = 0; i < a.length; i++) {
			if (a[i][0] === obj[0] && a[i][1] === obj[1]) {
				return true;
			}
		}
		return false;
	}

	socket.on('add friend', function(object) {
		if (object.friend in users && !contains(friendships, [object.username, object.friend]) && object.friend !== object.username) {
			friendships.push([object.username, object.friend, 0]);
			var userNotif = 0;
			for (i = 0; i < friendships.length; i++) {
				if (friendships[i][0] === object.friend && friendships[i][1] === object.username) {
					userNotif = friendships[i][2];
					break;
				}
			}
			socket.emit('added friend', {friend: object.friend, notif: userNotif, status: users[object.friend] === null ? false:true});
		}
		else if (!(object.friend in users)) {
			socket.emit('no such member');
		}
		else if (contains(friendships, [object.username, object.friend])) {
			socket.emit('already friends');
		}
		else if (object.friend === object.username) {
			socket.emit('cannot add yourself');
		}
	});

	socket.on('send message', function(object) {
		receiver = currentOpenTabs[object.senderUsername];
		messages.push([object.senderUsername, receiver, object.messageText, object.datetime]);

		var senderMessageObject = {
			messageText: object.messageText,
			datetime: object.datetime
		}

		// send to sender socket;
		var senderSocket = users[object.senderUsername];
		senderSocket.emit('receive message myself', senderMessageObject);

		var receiverMessageObject = {
			sender: object.senderUsername,
			receiver: receiver,
			openTab: currentOpenTabs[receiver],
			messageText: object.messageText,
			datetime: object.datetime
		}

		// send to receiver socket
		var receiverSocket = users[receiver];
		if(receiverSocket !== null) // receiver is online
			receiverSocket.emit('receive message other', receiverMessageObject);
		else { // receiver is offline
			// we just need to inc unseen notifs!!
			for (i = 0; i < friendships.length; i++) {
				if (friendships[i][1] === receiver && friendships[i][0] === object.senderUsername) {
					friendships[i][2]++;
					break;
				}
			}
		}
	});

	socket.on('get history', function(object) {
		var userMessages = [];
		for(var i = 0; i < messages.length; i++) {
			if((messages[i][0] === object.sender && messages[i][1] === object.receiver) || (messages[i][0] === object.receiver && messages[i][1] === object.sender)) {
				userMessages.push(messages[i]);
			}
		}
		socket.emit('receive history', userMessages);
	});

	socket.on('logout', function(object) {
		users[object.username] = null;
		currentOpenTabs[object.username] = "";
		usersTimeData[object.username] = new Date().toUTCString();
		for (i = 0; i < friendships.length; i++) {
			if (friendships[i][1] === object.username && users[friendships[i][0]])
				users[friendships[i][0]].emit('offline friend', {friend: object.username, openTab: currentOpenTabs[friendships[i][0]], lastOnline: usersTimeData});
		}
	});

	socket.on('open tab', function(object) {
		currentOpenTabs[object.sender] = object.receiver;
		for (i = 0; i < friendships.length; i++) {
			if (friendships[i][1] === object.sender && friendships[i][0] === object.receiver) {
				friendships[i][2] = 0;
				break;
			}
		}
	});

	socket.on('inc unseen msgs', function(object) {
		for (i = 0; i < friendships.length; i++) {
			if (friendships[i][1] === object.receiver && friendships[i][0] === object.sender) {
				friendships[i][2]++;
				break;
			}
		}
	});
});

http.listen(3000, function() {
	console.log('listening on port 3000');
});
