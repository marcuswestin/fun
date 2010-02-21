
.PHONY: init clean run compile narwhal ometa-js

init: narwhal ometa-js

clean:
	rm -f output.js
	rm -rf lib/*
	touch lib/empty.txt

compile-calc:
	cd lib/ometa-js; ../narwhal/bin/narwhal -e '\
		load("./ometa-rhino.js"); \
		var file = require("file");\
		var ometa_rules = file.read("../../calc/calc.ometa");\
		var fun_source = file.read("../../$(SOURCE)");\
		ometa(ometa_rules);\
		var tree = CalcParser.matchAll(fun_source, "expr");\
		var output = CalcCompiler.match(tree, "comp");\
		file.write("../../output.js", output + "\n");\
		'
	
# Dependencies
##############
narwhal:
	git clone git://github.com/tlrobinson/narwhal.git
	mv narwhal lib/

ometa-js:
	git clone git://github.com/marcuswestin/ometa-js.git
	mv ometa-js lib/


# Editable lib dependencies
###########################
edit-ometa-js:
	git clone git@github.com:marcuswestin/ometa-js.git
	mv ometa-js lib/