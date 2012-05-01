.PHONY: test
test:
	node scripts/run-tests.js

test-debug:
	node --debug-brk scripts/run-tests.js

.PHONY: setup
setup:
	git submodule init
	git submodule sync
	git submodule update
	# if [ ! -f node_modules/fun ]; then ln -snf .. node_modules/fun; fi
	cd node_modules/dom; npm install .
	cd node_modules/require; npm install .
	npm install .
