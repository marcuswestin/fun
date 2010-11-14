all: lib/fin lib/node-optimist

run: lib/fin
	redis-server &> running-redis-server.out &
	cd lib/fin; node run_server.js &> ../../running_node_fin_server.out &
	echo "\nFin server running"

.PHONY: stop
stop:
	killall node
	killall redis-server
	echo "\nFin server stopped"

.PHONY: restart
restart: stop run

################
# Dependencies #
################
.PHONY: clean
clean:
	rm -rf lib/*
	touch lib/empty.txt

lib/fin:
	git clone git://github.com/marcuswestin/fin.git lib/fin
	cd lib/fin; make

lib/node-optimist:
	curl -L https://github.com/substack/node-optimist/zipball/56b2b1de8d11f8a2b91979d8ae2d6db02d8fe64d > /tmp/node-optimist.zip
	unzip /tmp/node-optimist.zip -d lib/
	mv lib/substack-node-optimist-56b2b1d lib/node-optimist
	rm /tmp/node-optimist.zip