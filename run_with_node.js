require('./lib/ometa-js/ometa-node');

function getCode(path) {
	return require('fs').readFileSync(path) + "\n"
}
var codeInput = process.argv[2]
function log(statement) {
	require('sys').puts(statement)
}

function parseOmetaCode(parser) {
	var parserCode = getCode('./parsers/' + parser + '.ometa')
	try {
		ometa(parserCode)
	} catch(e) {
		var errorMsg = "Error: " + e
		if (e.errorPos) {
			errorMsg += " at pos " + e.errorPos + " >>>" + parserCode.substr(e.errorPos, 30) 
		}
		log(errorMsg)
		throw e
	}
}

parseOmetaCode('xml')
parseOmetaCode('fun')

var code = getCode(codeInput)

var tree = FunParser.matchAll(code, "FunTop")

log("\nHere's your AST:\n")
log(tree)

// var translated = FunTranslator.matchAll(tree, "FunTop")
// sys.puts(translated)
// 
