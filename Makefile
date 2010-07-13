#############
# Utilities #
#############
.PHONY: deps
deps: lib/pegjs

.PHONY: clean
clean:
	rm -f output.js
	rm -rf lib/*
	touch lib/empty.txt

################
# Dependencies #
################
lib/pegjs:
	git clone http://github.com/dmajda/pegjs.git lib/pegjs
	cd lib/pegjs; git checkout 1cdce638785003619548ed26f7d7afc3033d886c
