var std = require('std'),
	util = require('./util'),
	curry = require('std/curry'),
	q = util.q,
	log = util.log,
	halt = util.halt

var L_PAREN = '(', R_PAREN = ')',
	L_CURLY = '{', R_CURLY = '}',
	L_ARRAY = '[', R_ARRAY = ']'
	
var gToken, gIndex, gTokens, gState

var ParseError = function(file, msg) {
	var token = peek()
	this.name = 'ParseError'
	this.message = ['on line', token.line + ',', 'column', token.column, 'of', '"'+file+'":', msg].join(' ')
}
ParseError.prototype = Error.protoype

exports.parse = function(tokens) {
	gTokens = tokens
	gIndex = -1
	gToken = null
	
	var ast = []
	
	var setupAST
	while (setupAST = parseSetupStatement()) { ast.push(setupAST) }
	
	while (peek()) { ast.push(parseEmitStatement()) }
	
	return util.cleanup(ast)
}

/************************************************************
 * Setup statements - comes before any of the emitting code *
 ************************************************************/
function parseSetupStatement() {
	if (peek('keyword', 'import')) { return _parseImportStatement() }
	if (peek('keyword', 'var')) { return parseVariableDeclaration() }
	// if (peek('keyword', 'let')) { return parseAliasDeclaration() }
}

var _parseImportStatement = astGenerator(function() {
	advance('keyword', 'import')
	var path = advance(['string','name'])
	if (path.type == 'string') {
		return { type: 'IMPORT_FILE', path: path.value }
	} else {
		return { type: 'IMPORT_MODULE', name: path.value }
	}
})

/****************************************************
 * Control flow statements and emitting expressions *
 ****************************************************/
var parseEmitStatement = function() {
	if (peek('symbol', '<')) { return parseXML() }
	if (peek('keyword')) {
		switch(peek().value) {
			// case 'let':      return parseAliasDeclaration()
			case 'for':      return parseForLoopStatement(parseEmitStatement)
			case 'if':       return parseIfStatement(parseEmitStatement)
			case 'switch':   return parseSwitchStatement(parseEmitStatement)
			case 'debugger': return parseDebuggerLiteral()
			default:         halt(peek(), 'Unexpected keyword "'+peek().value+'" while trying to parse an emit statement')
		}
	}
	return parseExpression()
}

/****************
 * Declarations *
 ****************/
var parseAliasDeclaration = astGenerator(function() {
	advance('keyword', 'let')
	var name = advance('name').value
	advance('symbol', '=')
	var value = parseExpression()
	return { type:'ALIAS_DECLARATION', name:name, value:value }
})

var parseVariableDeclaration = astGenerator(function() {
	advance('keyword', 'var')
	var name = advance('name').value
	if (peek('symbol', '=')) {
		advance('symbol', '=')
		var initialValue = parseExpression()
	}
	return { type:'VARIABLE', name:name, initialValue:initialValue }
})

/***************************************************
 * Expressions (literals, references, invocations) *
 ***************************************************/
var _expressionOperatorSymbols = ['+','-','*','/','%'], _expressionOperatorKeywords = []
var parseExpression = function() {
	return _doParseExpression(_expressionOperatorSymbols, _expressionOperatorKeywords, 0)
}

var _conditionOperatorSymbols = ['<','>','<=','>=','=='], _conditionOperatorKeywords = ['and','or']
var parseConditionExpression = function() {
	return _doParseExpression(_conditionOperatorSymbols, _conditionOperatorSymbols, 0)
}

var _prefixOperators = '-!~'.split('')
var _prefixBinding = 70

var _operatorBinding = {
	'and': 20, 'or': 20,
	'<':   30, '>':  30, '<=': 30, '>=': 30, '==': 30,
	'+':   40, '-':  40,
	'*':   50, '/':  50, '%':  50 }

var _doParseExpression = astGenerator(function(operatorSymbols, operatorKeywords, leftOperatorBinding) {
	if (!leftOperatorBinding) { leftOperatorBinding = 0 }

	var parseMore = std.curry(_doParseExpression, operatorSymbols, operatorKeywords),
		peekOperator = std.curry(_peekOperator, operatorSymbols, operatorKeywords)

	if (peek('symbol', _prefixOperators)) {
		var prefix = advance('symbol').value,
			value = parseMore(leftOperatorBinding)
		return { type:'COMPOSITE', prefix:prefix, left:value }
	}
	
	if (peek('symbol', L_PAREN)) {
		advance('symbol', L_PAREN)
		var expression = parseMore(0)
		advance('symbol', R_PAREN)
		return expression
	}

	var expression = _parseRawValue()

	while (true) {
		var rightOperator = peekOperator(),
			rightOperatorBinding = _operatorBinding[rightOperator]

		if (!rightOperator || leftOperatorBinding > rightOperatorBinding) { return expression }

		advance() // the operator
		expression = { type:'COMPOSITE', operator:rightOperator, left:expression, right:parseMore(rightOperatorBinding) }
	}
})

var _peekOperator = function(operatorSymbols, operatorKeywords) {
	if (peek('symbol', operatorSymbols)) { return peek().value }
	if (peek('keyword', operatorKeywords)) { return peek().value }
	return ''
}

var _parseRawValue = function() {
	switch (peek().type) {
		case 'string':
		case 'number': return _parseValueLiteral()
		case 'name':   return _parseReferenceOrInvocation()
		case 'symbol':
			switch(peek().value) {
				case L_ARRAY: return parseListLiteral()
				case L_CURLY: return parseObjectLiteral()
				default:      halt(peek(), 'Unexpected symbol "'+peek().value+'" while looking for a value')
			}
		case 'keyword':
			switch(peek().value) {
				case 'template': return parseTemplateLiteral()
				case 'handler':  return parseHandlerLiteral()
				case 'function': return parseFunctionLiteral()
				case 'null':     return parseNullLiteral()
				case 'true':     return parseTrueLiteral()
				case 'false':    return parseFalseLiteral()
				default:         halt(peek(), 'Unexpected keyword "'+peek().value+'" while looking for a value')
			}
		default:       halt(peek(), 'Unexpected token type "'+peek().type+'" while looking for a value')
	}
}

var parseNullLiteral = astGenerator(function() {
	advance('keyword', 'null')
	return { type:'VALUE_LITERAL', value:null }
})

var parseTrueLiteral = astGenerator(function() {
	advance('keyword', 'true')
	return { type:'VALUE_LITERAL', value:true }
})

var parseFalseLiteral = astGenerator(function() {
	advance('keyword', 'false')
	return { type:'VALUE_LITERAL', value:false }
})

var _parseValueLiteral = astGenerator(function() {
	advance(['string','number'])
	return { type:'VALUE_LITERAL', value:gToken.value }
})

var _parseReferenceOrInvocation = astGenerator(function() {
	var reference = parseReference()
	if (!peek('symbol', L_PAREN)) { return reference }
	advance('symbol', L_PAREN)
	var args = parseList(parseExpression, R_PAREN)
	advance('symbol', R_PAREN, 'end of invocation')
	return { type:'INVOCATION', invocable:reference, arguments:args }
})

/************************************
 * JSON - list and object listerals *
 ************************************/
var parseListLiteral = astGenerator(function() {
	advance('symbol', L_ARRAY)
	var content = parseList(parseExpression, R_ARRAY)
	advance('symbol', R_ARRAY, 'right bracket at the end of the JSON array')
	return { type:'LIST_LITERAL', content:content }
})

var parseObjectLiteral = astGenerator(function() {
	advance('symbol', L_CURLY)
	var content = []
	while (true) {
		if (peek('symbol', R_CURLY)) { break }
		var key = advance(['name','string']).value
		advance('symbol', ':')
		var value = parseExpression()
		content.push(createAST({ name:key, value:value }))
		if (!peek('symbol', ',')) { break }
		advance('symbol',',')
	}
	advance('symbol', R_CURLY, 'right curly at the end of the JSON object')
	return { type:'OBJECT_LITERAL', content:content }
})

/****************
 * XML literals *
 ****************/
var parseXML= astGenerator(function() {
	advance('symbol', '<', 'XML tag opening')
	advance('name', null, 'XML tag name')
	var tagName = gToken.value
	
	if (gToken.value == 'script') {
		return _parseScript()
	}
	
	var attributes = _parseXMLAttributes()
	
	advance('symbol', ['/>', '>'], 'end of the XML tag')
	if (gToken.value == '/>') {
		return { type:'XML', tagName:tagName, attributes:attributes, block:[] }
	} else {
		var statements = []
		while(true) {
			if (peek('symbol', '</')) { break }
			statements.push(parseEmitStatement())
		}
		advance('symbol', '</')
		advance('name', tagName, 'matching XML tags')
		// allow for attributes on closing tag, e.g. <button>"Click"</button onClick=handler(){ ... }>
		attributes = attributes.concat(_parseXMLAttributes())
		advance('symbol', '>')
		
		return { type:'XML', tagName:tagName, attributes:attributes, block:statements }
	}
})
var _parseXMLAttributes = function() {
	var XMLAttributes = []
	while (!peek('symbol', ['/>','>'])) {
		XMLAttributes.push(_parseXMLAttribute())
	}
	return XMLAttributes
}
var _parseXMLAttribute = astGenerator(function() {
	var name = advance('name').value.toLowerCase()
	advance('symbol', '=')
	var value =
		name == 'style' ? parseObjectLiteral() :
		parseExpression()
	return { name:name, value:value }
})


var _parseScript = astGenerator(function() {
	var attributes = _parseXMLAttributes(),
		js = []
	advance('symbol', '>', 'end of the script tag')
	while (!(peek('symbol', '</', 1) && peek('name', 'script', 2) && peek('symbol', '>', 3))) {
		advance()
		if (gToken.hadNewline) { js.push('\n') }
		if (gToken.hadSpace) { js.push(' ') }
		
		if (gToken.type == 'string') {
			js.push(gToken.annotations.single ? "'"+gToken.value+"'" : '"'+gToken.value+'"')
		} else {
			js.push(gToken.value)
		}
	}
	advance('symbol', '</')
	advance('name', 'script')
	advance('symbol', '>')
	return { type:'INLINE_SCRIPT', inlineJavascript:js.join('') }
})

/***********************************************
 * Callables - Templates, Handlers & Functions *
 ***********************************************/
var parseTemplateLiteral = astGenerator(function() {
	var callable = _parseCallable(parseEmitStatement, 'template')
	return { type:'TEMPLATE', signature:callable[0], block:callable[1] }
})

var parseHandlerLiteral = astGenerator(function() {
	if (peek('name')) { return parseReference() }
	var callable = _parseCallable(parseHandlerStatement, 'handler')
	return { type:'HANDLER', signature:callable[0], block:callable[1] }
})

var parseFunctionLiteral = astGenerator(function() {
	var callable = _parseCallable(parseFunctionStatement, 'function')
	return { type:'FUNCTION', signature:callable[0], block:callable[1] }
})

var _parseCallable = function(statementParseFn, keyword) {
	advance('keyword', keyword)
	advance('symbol', L_PAREN)
	var signature = parseList(function() { createAST({ type:'ARGUMENT', name:advance('name').value }) }, R_PAREN)
	advance('symbol', R_PAREN)
	var block = parseBlock(statementParseFn, keyword)
	return [signature, block]
}

/***********************
 * Function statements *
 ***********************/
var parseFunctionStatement = astGenerator(function() {
	if (peek('keyword', 'return')) {
		advance('keyword', 'return')
		var value = parseExpression()
		return { type:'RETURN', value:value }
	}
	halt(ast, 'Implement parseFunctionStatement')
})

/**********************
 * Handler statements *
 **********************/
var parseHandlerStatement = function() {
	var token = peek()
	switch(token.type) {
		case 'keyword':
			switch(token.value) {
				case 'if':        return parseIfStatement(parseHandlerStatement)
				case 'debugger':  return parseDebuggerLiteral()
				// case 'let':       return parseAliasDeclaration()
				default:          log(token); UNKNOWN_MUTATION_KEYWORD
			}
		default:
			return _parseMutationInvocation()
	}
}

var _parseMutationInvocation = astGenerator(function() {
	var reference = parseReference(),
		operator = reference.chain.pop()
	advance('symbol', L_PAREN)
	var args = parseList(parseExpression, R_PAREN)
	advance('symbol', R_PAREN, 'end of mutation operator')
	return {type:'MUTATION', operand:reference, operator:operator, arguments:args}
})


/*************
* For loops *
*************/
var parseForLoopStatement = astGenerator(function(statementParseFunction) {
	advance('keyword', 'for')
	advance('symbol', L_PAREN, 'beginning of for_loop\'s iterator statement')
	
	var iteratorName = advance('name', null, 'for_loop\'s iterator reference').value,
		iterator = createAST({ type:'ITERATOR', name:iteratorName })
	
	advance('keyword', 'in', 'for_loop\'s "in" keyword')
	var iterable = parseExpression()
	
	advance('symbol', R_PAREN, 'end of for_loop\'s iterator statement')
	var block = parseBlock(statementParseFunction, 'for_loop')
	
	return { type:'FOR_LOOP', iterable:iterable, iterator:iterator, block:block }
})

/****************
 * If statement *
 ****************/
var parseIfStatement = astGenerator(function(statementParseFunction) {
	advance('keyword', 'if')
	advance('symbol', L_PAREN, 'beginning of the if statement\'s conditional')
	var condition = parseConditionExpression()
	advance('symbol', R_PAREN, 'end of the if statement\'s conditional')
	
	var ifBlock = parseBlock(statementParseFunction, 'if statement')
	
	var elseBlock = null
	if (peek('keyword', 'else')) {
		advance('keyword', 'else')
		elseBlock = parseBlock(statementParseFunction, 'else statement')
	}
	
	return { type:'IF_STATEMENT', condition:condition, ifBlock:ifBlock, elseBlock:elseBlock }
})

/********************
 * Switch statement *
 ********************/
var parseSwitchStatement = astGenerator(function(statementParseFunction) {
	advance('keyword', 'switch')
	advance('symbol', L_PAREN, 'beginning of the switch statement\'s value')
	var controlValue = parseConditionExpression()
	advance('symbol', R_PAREN, 'end of the switch statement\'s value')
	var cases = parseBlock(curry(_parseCase, statementParseFunction), 'switch case statement')
	return { type:'SWITCH_STATEMENT', controlValue:controlValue, cases:cases }
})

var _parseCase = astGenerator(function(statementParseFunction) {
	var labelToken = advance('keyword', ['case', 'default']),
		isDefault = (labelToken.value == 'default'),
		values = [],
		statements = []
	
	if (labelToken.value == 'case') {
		while (true) {
			values.push(parseExpression())
			if (!peek('symbol', ',')) { break }
			advance('symbol', ',')
		}
	}
	advance('symbol', ':')
	while (true) {
		statements.push(statementParseFunction())
		if (peek('keyword', ['case', 'default']) || peek('symbol', R_CURLY)) { break }
	}
	return { type:'SWITCH_CASE', values:values, statements:statements, isDefault:isDefault }
})

/****************************
 * Shared parsing functions *
 ****************************/
// parses comma-seperated statements until <breakSymbol> is encounteded (e.g. R_PAREN or R_ARRAY)
var parseList = function(statementParseFunction, breakSymbol) {
	var list = []
	while (true) {
		if (peek('symbol', breakSymbol)) { break }
		list.push(statementParseFunction())
		if (!peek('symbol', ',')) { break }
		advance('symbol', ',')
	}
	return list
}

// parses a series of statements enclosed by curlies, e.g. { <statement> <statement> <statement> }
var parseBlock = function(statementParseFn, statementType) {
	advance('symbol', L_CURLY, 'beginning of the '+statementType+'\'s block')
	var block = []
	while(true) {
		if (peek('symbol', R_CURLY)) { break }
		block.push(statementParseFn())
	}
	advance('symbol', R_CURLY, 'end of the '+statementType+' statement\'s block')
	return block
}

var parseDebuggerLiteral = astGenerator(function() {
	advance('keyword', 'debugger')
	return { type:'DEBUGGER' }
})

var parseReference = astGenerator(function() {
	var name = advance('name').value
	var chain = []
	while(peek('symbol', '.')) {
		advance('symbol', '.')
		chain.push(advance('name').value)
	}
	return { type:'REFERENCE', name:name, chain:chain }
})

/****************
 * Token stream *
 ****************/
function advance(type, value, expressionType) {
	var nextToken = peek()
	if (!nextToken) { halt(null, 'Unexpected end of file') }
	function check(v1, v2) {
		if (v1 == v2) { return }
		halt(peek(), 'Expected a ' + q(type)
			+ (value ? ' of value ' + (value instanceof Array ? value.join(' or ') : value) : ',')
			+ (expressionType ? ' for the ' + expressionType : ''),
			+ ' but found a' + q(nextToken.type)
			+ ' of value' + q(nextToken.value))
	}
	if (type) { check(findInArray(type, nextToken.type), nextToken.type) }
	if (value) { check(findInArray(value, nextToken.value), nextToken.value) }
	gToken = gTokens[++gIndex]
	return gToken
}

var peek = function(type, value, steps) {
	var token = gTokens[gIndex + (steps || 1)]
	if (!token) { return false }
	if (type && findInArray(type, token.type) != token.type) { return false }
	if (value && findInArray(value, token.value) != token.value) { return false }
	return token
}

// Find an item in an array and return it
//  if target is in array, return target
//  if target is not in array, return array
//  if array is not an array, return array
function findInArray(array, target) {
	if (!(array instanceof Array)) { return array }
	for (var i=0, item; item = array[i]; i++) {
		if (item == target) { return item }
	}
	return array
}

/*********************
 * Utility functions *
 *********************/
// Upgrades a function that creates AST to return properly annotated ASTs
function astGenerator(generatorFn) {
	return function() {
		var startToken = peek(),
			ast = generatorFn.apply(this, arguments),
			endToken = peek()
		return createAST(ast, startToken, endToken)
	}
}

// Creates a proper AST object, annotated with info about where
//  in the source file it appeared (based on startToken and endToken)
function createAST(astObj, startToken, endToken) {
	if (!startToken) { startToken = gToken }
	if (!endToken) { endToken = gToken }
	if (std.isArray(astObj)) { return astObj }
	var ast = Object.create({
		info: {
			inputFile: startToken.inputFile,
			inputString: startToken.inputString,
			line: startToken.line,
			column: startToken.column,
			span: (startToken.line == endToken.line
				? endToken.column - startToken.column + endToken.span
				: startToken.span)
		}
	})
	for (var key in astObj) {
		if (!astObj.hasOwnProperty(key)) { continue }
		ast[key] = astObj[key]
	}
	return ast
}

