var tokenizer = require('./tokenizer'),
	parser = require('./parser'),
	sourceCode = require('fs').readFileSync('./example_code.fun').toString()

require('./underscore')

var keywords = ['let','for','in','if','else','template','handler'],
	tokens = tokenizer.tokenize(sourceCode, keywords, '=<>', '=')
console.log('\nTokens:')
console.log(_.map(tokens, function(token){ return token.type+' '+token.value }))

var ast = parser.parse(tokens)
console.log('\nAST:')
console.log(JSON.stringify(ast))

// TODO import compiler and compile the ast to js
