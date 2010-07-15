fun
===
A declarative & realtime UI programming language

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
    node parse_and_run.js 1 parsers/1/samples/name_and_age.fun

or your browser:
    http://localhost/fun/parse_and_run.php
