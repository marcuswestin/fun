var sys = require('sys'),
	util = require('./util'),
	tokenizer = require('./tokenizer'),
	parser = require('./parser'),
	compiler = require('./compiler')

var tokens = tokenizer.tokenize(process.cwd() + '/example_code_2.fun')
var ast = parser.parse(tokens)
var output = compiler.compile(ast)
sys.puts(util.indent(output))
