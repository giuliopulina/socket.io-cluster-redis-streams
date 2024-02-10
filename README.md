# socket.io-experiments

In this repository, I'm performing some experiments with the Socket.io library. 
The primary objective is to deepen my understanding of the library's functionalities, particularly its possibilities in terms of for scalability, resilience, and fault tolerance.

List of experiments (one per folder):

- redis-single-node: A chat application (derived from Socket.io [example](https://github.com/socketio/socket.io/tree/main/examples/chat) deployed within a cluster of Socket.io servers, that communicate via a singular Redis instance using Redis adapter. 
Load balancing and session persistence are attained through the utilization of Nginx in front of the Node.js servers.example.
Known issues: 
- All the requests are routed to the same Socket.io server, probably because of the way 'hash' load balancing mode of Nginx works in a local environment. For this reason, I couldn't realize that the chat application was buggy and not compatible with a cluster setup.
For the subsequent experiments, I replaced Nginx with Haproxy.

- redis-streams-cluster: Same chat application as 'redis-single-node', deployed within a cluster of Socket.io servers. These servers communicate through a Redis Cluster using the Redis Streams Adapter.
[Connection state recovery](https://socket.io/docs/v4/tutorial/step-6) is enabled.
Load balancing and session persistence are attained through the utilization of Haproxy in front of the Node.js servers.example.
Known issues:
- Unfortunately, the current state of this project is non-functional due to connectivity issues between the Redis Streams Adapter and the Redis Cluster. While a workaround could involve configuring it to use a single node, the project's original intent was to establish a highly available setup.
For the subsequent experiments, I replaced Redis Streams with MongoDB.

- reconnection-with-mongodb-and-postgres: A sample application (in need of refinement) deployed within a cluster of Socket.io servers, communicating via a MongoDB cluster using the MongoDB Adapter. Connection state recovery is enabled.
For persistent storage and synchronization of client's state during new connection and reconnection (see [Server Delivery tutorial](https://socket.io/docs/v4/tutorial/step-7), a Postgres database, configured in a cluster with one read-write instance and one read-only instance, is employed. 
Synchronization of Postgres instances is achieved through the usage of [repmgr](https://www.repmgr.org/). 
The application is configured to always read from the read-only instance.
To ensure load balancing and session persistence, Haproxy is employed in front of the Node.js servers.
Known issues:
- In this project, the Socket.io-based chat feature was omitted due to its complexity and lack of compatibility with clustering. Consequently, the user interface suffers from poor design and test cases are not explicitely defined.
In the future, a goal is to enhance the application's functionality to facilitate execution of test cases and visualization of associated data.

To run the project:

- cd <project_folder>
- docker-compose up
