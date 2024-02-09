# socket.io-experiments

Some experiments with socket.io.
I would like to achieve:

- a setup that supports connection state recovery in a cluster of Node.js instances, connected to a Mongo (or Redis) cluster through the socket.io adapter
- a set of (fully or partially) automated test cases that cover all possible case of reconnection and verify that no messages are lost when a client reconnects 
