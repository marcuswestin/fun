all: lib/fin lib/node-optimist

################
# Dependencies #
################
.PHONY: clean
clean:
	rm -rf lib/*
	touch lib/empty.txt

lib/fin:
	git clone git://github.com/marcuswestin/fin.git lib/fin
	cd lib/fin; git checkout 697332d2dd2b2c839d4c5c0bf5687c69ee97bab1; make

lib/node-optimist:
	curl -L https://github.com/substack/node-optimist/zipball/56b2b1de8d11f8a2b91979d8ae2d6db02d8fe64d > /tmp/node-optimist.zip
	unzip /tmp/node-optimist.zip -d lib/
	mv lib/substack-node-optimist-56b2b1d lib/node-optimist
	rm /tmp/node-optimist.zip
