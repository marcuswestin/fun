BUILD_CMD = node api/build.js
# Commands
##########
clients: builds/fin-client.js builds/fin-models-client.js

# Dependencies
##############
builds/fin-client.js: api/*
	$(BUILD_CMD) client
builds/fin-models-client.js: api/*
	$(BUILD_CMD) models

# Utilities
###########
clean:
	rm -f builds/fin-*client.js

install-node:
	git clone git://github.com/ry/node.git /tmp/fin-node
	cd /tmp/fin-node; git checkout v0.4.2; ./configure; make; sudo make install
	rm -rf /tmp/fin-node

install-redis:
	git clone git://github.com/antirez/redis.git /tmp/fin-redis
	cd /tmp/fin-redis; git checkout v2.0.2-stable; make; sudo cp redis-server /usr/local/bin; sudo cp redis-cli /usr/local/bin;
	rm -rf /tmp/fin-redis
