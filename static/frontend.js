/**
 * http://usejsdoc.org/
 */

$(function () {
	"use strict";
  
  let content = $('#content');
  let input = $('#input');
  let status = $('#status');
  
  let myColor = false;
  
  let myName = false;
  
//if user is running mozilla then use it's built-in WebSocket
  window.WebSocket = window.WebSocket || window.MozWebSocket;

  // if browser doesn't support WebSocket, just show
  // some notification and exit
  if (!window.WebSocket) {
    content.html($('<p>',
      { text:'Sorry, but your browser doesn\'t support WebSocket.'}
    ));
    input.hide();
    $('span').hide();
    return;
  }
  
  let connection = new WebSocket('ws://127.0.0.1:1337');
  connection.onopen = function () {
    // connection is opened and ready to use
	 // first user enters his name
	    input.removeAttr('disabled');
	    status.text('Choose name:')
  };

  connection.onerror = function (error) {
    // an error occurred when sending/receiving data
	  content.html($('<p>', {
	      text: 'Sorry, but there\'s some problem with your '
	         + 'connection or the server is down.'
	    }));
  };

  // incomming message
  connection.onmessage = function (message) {
    // try to decode json (I assume that each message
    // from server is json)
    try {
      var json = JSON.parse(message.data);
    } catch (e) {
      console.log('This doesn\'t look like a valid JSON: ',
          message.data);
      return;
    }
    // handle incoming message
    
    if (json.type === 'color') { 
        myColor = json.data;
        status.text(myName + ': ').css('color', myColor);
        input.removeAttr('disabled').focus();
        // from now user can start sending messages
      } else if (json.type === 'history') { // entire message history
        // insert every single message to the chat window
        for (var i=0; i < json.data.length; i++) {
        addMessage(json.data[i].author, json.data[i].text,
            json.data[i].color, new Date(json.data[i].time));
        }
      } else if (json.type === 'message') { // it's a single message
        // let the user write another message
        input.removeAttr('disabled'); 
        addMessage(json.data.author, json.data.text,
                   json.data.color, new Date(json.data.time));
      } else {
        console.log('Hmm..., JSON format not recognized:', json);
      }
  };
  
  /**
   * Send message when user presses Enter key
   */
  input.keydown(function(e) {
    if (e.keyCode === 13) {
      var msg = $(this).val();
      if (!msg) {
        return;
      }
      // send the message as an ordinary text
      connection.send(msg);
      $(this).val('');
      // disable the input field to make the user wait until server
      // sends back response
      input.attr('disabled', 'disabled');
      // we know that the first message sent from a user their name
      if (myName === false) {
        myName = msg;
      	}
    }
  });
  
  /**
   * Add message to the chat window
   */
  function addMessage(author, message, color, dt) {
    content.append('<p><span style="color:' + color + '">'
        + author + '</span> @ ' + (dt.getHours() < 10 ? '0'
        + dt.getHours() : dt.getHours()) + ':'
        + (dt.getMinutes() < 10
          ? '0' + dt.getMinutes() : dt.getMinutes())
        + ': ' + message + '</p>');
    
    content.scrollTop(content[0].scrollHeight);
  }
  
});