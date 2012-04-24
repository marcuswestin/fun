.PHONY: test
test:
	./node_modules/.bin/nodeunit test/tests

.PHONY: setup
setup:
	git submodule init
	git submodule sync
	git submodule update
	ln -snf .. node_modules/fun
	cd node_modules/dom; npm install .
	cd node_modules/require; npm install .
	make test
