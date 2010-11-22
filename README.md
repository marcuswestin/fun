fun
===
A declarative programming language for realtime web applications

Getting up and running
----------------------
Grab dependencies

	make

If you don't have node.js installed, you'll need to install it

	sudo make -f lib/fin/Makefile install-node

Now run the example chat app!

	./fun chat.fun

Production vs development environments
--------------------------------------
Fun compiles down to javascript which gets runs on top of fin, a realtime datastore. Fin requires two "engine components", a pubsub component and a persistence component.

By default, fin uses the "developer" engine. While the developer engine is well suited for development work, you would not want to deploy it in production. For production I recommend you use the redis engine, or roll your own (see lib/fin/engines/redis.js):

	./fun chat.app --engine=redis

If you don't have redis installed, you'll need to install it to use the redis engine

	sudo make -f lib/fin/Makefile install-redis

Getting involved
----------------
The best way to get involved is to start writing fun apps and using them. There are bugs and inefficiencies waiting to be discovered!

See roadmap.md for plans that are anywhere from near to distant future.

If you want to dig into the internals of fun, here are some good places to start:
- language/parser.js takes a stream of tokens and convert them into an abstract syntax tree
- language/compiler.js takes an abstract syntax tree and converts it into javascript that gets served to the client
- lib/fin/js/client/api.js is the API the clients use for realtime state synchronization
- lib/fin/js/server/Client.js is the code that represents a client on the server
- lib/fin/js/server/Server.js is the code that persists data and publishes state changes
- lib/fin/engines/*.js - these are the persistence and pubsub engines that drive the realtime data synchronization
