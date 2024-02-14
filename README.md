# Repository description

In this repository, I'm performing some experiments with the Socket.io library.\
The primary objective is to deepen my understanding of the library's functionalities, particularly its possibilities in terms of for scalability, resilience, and fault tolerance.

List of experiments (one per folder):

1. *redis-single-node*\
A chat application (derived from Socket.io [example](https://github.com/socketio/socket.io/tree/main/examples/chat) deployed within a cluster of Socket.io servers, that communicate via a singular Redis instance using Redis Streams adapter. 
Load balancing and session persistence are attained through the utilization of Nginx in front of the Node.js servers.example.
  \
**Known issues**:
    - All the requests are routed to the same Socket.io server, probably because of the way 'hash' load balancing mode of Nginx works in a local environment. 
    - Chat application is not designed to demonstrate a multi-node environment, because the user count is stored in the single node Socket.io node and not on the adapter, so, despite the appication is working, the user count is misleading. 

3. *redis-streams-cluster*\
Same chat application as 'redis-single-node', deployed within a cluster of Socket.io servers. These servers communicate through a Redis Cluster using the [Redis Streams Adapter](https://socket.io/docs/v4/redis-streams-adapter/).\
[Connection state recovery](https://socket.io/docs/v4/tutorial/step-6) is enabled.\
Load balancing and session persistence are attained through the utilization of Nginx in front of the Node.js servers.example.
Initially, I couldn't make Redis Streams work. It took me a lot of effort to find a configuration that works with Docker.     
**Known issues**:
    - All the requests are routed to the same Socket.io server, probably because of the way 'hash' load balancing mode of Nginx works in a local environment. 
      For the subsequent experiment, I replaced Nginx with Haproxy for this reason.
    - Chat application is not designed to demonstrate a multi-node environment, because the user count is stored in the single node Socket.io node and not on the adapter, so, despite the appication is working, the user count is misleading. 

4. *reconnection-with-mongodb-and-postgres*\
A simplified version of the chat (in need of refinement) deployed within a cluster of Socket.io servers, communicating via a MongoDB cluster using the [MongoDB Adapter](https://socket.io/docs/v4/mongo-adapter/).\
Connection state recovery is enabled.\
For persistent storage and synchronization of client's state during new connection and reconnection (see [Server Delivery tutorial](https://socket.io/docs/v4/tutorial/step-7), a Postgres database, configured in a cluster with one read-write instance and one read-only instance, is employed. 
Synchronization of Postgres instances is achieved through the usage of [repmgr](https://www.repmgr.org/). 
The application is configured to always read from the read-only instance.\
To ensure load balancing and session persistence, Haproxy is employed in front of the Node.js servers.\
Sending special messages in the chat, it is possible to:
     - empty the postgres DB (sending 'empty_database' message) 
     - simulate a connection state recovery (sending 'disconnect' message)  
**Known issues**:
     - The user interface could be improved and sending messages in chat is more a workaround to easily perform some tests without creating additional UI elements, mainly because of my lack of skills in front-end development.
      In the future, a goal is to enhance the application's functionality to facilitate execution of test cases and visualization of associated data.

## How to run:

- cd <project_folder>
- docker-compose up
- connect to http://localhost:3000 with different browsers
