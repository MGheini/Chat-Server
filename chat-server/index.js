var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var users = {};
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
			socket.emit('login', {friends: userFriends});
		}
		else {
			users[object.username] = socket;
		}
	});
	socket.on('send message', function(object) {
		messages.push([object.sender, object.receiver, object.messageText, object.datetime]);
	}); 
	socket.on('add friend', function(object) {
		if (object.friend in users) {
			friendships.push([object.username, object.friend]);
			socket.emit('added friend', {friend: object.friend, status: users[object.friend] === null ? false:true});
		}
		else {
			socket.emit('no such member');
		}
	});
	socket.on('logout', function(object) {
		users[object.username] = null;
		for (i = 0; i < friendships.length; i++) {
			if (friendships[i][1] === object.username && users[friendships[i][0]])
				users[friendships[i][0]].emit('offline friend', {friend: object.username});
		}
	});
});

http.listen(3000, function() {
	console.log('listening on port 3000');
});
