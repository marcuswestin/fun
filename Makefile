.PHONY: test
test:
	./node_modules/.bin/nodeunit test/tests

.PHONY: submodules
submodules:
	git submodule init
	git submodule sync
	git submodule update
	cd node_modules/dom; sudo npm install .
	cd node_modules/require; sudo npm install .
