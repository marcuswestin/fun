var tokenizer = require('./tokens'),
	sourceCode = require('fs').readFileSync('./fun_code/handler.fun').toString()

console.log(tokenizer.tokenize(sourceCode, '', ''))
