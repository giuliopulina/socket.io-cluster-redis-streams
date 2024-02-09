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
    connectionStateRecovery: {
		// the backup duration of the sessions and the packets
		maxDisconnectionDuration: 2 * 60 * 1000,
		// whether to skip middlewares upon successful recovery
		skipMiddlewares: true,
	},
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

app.use(express.static(__dirname + '/public'));

app.head('/health', function (req, res) {
  res.sendStatus(200);
});

io.on('connection', socket => {
	
  console.log(socket.id + ' connected. Recovered = ' + socket.recovered);
  
  socket.on('message', (data) => {
	console.log('Received message ' + data.message + ' from socket.id ' + socket.id + ', broadcasting to all connected sockets' );
    socket.broadcast.emit('message', data);
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
	console.log(socket.id + ' disconnected');
  });
  
  socket.on('reconnect', () => {
	console.log(socket.id + ' reconnected');
  });
});