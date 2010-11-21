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

	./fun chat.app

Production vs development environments
--------------------------------------

Fun compiles down to javascript which gets runs on top of fin, a realtime datastore. Fin requires two "engine components", a pubsub component and a persistence component.

By default, fin uses the "developer" engine. While the developer engine is well suited for development work, you would not want to deploy it in production. For production I recommend you use the redis engine, or roll your own (see lib/fin/engines/redis.js):

	./fun chat.app --engine=redis

If you don't have redis installed, you'll need to install it to use the redis engine

	sudo make -f lib/fin/Makefile install-redis
