var util = require('./util'),
	sourceCode = require('fs').readFileSync('./example_code_2.fun').toString()

var keywords = ['let','for','in','if','else','template','handler']
var tokens = require('./tokenizer').tokenize(sourceCode, keywords, '=<>', '=')
console.log('\nTokens:')
console.log(util.map(tokens, function(token){ return token.type+' '+token.value }))

var ast = require('./parser').parse(tokens)
console.log('\nAST:')
console.log(JSON.stringify(ast))

var output = require('./compiler').compile(ast)
console.log('\nOutput:')
console.log(util.indent(output))
