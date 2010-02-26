
.PHONY: require.js deps clean run compile narwhal ometa-js

deps: ometa-js require.js

clean:
	rm -f output.js
	rm -rf lib/*
	touch lib/empty.txt

# Dependencies
##############
ometa-js:
	git clone git://github.com/marcuswestin/ometa-js.git
	mv ometa-js lib/

require.js:
	git clone git://github.com/marcuswestin/require.js.git
	mv require.js/require.js lib/
	rm -rf require.js


# Editable lib dependencies
###########################
edit-ometa-js:
	git clone git@github.com:marcuswestin/ometa-js.git
	mv ometa-js lib/


# Utilities
###########
narwhal:
	git clone git://github.com/tlrobinson/narwhal.git
	mv narwhal lib/
