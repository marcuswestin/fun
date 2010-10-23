var tokenizer = require('./tokens'),
	parser = require('./parser'),
	sourceCode = require('fs').readFileSync('./example_code.fun').toString()

require('./underscore')

var start = new Date().getTime(),
    tokens = tokenizer.tokenize(sourceCode, '', ''),
    ast = parser.parse(tokens),
    timeToRun = (new Date().getTime() - start) / 1000

console.log('\nTokens:')
console.log(_.map(tokens, function(token){ return token.type+' '+token.value }))

console.log('\nAST:')
console.log(JSON.stringify(ast))

console.log('Compilation took', (new Date().getTime() - start) / 1000, 'seconds')