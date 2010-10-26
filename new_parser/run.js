var sys = require('sys'),
	util = require('./util'),
	tokenizer = require('./tokenizer'),
	parser = require('./parser'),
	compiler = require('./compiler'),
	inputFile = process.cwd() + '/example_code_2.fun'

function log() {
	var args = Array.prototype.slice.call(arguments, 0)
	log.output.push('console.log('+util.map(args, JSON.stringify).join(',')+')')
}
log.output = []

var didThrow = false
function intercept(errorName, fn) {
	if (didThrow) { return }
	try {
		fn()
	} catch(e) {
		didThrow = true
		if (e.name != errorName) { throw e }
		sys.puts(e.name + ' ' + e.message)
	}
}

var tokens
intercept("TokenizeError", function() {
	var keywords = ['let','for','in','if','else','template','handler']
	tokens = tokenizer.tokenize(inputFile, keywords, '=<>', '=')
	log('Tokens:', util.map(tokens, function(token){ return token.type+' '+token.value }))
})

var ast
intercept("ParseError", function() {
	ast = parser.parse(tokens, inputFile)
	log('AST:', ast)
})

intercept("CompileError", function() {
	var output = compiler.compile(ast, inputFile)
	sys.puts(log.output.join('\n'))
	sys.puts(util.indent(output))
})
