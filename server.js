/**
 * 
 */
"use strict";
process.title = "node-chat";

const webSocketServerPort = 3000;
const WebSocketServer = require('websocket').server;
const http = require('http');
const express = require("express");
const path = require("path");
const compression = require("compression");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const auth = require("./auth");

let history = [];

let clients = [];
let colors = [ 'red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange' ];

function htmlEntities(str){
	return String(str).replace('/&/g', '&amp;').replace('/</g', '&lt;'
			).replace('/>/g', '&gt;').replace('/"/g', '&quot;');
	
}

const app = express();
//code for importing static files
app.use(express.static(path.join(__dirname)));

app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser("secrettext"));

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use(session(
		{   secret: "secrettext",
			resave: true,
			saveUninitialized: true,
			cookie:{httpOnly:false},
			}));

app.use(auth.initialize());
app.use(auth.session());

app.get('/', auth.protected, function(req, res){
	res.redirect('/home');
});

app.get('/home', auth.protected, function(req, res){
	res.render(__dirname + "/index.html", {request:req});
	console.log(req.session.passport.user);
});
//GET login, Call passport authentication method

app.get('/login', auth.authenticate('saml', {failureRedirect: '/login', failureFlash: true}),
		function(req, res){
			res.sendFile(__dirname + "/login.html");
		}	
)

// POST methods, redirect to home successful login
app.post('/login/callback', auth.authenticate('saml', {failureRedirect: '/login', failureFlash: true}),
		function(req, res){
			  res.redirect('/home');
		}
)

const httpServer= app.listen(webSocketServerPort, function() { 
	console.log((new Date()) + "Server is listening on port "+ webSocketServerPort);
});

// create the websocket server
const wsServer = new WebSocketServer({
	  // WebSocket server is tied to a HTTP server. WebSocket
	  // request is just an enhanced HTTP request. 
  httpServer: httpServer
});

// WebSocket server
wsServer.on('request', function(request) {
	console.log((new Date()) + 'Connection form origin ' + request.origin + ' .');
	console.log(" cookie : "+ JSON.stringify(request.cookies));
	let connection = request.accept(null, request.origin);
	
	let index = clients.push(connection) -1;
	
	let username = false;
	let userColor = false;
	
	console.log((new Date())+ ' Connection accepted.');
	
	
	if(history.length > 0){
		connection.sendUTF(
				JSON.stringify({type: 'history', data: history})
				);
	}
	 // This is the most important callback for us, we'll handle
	 // all messages from users here.
	 connection.on('message', function(message) {
	    if (message.type === 'utf8') {
	      // process WebSocket message
	    	if (username === false){
	    		username = htmlEntities(message.utf8Data);
	    		userColor = colors.shift();
	    		
	    		connection.sendUTF(
	    				JSON.stringify({type: 'color', data: userColor}));
	    		console.log((new Date()) + ' User is known as : '+ username + ' with '+ userColor +' color.');
	    	}else{
	    		console.log((new Date()) + ' Received message from '+ username + ' : '+ message.utf8Data);
	    			
	    	}
	    	
	    	let obj = {
	    			time: (new Date()).getTime(),
	    			text: htmlEntities(message.utf8Data),
	    			author: username,
	    			color: userColor	
	    	};
	    	
	    	history.push(obj);
	    	history = history.slice(-100);
	    	
	    	let json = JSON.stringify({type: 'message', data: obj});
	    	//broadcast message to all client
	    	for (var i=0; i < clients.length; i++){
	    		clients[i].sendUTF(json);
	    	}
	    }
  });
 // user disconnected
  connection.on('close', function(connection) {
    // close user connection
	    if (username !== false && userColor !== false) {
	        console.log((new Date()) + " Peer "
	            + connection.remoteAddress + " disconnected.");
	        // remove user from the list of connected clients
	        clients.splice(index, 1);
	        // push back user's color to be reused by another user
	        colors.push(userColor);
	      }
  });
});