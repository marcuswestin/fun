var sys = require('sys'),
	util = require('./util'),
	tokenizer = require('./tokenizer'),
	parser = require('./parser'),
	resolver = require('./resolver'),
	compiler = require('./compiler')

var tokens = tokenizer.tokenize(process.cwd() + '/example.fun')
var ast = parser.parse(tokens)
var resolved = resolver.resolve(ast)
var output = compiler.compile(resolved.ast, resolved.modules, resolved.declarations)
sys.puts(util.indent(output))
