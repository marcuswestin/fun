var map = require('./util').map,
	sourceCode = require('fs').readFileSync('./example_code.fun').toString()

var keywords = ['let','for','in','if','else','template','handler']
var tokens = require('./tokenizer').tokenize(sourceCode, keywords, '=<>', '=')
console.log('\nTokens:')
console.log(map(tokens, function(token){ return token.type+' '+token.value }))

var ast = require('./parser').parse(tokens)
console.log('\nAST:')
console.log(JSON.stringify(ast))

// TODO import compiler and compile the ast to js
