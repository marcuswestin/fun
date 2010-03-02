require('./lib/ometa-js/ometa-node');
var fs = require('fs')
var sys = require('sys')

function parseOmetaCode(parser) {
	var parserCode = fs.readFileSync('./parsers/' + parser + '.ometa') + "\n"
	try {
		ometa(parserCode)
	} catch(e) {
		var errorMsg = "Error: " + e
		if (e.errorPos) {
			errorMsg += " at pos " + e.errorPos + " >>>" + parserCode.substr(e.errorPos, 30) 
		}
		sys.puts(errorMsg)
		throw e
	}
}

parseOmetaCode('xml')
parseOmetaCode('fun2')

var code = fs.readFileSync(process.argv[2])

var tree = FunParser.matchAll(code, "FunTop")
sys.puts(tree)

sys.puts("\nNow lets translate...\n")

var translated = FunTranslator.matchAll(tree, "FunTop")
sys.puts(translated)

