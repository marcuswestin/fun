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

Run some fun code
-----------------
with your terminal:
    node parse_and_run.js code=fun_code/mouseXY.fun

or your browser:
    http://localhost/fun/parse_and_run.php?code=mouseXY.fun
