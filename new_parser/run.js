var tokenizer = require('./tokens'),
	parser = require('./parser'),
	sourceCode = require('fs').readFileSync('./example_code.fun').toString()

require('./underscore')

var tokens = tokenizer.tokenize(sourceCode, ['let','for','if','in'], '=<>', '=')
console.log('\nTokens:')
console.log(_.map(tokens, function(token){ return token.type+' '+token.value }))

var ast = parser.parse(tokens)
console.log('\nAST:')
console.log(JSON.stringify(ast))

// TODO import compiler and compile the ast to js
