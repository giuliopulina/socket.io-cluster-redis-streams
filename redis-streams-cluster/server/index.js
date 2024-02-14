const express = require('express');

const { Server } = require("socket.io");
const { createAdapter } = require('@socket.io/redis-streams-adapter');
const { createCluster } = require('redis');

const port = process.env.PORT || 3000;
const serverName = process.env.NAME || 'Unknown';

async function initRedisClient() {
	
	console.log(process.env);
	
	let connected = false;
    while (!connected) {
        try {
	
			const redisClient = createCluster({
			  rootNodes: [
				{
				  url: "redis://host.docker.internal:7000",
				},
				{
				  url: "redis://host.docker.internal:7001",
				},
				{
				  url: "redis://host.docker.internal:7002",
				},
				{
				  url: "redis://host.docker.internal:7003",
				},
				{
				  url: "redis://host.docker.internal:7004",
				},
				{
				  url: "redis://host.docker.internal:7005",
				},
			  ],
			  nodeAddressMap: {
				'127.0.0.1:7000': {
				  host: 'host.docker.internal',
				  port: 7000
				},
				'127.0.0.1:7001': {
				  host: 'host.docker.internal',
				  port: 7001
				},
				'127.0.0.1:7002': {
				  host: 'host.docker.internal',
				  port: 7002
				},
				'127.0.0.1:7003': {
				  host: 'host.docker.internal',
				  port: 7003
				},
				'127.0.0.1:7004': {
				  host: 'host.docker.internal',
				  port: 7004
				},
				'127.0.0.1:7005': {
				  host: 'host.docker.internal',
				  port: 7005
				}
			  }
			});
			
			console.log("Before connecting to Redis cluster");
			await redisClient.connect();
			redisClient.on('error', (err) => console.log('Redis Cluster Error', err));
			console.log("After connecting to Redis cluster");
			connected = true;
			return redisClient;
		}
		catch (error) {
            console.error('Failed to connect to Redis', error.message);
            console.log('Retrying in 20 seconds...');
            await new Promise(resolve => setTimeout(resolve, 20000)); // Wait for 20 seconds before retrying
        }
	}
}

(async () => {
   const redisClient = await initRedisClient();

   console.log('Before creating io');
   const app = express();
   const httpServer = require("http").createServer(app);
   const server = httpServer.listen(port);
   const io = new Server(server, {
	  adapter: createAdapter(redisClient),
	  connectionStateRecovery: {
		// the backup duration of the sessions and the packets
		maxDisconnectionDuration: 2 * 60 * 1000,
		// whether to skip middlewares upon successful recovery
		skipMiddlewares: true,
	  }
	});
	
	console.log('After creating io');

	// Routing
	app.use(express.static(__dirname + '/public'));

	// Chatroom
	let numUsers = 0;

	io.on('connection', socket => {
	  socket.emit('my-name-is', serverName);

	  let addedUser = false;

	  // when the client emits 'new message', this listens and executes
	  socket.on('new message', data => {
		// we tell the client to execute 'new message'
		socket.broadcast.emit('new message', {
		  username: socket.username,
		  message: data
		});
	  });

	  // when the client emits 'add user', this listens and executes
	  socket.on('add user', username => {
		if (addedUser) return;

		// we store the username in the socket session for this client
		socket.username = username;
		++numUsers;
		addedUser = true;
		socket.emit('login', {
		  numUsers: numUsers
		});
		// echo globally (all clients) that a person has connected
		socket.broadcast.emit('user joined', {
		  username: socket.username,
		  numUsers: numUsers
		});
	  });

	  // when the client emits 'typing', we broadcast it to others
	  socket.on('typing', () => {
		socket.broadcast.emit('typing', {
		  username: socket.username
		});
	  });

	  // when the client emits 'stop typing', we broadcast it to others
	  socket.on('stop typing', () => {
		socket.broadcast.emit('stop typing', {
		  username: socket.username
		});
	  });

	  // when the user disconnects.. perform this
	  socket.on('disconnect', () => {
		if (addedUser) {
		  --numUsers;

		  // echo globally that this client has left
		  socket.broadcast.emit('user left', {
			username: socket.username,
			numUsers: numUsers
		  });
		}
	  });
	});
})();
