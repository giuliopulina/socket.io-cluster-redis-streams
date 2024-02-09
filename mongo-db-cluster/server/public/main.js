$(function() {
  
  const socket = io({
	transports: ["websocket"],  
    reconnectionDelay: 1000, 
    reconnectionDelayMax: 5000 
  });

  $("#sendMessage").on( "submit", function( event ) {
	event.preventDefault();
	const message = $( "#message" ).val();
	console.log('message to be sent = ' + message);
	socket.emit("message", {message: message});
  });

  $( "#sendMessageSubmit" ).on( "click", function() {
    $( "#sendMessage" ).trigger( "submit" );
  } );
  
  socket.on("message", (data) => {
	console.log('Received ' + data.message);
  });
  
  socket.on("connect", () => {
	  if (socket.recovered) {
		console.log('socket' + socket.id + ' recovered from a disconnection');
	  } 
	  
	  else {
		console.log('new session. Socket id = ' + socket.id);
	  }
	  
	  setTimeout(() => {
		if (socket.io.engine) {
		  if($("#automaticDisconnection").is(':checked')) {
			  console.log('Forcefully closing the connection to test automatic reconnection!!!');
			  socket.io.engine.close();
		  }
		}
	  }, 60000);
  });

  socket.on('disconnect', (reason) => {
    
	if (reason === "io server disconnect") {
		console.log('socket + ' + socket.id + ' has been disconnected by the server. Trying to reconnect in 15 seconds');
		
		// reconnecting manually
		setInterval(() => {
          socket.connect();
        }, 15000);
	} else {
		console.log('socket + ' + socket.id + ' has been disconnected by the server. Reason = ' + reason);
	}
  });

  socket.on('reconnect', function () {
    console.log('socket' + socket.id + ',you have been reconnected');
  });

  socket.on('reconnect_error', (reason) => {
    console.log('attempt to reconnect socket ' + socket.id + 'has failed because of ' + reason);
  });

});
