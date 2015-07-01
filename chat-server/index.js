var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var users = {};
var friendships = [];
var messages = [];

app.use('/static', express.static(__dirname + '/static'));

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html')
});

io.on('connection', function(socket) {
	socket.on('login', function(object) {
		console.log(object.username);
		users[object.username] = socket;
	});
	socket.on('send message', function(object) {
		// console.log(object.messageText);
		// console.log(object.sender);
		// console.log(object.receiver);
		messages.push([object.sender, object.receiver, object.messageText, object.datetime]);
		console.log(messages);
	}); 
	socket.on('add friend', function(object) {
		// console.log(object.username);
		// console.log(object.friend);
		friendships.push([object.username, object.friend]);
		console.log(friendships);
	});
});

http.listen(3000, function() {
	console.log('listening on port 3000');
});
