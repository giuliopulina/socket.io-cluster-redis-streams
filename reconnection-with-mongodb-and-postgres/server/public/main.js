$(function() {
	 
  const $window = $(window);
  const $usernameInput = $('#usernameInput'); // Input for username
  const $messages = $('.messages'); // Messages area
  const $inputMessage = $('#inputMessage'); // Input message input box
  const $sendMessageForm = $('#sendMessageForm');
  const $sendMessageFormSubmit = $('#sendMessageFormSubmit');
  const $setUsernameForm = $('#setUsernameForm');
  const $setUsernameFormSubmit = $('#setUsernameFormSubmit');
  const $serverName = $('#serverName');
  
  let username;

  const $loginPage = $('.login.page'); // The login page
  const $chatPage = $('.chat.page'); // The chatroom page
  
  const socket = io({
	transports: ["websocket"],  
    reconnectionDelay: 1000, 
    reconnectionDelayMax: 5000,
    auth: {
      serverOffset: 0
    }	
  });

  $sendMessageForm.on("submit", function(event) {
	event.preventDefault();
	const message = $inputMessage.val();
	if (message && message.length > 0) {
		sendMessage(username, message);
	} else {
		console.log('invalid message' + message);
	}	
  });

  $sendMessageFormSubmit.on("click", function() {
    $sendMessageForm.trigger("submit");
  });
  

  
  $setUsernameForm.on("submit", function(event) {
	event.preventDefault();
	const newUser = $usernameInput.val();
	if (newUser && newUser.length > 0) {
		console.log('new user ' + newUser);
		username = newUser;
		socket.emit("new_user", {username: username});
		$loginPage.fadeOut();
        $chatPage.show();
        $loginPage.off('click');
        $currentInput = $inputMessage.focus();
	} else {
		console.log('username invalid ' + username);
	}
  });
  
  $setUsernameFormSubmit.on("click", function() {
    $setUsernameForm.trigger("submit");
  });
  
  function addMessageElement(el) {
    const $el = $(el);
    $messages.append($el);
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }
  
  function addChatMessage(data) {
	
	const $timestampDiv = $('<span class="date"/>')
      .text(data.timestamp ? new Date(data.timestamp).toLocaleString() + " " : " ")
      .css('color', 'orange');
	
    const $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', 'green');
    const $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    const $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .append($timestampDiv, $usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv);
  }
  
  // Sends a chat message
  function sendMessage(fromUsername, message) {
    //message = cleanInput(message);
    if (message && message.length > 0) {
      $inputMessage.val('');
	  
	  // simulate connection state recovery with 'disconnect' message
	  if (message === 'disconnect') {
		  socket.io.engine.close();
		  return;
	  }
	  
	  const messageData = {
		timestamp: new Date().getTime(),
        username: fromUsername,
        message: message
      };
	  
      addChatMessage(messageData);
	  
      socket.emit('message', messageData);
    }
  }

  
  
  socket.on("message", (data, serverOffset) => {
	console.log('Received ' + data.message);
	addChatMessage(data);
	socket.auth.serverOffset = serverOffset;
  });
  
   socket.on('server_name', (serverName) => {
	// we store the username in the socket session for this client
	$serverName.text("Server = " + serverName);
  });
  
  socket.on("connect", () => {
	  if (socket.recovered) {
		console.log('socket' + socket.id + ' recovered from a disconnection');
	  } 
	  
	  else {
		console.log('new session. Socket id = ' + socket.id);
	  }
  });

  socket.on('disconnect', (reason) => {
    
	if (reason === "io server disconnect") {
		console.log('Socket ' + socket.id + ' has been disconnected by the server. Trying to reconnect in 15 seconds');
		
		// reconnecting manually
		setInterval(() => {
          socket.connect();
        }, 15000);
	} else {
		console.log('Socket ' + socket.id + ' has been disconnected by the server. Reason = ' + reason);
	}
  });

  socket.on('reconnect', function () {
    console.log('Socket' + socket.id + ' has been reconnected');
  });

  socket.on('reconnect_error', (reason) => {
    console.log('Attempt to reconnect socket ' + socket.id + 'has failed because of ' + reason);
  });

});
