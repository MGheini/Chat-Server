var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var users = {};

app.use('/static', express.static(__dirname + '/static'));

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html')
});

io.on('connection', function(socket) {
	socket.on('login', function(object) {
		var user = {
			username: object.username,
			friends: [],
			messages: []
		}
		console.log(object.username);
		users[object.username] = socket;
	});
});

http.listen(3000, function() {
	console.log('listening on port 3000');
});