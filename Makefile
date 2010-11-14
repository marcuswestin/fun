all: lib/fin

run: lib/pegjs lib/fin
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
