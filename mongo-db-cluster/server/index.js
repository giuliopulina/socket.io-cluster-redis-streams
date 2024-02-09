import express from 'express';
const app = express();
import http from 'http';
const httpServer = http.createServer(app);

const port = process.env.PORT || 3000;
const serverName = process.env.NAME || 'Unknown';

const server = httpServer.listen(port);

import { MongoClient } from "mongodb";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/mongo-adapter";

import * as url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

let mongoClient;

const connectWithRetry = async () => {
    let connected = false;
    while (!connected) {
        try {
            console.log('Connecting to MongoDB...');
            mongoClient = await MongoClient.connect(
				"mongodb://mongo1:27017,mongo2:27018,mongo3:27019/?replicaSet=myReplicaSet",
				{ useNewUrlParser: true }
			);
            connected = true;
        } catch (error) {
            console.error('Failed to connect to MongoDB:', error.message);
            console.log('Retrying in 20 seconds...');
            await new Promise(resolve => setTimeout(resolve, 20000)); // Wait for 20 seconds before retrying
        }
    }
};

async function initMongoCollection() {

  const mongoCollection = mongoClient
    .db("mydb")
    .collection("socket.io-adapter-events-ttl");

  await mongoCollection.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 3600, background: true }
  );

  return mongoCollection;
}

function initServer(mongoCollection) {
  const io = new Server(server, {
    connectionStateRecovery: {},
  });

  io.adapter(
    createAdapter(mongoCollection, {
      addCreatedAtField: true,
    })
  );

  return io;
}

await connectWithRetry();

const mongoCollection = await initMongoCollection();

const io = initServer(mongoCollection);
console.log('After creating io');

app.use(express.static(__dirname + '/public'));

app.head('/health', function (req, res) {
  res.sendStatus(200);
});

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
	
	if (username === 'reconnect') {
		setTimeout(() => {
          socket.disconnect();
        }, 30000);
	}  
	
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
  
  socket.on('reconnect', () => {
	console.log('Rennected');
  });
});