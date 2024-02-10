import express from 'express';
const app = express();
import http from 'http';
const httpServer = http.createServer(app);

const port = process.env.PORT || 3000;
const serverName = process.env.NAME || 'Unknown';

const server = httpServer.listen(port);

import { MongoClient } from 'mongodb';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/mongo-adapter';

import pgPkg from 'pg';
const { Pool } = pgPkg;

// Primary instance connection pool for writing
const primaryPool = new Pool({
  user: process.env.PG_PRIMARY_USER,
  host: process.env.PG_PRIMARY_HOST,
  database: process.env.PG_PRIMARY_DATABASE_NAME,
  password: process.env.PG_PRIMARY_PASSWORD,
  port: process.env.PG_PRIMARY_PORT,
});

// Read-only replica connection pool for reading
const replicaPool = new Pool({
  user: process.env.PG_REPLICA_USER,
  host: process.env.PG_REPLICA_HOST,
  database: process.env.PG_REPLICA_DATABASE_NAME,
  password: process.env.PG_REPLICA_PASSWORD,
  port: process.env.PG_REPLICA_PORT,
});

async function executePgWriteQuery(query, params) {
  const client = await primaryPool.connect();
  try {
	console.log('Executing write query = ' + query + ' with params ' + params);
    await client.query('BEGIN');
    const result = await client.query(query, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
	console.log('Caught error while executing write query = ' + query + ' with params ' + params, err);
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function executePgReadQuery(query, params) {
  const client = await replicaPool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } catch (err) {
	console.log('Caught error while executing read query = ' + query + ' with params ' + params, err);
    await client.query('ROLLBACK');
    throw err;
  }
  
  finally {
    client.release();
  }
}

import * as url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

let mongoClient;

const connectToMongoWithRetry = async () => {
    let connected = false;
    while (!connected) {
        try {
            mongoClient = await MongoClient.connect(
				process.env.MONGODB_CONNECTION_URL,
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
    .db('mydb')
    .collection('socket.io-adapter-events-ttl');

  await mongoCollection.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 3600, background: true }
  );

  return mongoCollection;
}

function initServer(mongoCollection) {
  const io = new Server(server, {
    connectionStateRecovery: {
	},
  });

  io.adapter(
    createAdapter(mongoCollection, {
      addCreatedAtField: true,
    })
  );

  return io;
}

await connectToMongoWithRetry();

const mongoCollection = await initMongoCollection();
const io = initServer(mongoCollection);

app.use(express.static(__dirname + '/public'));

app.head('/health', function (req, res) {
  res.sendStatus(200);
});

io.on('connection', async (socket) => {
	
  console.log(socket.id + ' connected. Recovered? ' + socket.recovered);
  
  socket.on('message', async(data) => {
	console.log('Received message ' + data.message + ' from socket.id ' + socket.id + ', broadcasting to all connected sockets' );
	
	let result;
    try {
      // store the message in the database
      result = await executePgWriteQuery('INSERT INTO messages (content) VALUES ($1) RETURNING id', [data.message]);
    } catch (e) {
      console.log('Caught error inserting msg in pg', e);
      return;
    }
	
    socket.broadcast.emit('message', data, result.rows[0].id);
  });
  
  if (!socket.recovered) {
	console.log(socket.id + ' reconnected without connection state recovery. Trying to sync client state');

	try {
	  const result = await executePgReadQuery('SELECT id, content FROM messages WHERE id > $1 ORDER BY id',
		[socket.handshake.auth.serverOffset || 0]);
				
		if (result && result.rows && result.rows.length > 0) {
			console.log('Synchronizing ' + socket.id + ' state upon reconnection. Found ' + result.rows.length + ' missing messages');
			for (const row of result.rows) {
				await socket.emit('message', {message: row.content}, row.id); 
			}
		} else {
			console.log('No needed to synchronize state of ' + socket.id);
		}
    } catch (e) {
	  console.log('Error during client state synchronization', e);
    }
  } else {
	  console.log('socket ' + socket.id + 'recovered using connection state recovery');
  }

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
	console.log(socket.id + ' disconnected');
  });
  
});