/**
 * 
 */
"use strict";
process.title = "node-chat";

const webSocketServerPort = 1337;
const WebSocketServer = require('websocket').server;
const http = require('http');
const express = require("express");
const path = require("path");
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

app.get(function(req, res){
	res.sendFile(__dirname + "/index.html");
});


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