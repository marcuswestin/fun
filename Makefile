
.PHONY: deps clean run compile narwhal ometa-js

deps: ometa-js

clean:
	rm -f output.js
	rm -rf lib/*
	touch lib/empty.txt

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