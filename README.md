fun
===
A declarative webapp programming language with global realtime synchronization of state

Getting started
---------------
Grab dependencies
	
	make

If you don't have redis or node installed, fin can help you with that:

	cd lib/fin
	sudo make install-node

	cd lib/fin
	sudo make install-redis

Run chat.fun
------------
In your terminal

	make run

In your browser

	http://localhost/path_to_fun/parse_and_run.php?code=chat.fun
