var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var users = {};
var usersTimeData = {};
var friendships = [];
var messages = [];

app.use('/static', express.static(__dirname + '/static'));

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {

	socket.on('login', function(object) {
		if (object.username in users) {
			users[object.username] = socket;
			var userFriends = [];
			for (i = 0; i < friendships.length; i++) {
				if (friendships[i][0] === object.username)
					userFriends.push({friend: friendships[i][1], status: users[friendships[i][1]] === null ? false:true});
				if (friendships[i][1] === object.username && users[friendships[i][0]])
					users[friendships[i][0]].emit('online friend', {friend: object.username});
			}
			socket.emit('login', {friends: userFriends, lastOnline: usersTimeData});
		}
		else {
			users[object.username] = socket;
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
		if (object.friend in users && !contains(friendships, [object.username, object.friend])) {
			friendships.push([object.username, object.friend]);
			socket.emit('added friend', {friend: object.friend, status: users[object.friend] === null ? false:true});
		}
		else if (!object.friend in users) {
			socket.emit('no such member');
		}
		else if (contains(friendships, [object.username, object.friend])) {
			socket.emit('already friends');
		}
	});

	socket.on('send message', function(object) {
		messages.push([object.senderUsername, object.receiver, object.messageText, object.datetime]);

		var messageObject = {
			senderUsername: object.senderUsername,
			receiver: object.receiver,
			messageText: object.messageText,
			datetime: object.datetime
		}

		// send to sender socket;
		var senderSocket = users[object.senderUsername];
		senderSocket.emit('receive message myself', messageObject);
		// send to receiver socket
		var receiverSocket = users[object.receiver];
		receiverSocket.emit('receive message other', messageObject);
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
		usersTimeData[object.username] = new Date().toUTCString();
		for (i = 0; i < friendships.length; i++) {
			if (friendships[i][1] === object.username && users[friendships[i][0]])
				users[friendships[i][0]].emit('offline friend', {friend: object.username, lastOnline: usersTimeData});
		}
	});
});

http.listen(3000, function() {
	console.log('listening on port 3000');
});
