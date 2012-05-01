var util = require('./util'),
	curry = require('std/curry'),
	isArray = require('std/isArray'),
	q = util.q,
	halt = util.halt,
	assert = util.assert

var L_PAREN = '(', R_PAREN = ')',
	L_CURLY = '{', R_CURLY = '}',
	L_BRACKET = '[', R_BRACKET = ']'
	
var gToken, gIndex, gTokens, gState

exports.parse = function(tokens) {
	gTokens = tokens
	gIndex = -1
	gToken = null
	
	var ast = []
	
	var setupAST
	while (setupAST = parseImports()) { ast.push(setupAST) }
	
	while (peek()) { ast.push(parseTemplateBlock()) }
	
	return util.cleanup(ast)
}

/************************************************
 * Imports come before any of the emitting code *
 ************************************************/
function parseImports() {
	if (peek('keyword', 'import')) { return _parseImportStatement() }
}

var _parseImportStatement = astGenerator(function() {
	advance('keyword', 'import')
	if (peek('string')) {
		// back compat import "./foo/bar"
		var path = advance('string').value
		return { type: 'IMPORT_FILE', path: path.value }
	} else {
		if (peekNewline()) { halt(gToken, 'Expected an import path') }
		
		if (!peek('symbol', ['.', '/']) && !peek('name')) {
			halt(peek(), 'Expected an import path')
		}
		
		var first = advance(['symbol', 'name'])
		var path = first.value
		
		if (first.type == 'name' && peekNoWhitespace('symbol', '/')) {
			path += advance().value
		} else if (first.value == '.') {
			while(peekNoWhitespace('symbol', ['.','/'])) {
				path += advance().value
			}
		}
		
		assert(gToken, path[path.length-1] != '.', 'Bad import path')
		
		while(peekNoWhitespace('name')) {
			path += advance().value
			if (peekNoWhitespace('symbol', '/')) {
				path += advance().value
			}
		}
		
		return { type:'IMPORT', path:path }
	}
})

/*************
 * Templates *
 *************/
var parseTemplateLiteral = astGenerator(function() {
	var callable = parseSignatureAndBlock('template', parseTemplateBlock)
	return { type:'TEMPLATE', signature:callable[0], block:callable[1] }
})

var parseTemplateBlock = function() {
	var controlStatement = tryParseControlStatement(parseTemplateBlock)
	if (controlStatement) { return controlStatement }
	
	var inlineScript = tryParseInlineScript(parseTemplateBlock)
	if (inlineScript) { return inlineScript }
	
	if (peek('symbol', '<')) { return parseXML() }
	
	return parseExpression()
}

/*************
 * Functions *
 *************/
var parseFunctionLiteral = astGenerator(function() {
	var callable = parseSignatureAndBlock('function', _parseFunctionBlock)
	return { type:'FUNCTION', signature:callable[0], block:callable[1] }
})

var _parseFunctionBlock = function() {
	var controlStatement = tryParseControlStatement(_parseFunctionBlock)
	if (controlStatement) { return controlStatement }
	
	var inlineScript = tryParseInlineScript(_parseFunctionBlock)
	if (inlineScript) { return inlineScript }
	
	if (peek('keyword', 'return')) { return _parseReturnStatement() }
	
	halt(peek(), 'Expected either a return statement or a control statement in this function block.')
}

var _parseReturnStatement = astGenerator(function() {
	advance('keyword', 'return')
	var value = parseExpression()
	return { type:'RETURN', value:value }
})

/************
 * Handlers *
 ************/
var parseHandlerLiteral = astGenerator(function() {
	var callable = parseSignatureAndBlock('handler', _parseHandlerBlock)
	return { type:'HANDLER', signature:callable[0], block:callable[1] }
})

var _parseHandlerBlock = function() {
	var controlStatement = tryParseControlStatement(_parseHandlerBlock)
	if (controlStatement) { return controlStatement }

	var inlineScript = tryParseInlineScript(_parseHandlerBlock)
	if (inlineScript) { return inlineScript }
	
	return _parseMutationOrInvocation()
}

var _parseMutationOrInvocation = astGenerator(function() {
	var expression = parseExpression()
	
	if (!(peek('name') && peek('symbol', ':', 2))) {
		return expression
	}
	
	var operator = advance('name').value
	advance('symbol', ':')
	
	var args = [parseExpression()]
	while (peek('symbol', ',')) {
		advance('symbol', ',')
		args.push(parseExpression())
	}
	
	return { type:'MUTATION', operand:expression, operator:operator, arguments:args }
})

/***************************
 * Control flow statements *
 ***************************/
var tryParseControlStatement = function(blockParseFunction) {
	if (peek('name') && peek('symbol', '=', 2)) {
		return _parseDeclaration()
	}
	switch(peek().value) {
		case 'for':      return _parseForLoopStatement(blockParseFunction)
		case 'if':       return _parseIfStatement(blockParseFunction)
		case 'switch':   return _parseSwitchStatement(blockParseFunction)
		case 'debugger': return _parseDebuggerLiteral()
	}
}

var _parseForLoopStatement = astGenerator(function(statementParseFunction) {
	advance('keyword', 'for')
	
	var iteratorName, iterator
	_allowParens(function() {
		iteratorName = advance('name', null, 'for_loop\'s iterator reference').value
		iterator = createAST({ type:'REFERENCE', name:iteratorName })
	})
	
	advance('keyword', 'in', 'for_loop\'s "in" keyword')
	var iterable = parseExpression()
	
	var block = parseBlock(statementParseFunction, 'for_loop')
	
	return { type:'FOR_LOOP', iterable:iterable, iterator:iterator, block:block }
})

var _allowParens = function(fn) {
	if (peek('symbol', L_PAREN)) {
		advance()
		_allowParens(fn)
		advance('symbol', R_PAREN)
	} else {
		fn()
	}
}

var _parseDeclaration = astGenerator(function() {
	var name = advance('name').value
	assert(gToken, 'a' <= name[0] && name[0] <= 'z', 'Variable names must start with a lowercase letter')
	advance('symbol', '=')
	var initialValue = parseExpression(parseExpression)
	return { type:'DECLARATION', name:name, initialValue:initialValue }
})

var _parseIfStatement = astGenerator(function(statementParseFunction) {
	advance('keyword', 'if')
	var condition = parseExpression()
	
	var ifBlock = parseBlock(statementParseFunction, 'if statement')
	
	var elseBlock = null
	if (peek('keyword', 'else')) {
		advance('keyword', 'else')
		if (peek('keyword', 'if')) {
			elseBlock = [_parseIfStatement(statementParseFunction)]
		} else {
			elseBlock = parseBlock(statementParseFunction, 'else statement')
		}
	}
	
	return { type:'IF_STATEMENT', condition:condition, ifBlock:ifBlock, elseBlock:elseBlock }
})

var _parseSwitchStatement = astGenerator(function(statementParseFunction) {
	advance('keyword', 'switch')
	var controlValue = parseExpression()
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
	while (!peek('keyword', ['case', 'default']) && !peek('symbol', R_CURLY)) {
		statements.push(statementParseFunction())
	}
	return { type:'SWITCH_CASE', values:values, statements:statements, isDefault:isDefault }
})

var _parseDebuggerLiteral = astGenerator(function() {
	advance('keyword', 'debugger')
	return { type:'DEBUGGER' }
})

/**********************
 * Inline script tags *
 **********************/
var tryParseInlineScript = function() {
	if (peek('symbol', '<') && peek('name', 'script', 2)) { return _parseInlineScript() }
}

var _parseInlineScript = astGenerator(function() {
	advance('symbol', '<', 'Script tag open')
	advance('name', 'script', 'Script tag name')
	
	var attributes = _parseXMLAttributes(false),
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
	return { type:'SCRIPT_TAG', tagName:'script', attributes:attributes, inlineJavascript:js.join('') }
})	

/******************************************************************
 * Expressions (literals, references, invocations, operators ...) *
 ******************************************************************/
var prefixOperators = ['-', '!'],
	binaryOperators = ['+','-','*','/','%','?'],
	conditionalOperators = ['<', '>', '<=', '>=', '==', '=', '!=', '!'],
	conditionalJoiners = ['and', 'or']

var bindingPowers = {
	'?':10,
	'and': 20, 'or': 20,
	'<':   30, '>':  30, '<=': 30, '>=': 30, '==': 30, '=': 30, '!=': 30, '!': 30,
	'+':   40, '-':  40,
	'*':   50, '/':  50, '%':  50
}

var parseExpression = function() {
	return _parseMore(0)
}

var _parseMore = astGenerator(function(leftOperatorBinding) {
	if (leftOperatorBinding == null) {
		throw new Error("leftOperatorBinding should be defined: ")
	}
	
	if (peek('symbol', prefixOperators)) {
		// Prefix operators simply apply to the next expression
		// and does not modify the left operator binding
		var prefixOperator = advance('symbol').value
		return { type:'UNARY_OP', operator:prefixOperator, value:_parseMore(leftOperatorBinding) }
	}
	
	var expression
	if (peek('symbol', L_PAREN)) {
		// There are no value literals with parentheseseses.
		// If wee see a paren, group the inside expression.
		advance('symbol', L_PAREN)
		expression = _parseMore(0)
		advance('symbol', R_PAREN)
		expression = _addTightOperators(expression)
	} else {
		expression = _addTightOperators(_parseAtomicExpressions())
	}
	
	var rightOperatorToken, impliedEqualityOp
	while (true) {
		// All conditional comparisons require the is keyword (e.g. `foo is < 10`)
		// to avoid ambiguity between the conditional operator < and the beginning of XML
		if (peek('keyword', 'is')) {
			rightOperatorToken = peek('symbol', conditionalOperators, 2)
			// It is OK to skip the comparative operator, and simple say `foo is "bar"` in place of `foo is = "bar"`
			if (!rightOperatorToken) {
				rightOperatorToken = { value:'=' }
				impliedEqualityOp = true
			}
		} else {
			rightOperatorToken = peek('symbol', binaryOperators)
		}
		
		var rightOperator = rightOperatorToken && rightOperatorToken.value,
			rightOperatorBinding = (bindingPowers[rightOperator] || 0)
		
		if (!rightOperator || leftOperatorBinding > rightOperatorBinding) {
			return expression
		}
		
		if (peek('symbol', '?')) {
			advance()
			var ifValue = _parseMore(0)
			advance('symbol',':')
			return { type:'TERNARY_OP', condition:expression, ifValue:ifValue, elseValue:_parseMore(0) }
		}
		
		if (peek('keyword', 'is')) {
			advance() // the "is" keyword
		}
		if (!impliedEqualityOp) {
			advance() // the operator
		}
		
		expression = { type:'BINARY_OP', left:expression, operator:rightOperator, right:_parseMore(rightOperatorBinding) }
	}
})

var _parseAtomicExpressions = function() {
	// references, literals
	switch (peek().type) {
		case 'string': return _parseTextLiteral()
		case 'number': return _parseNumberLiteral()
		case 'name':   return _parseReference()
		case 'symbol':
			switch(peek().value) {
				case L_BRACKET: return _parseListLiteral()
				case L_CURLY: return _parseObjectLiteral()
				default:      halt(peek(), 'Unexpected symbol "'+peek().value+'" while looking for a value')
			}
		case 'keyword':
			switch(peek().value) {
				case 'null':     return _parseNullLiteral()
				case 'true':     return _parseTrueLiteral()
				case 'false':    return _parseFalseLiteral()
				case 'template': return parseTemplateLiteral()
				case 'handler':  return parseHandlerLiteral()
				case 'function': return parseFunctionLiteral()
				default:         halt(peek(), 'Unexpected keyword "'+peek().value+'" while looking for a value')
			}
		default:       halt(peek(), 'Unexpected token type "'+peek().type+'" while looking for a value')
	}
}

var _parseReference = astGenerator(function() {
	var name = advance('name').value
	return { type:'REFERENCE', name:name }
})

var _parseNullLiteral = astGenerator(function() {
	advance('keyword', 'null')
	return { type:'NULL_LITERAL', value:null }
})

var _parseTrueLiteral = astGenerator(function() {
	advance('keyword', 'true')
	return { type:'LOGIC_LITERAL', value:true }
})

var _parseFalseLiteral = astGenerator(function() {
	advance('keyword', 'false')
	return { type:'LOGIC_LITERAL', value:false }
})

var _parseTextLiteral = astGenerator(function() {
	return { type:'TEXT_LITERAL', value:advance('string').value }
})

var _parseNumberLiteral = astGenerator(function() {
	return { type:'NUMBER_LITERAL', value:advance('number').value }
})


var tightOperators = ['.', L_BRACKET, L_PAREN]
var _addTightOperators = astGenerator(function(expression) {
	if (!peekNoWhitespace('symbol', tightOperators)) { return expression }
	switch (advance().value) {
		case '.':
			var key = { type:'TEXT_LITERAL', value:advance('name').value }
			return _addTightOperators({ type:'DEREFERENCE', key:key, value:expression })
		case L_BRACKET:
			var key = parseExpression(),
				value = _addTightOperators({ type:'DEREFERENCE', key:key, value:expression })
			advance('symbol', R_BRACKET)
			return value
		case L_PAREN:
			var args = parseList(R_PAREN, parseExpression)
			return _addTightOperators({ type:'INVOCATION', operand:expression, arguments:args })
		default:
			throw new Error("Bad tight operator")
	}
})

var _parseListLiteral = astGenerator(function() {
	advance('symbol', L_BRACKET)
	var content = parseList(R_BRACKET, parseExpression)
	return { type:'LIST_LITERAL', content:content }
})

var _parseObjectLiteral = astGenerator(function() {
	advance('symbol', L_CURLY)
	var content = parseList(R_CURLY, astGenerator(function() {
		var name = advance(['name','string']).value
		parseSemiOrEqual()
		var value = parseExpression()
		return { name:name, value:value }
	}))
	return { type:'DICTIONARY_LITERAL', content:content }
})

var parseSemiOrEqual = function() {
	if (peek('symbol', '=')) { advance('symbol', '=') }
	else { advance('symbol', ':') }
}

/****************
 * XML literals *
 ****************/
var parseXML= astGenerator(function() {
	advance('symbol', '<', 'XML tag opening')
	advance('name', null, 'XML tag name')
	var tagName = gToken.value
	
	var attributes = _parseXMLAttributes(true)
	
	advance('symbol', ['/>', '>'], 'end of the XML tag')
	if (gToken.value == '/>') {
		return { type:'XML', tagName:tagName, attributes:attributes, block:[] }
	} else {
		var statements = []
		while(true) {
			if (peek('symbol', '</')) { break }
			statements.push(parseTemplateBlock())
		}
		advance('symbol', '</')
		advance('name', tagName, 'matching XML tags')
		// allow for attributes on closing tag, e.g. <button>"Click"</button onClick=handler(){ ... }>
		attributes = attributes.concat(_parseXMLAttributes(true))
		advance('symbol', '>')
		
		return { type:'XML', tagName:tagName, attributes:attributes, block:statements }
	}
})
var _parseXMLAttributes = function(allowHashExpand) {
	var XMLAttributes = []
	while (!peek('symbol', ['/>','>'])) {
		XMLAttributes.push(_parseXMLAttribute(allowHashExpand))
		if (peek('symbol', ',')) { advance() } // Allow for <div foo="bar", cat="qwe"/>
	}
	return XMLAttributes
}
var _parseXMLAttribute = astGenerator(function(allowHashExpand) {
	if (peek('symbol', '#')) {
		if (!allowHashExpand) {
			halt(peek(), "Hash expanded attributes are not allowed in script tags - trust me, it would be messy")
		}
		advance()
		return { expand:parseExpression() }
	} else {
		var name = advance(['name', 'keyword']).value
		parseSemiOrEqual()
		return { name:name, value:parseExpression() }
	}
})


/****************************
 * Shared parsing functions *
 ****************************/
// parses comma-seperated statements until <breakSymbol> is encounteded (e.g. R_PAREN or R_BRACKET)
var parseList = function(breakSymbol, statementParseFunction) {
	var list = []
	while (true) {
		if (peek('symbol', breakSymbol)) { break }
		list.push(statementParseFunction())
		if (peek('symbol', ',')) { advance() } // Allow for both "foo", "bar", "key" and "foo" "bar" "key"
	}
	advance('symbol', breakSymbol)
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

function parseSignatureAndBlock(keyword, blockParseFn) {
	advance('keyword', keyword)
	advance('symbol', L_PAREN)
	var signature = parseList(R_PAREN, function() {
		return createAST({ type:'ARGUMENT', name:advance('name').value })
	})
	var block = parseBlock(blockParseFn, keyword)
	return [signature, block]
}

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

var peekNoWhitespace = function(type, value, steps) {
	if (peekWhitespace(steps)) { return null }
	return peek(type, value)
}

var peekWhitespace = function(steps) {
	var token = gTokens[gIndex + 1]
	return token && token.hadSpace
}

var peekNewline = function(steps) {
	return gTokens[gIndex + 1].hadNewline
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
	if (isArray(astObj)) { return astObj }
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
