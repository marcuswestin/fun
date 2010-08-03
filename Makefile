all: workspace lib/pegjs lib/fin

################
# Dependencies #
################
.PHONY: clean
clean:
	rm -rf workspace
	rm -rf lib/*
	touch lib/empty.txt

workspace:
	git clone http://github.com/marcuswestin/pegjs-website.git lib/pegjs-website
	mv lib/pegjs-website/workspace workspace
	rm -rf lib/pegjs-website

lib/pegjs:
	git clone http://github.com/dmajda/pegjs.git lib/pegjs
	cd lib/pegjs; git checkout 1cdce638785003619548ed26f7d7afc3033d886c

lib/fin:
	git clone git://github.com/marcuswestin/fin.git lib/fin
	cd lib/fin; make
