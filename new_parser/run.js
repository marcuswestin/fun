var sys = require('sys'),
	util = require('./util'),
	sourceCode = require('fs').readFileSync('./example_code_2.fun').toString()

function log() {
	var args = Array.prototype.slice.call(arguments, 0)
	sys.puts('console.log('+util.map(args, JSON.stringify).join(',')+')')
}

var keywords = ['let','for','in','if','else','template','handler']
var tokens = require('./tokenizer').tokenize(sourceCode, keywords, '=<>', '=')

log('Tokens:', util.map(tokens, function(token){ return token.type+' '+token.value }))

var ast = require('./parser').parse(tokens)
log('AST:', ast)

var output = require('./compiler').compile(ast),
	indented = util.indent(output)
require('sys').puts(util.indent(output))
