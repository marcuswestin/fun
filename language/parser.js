var sys = require('sys'),
	util = require('./util'),
	bind = util.bind,
	q = util.q

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

exports.parse = util.intercept('ParseError', function(tokens) {
	gTokens = tokens
	gIndex = -1
	gToken = null
	
	var ast = []
	
	do {
		var setupAST = parseSetupStatement()
		if (setupAST) { ast.push(setupAST) }
	} while (setupAST)
	
	while (gIndex + 1 != gTokens.length) {
		ast.push(parseStatement())
	}
	return cleanup(ast)
})

function cleanup(ast) {
	if (ast instanceof Array && ast.length == 1) { return cleanup(ast[0]) }
	return ast
}

/************************************************************
 * Setup statements - comes before any of the imitting code *
 ************************************************************/
function parseSetupStatement() {
	if (peek('name', 'class'))  { return _parseClassDeclaration() }
	if (peek('name', 'import')) { return _parseImportStatement() }
}

var _parseClassDeclaration = astGenerator(function() {
	advance('name', 'class')
	var name = advance('name').value
	advance('symbol', L_CURLY)
	var properties = parseList(function() {
		var propertyID = advance('number').value
		var propertyName = advance('name').value
		advance('symbol', ':')
		var type = advance('name').value
		if (peek('name', 'of')) {
			advance('name', 'of')
			var collectionOf = advance('name').value
		}
		return { id:propertyID, name:propertyName, type:type, of:collectionOf }
	}, R_CURLY)
	advance('symbol', R_CURLY)
	return { type:'CLASS_DECLARATION', name:name, properties:properties }
})

var _parseImportStatement = astGenerator(function() {
	advance('name', 'import')
	advance(['string','name'])
	if (gToken.type == 'string') {
		return { type: 'IMPORT_FILE', path: gToken.value }
	} else {
		return { type: 'IMPORT_MODULE', name: gToken.value }
	}
})

/***********************************************************
 * Declaration/Control statements and emitting expressions *
 ***********************************************************/
var parseStatement = function() {
	var token = peek()
	switch (token.type) {
		case 'keyword':
			switch (token.value) {
				case 'let':      return parseDeclarationStatement()
				case 'for':      return parseForLoopStatement()
				case 'if':       return parseIfStatement()
				case 'switch':   return parseSwitchStatement()
				case 'debugger': return parseDebuggerStatement()
				default:         halt('Unexpected keyword "'+token.value+'"')
			}
		case 'string':
		case 'number':
		case 'name':             return parseExpression()
		case 'symbol':
			switch(token.value) {
				case L_PAREN:
				case L_ARRAY:
				case L_CURLY:
				case '-':        return parseExpression()
				case '<':        return parseXML()
				default:         halt('Unexpected symbol "'+token.value+'"')
			}
		default:                 halt('Unexpected token type "'+token.type+'"')
	}
}

/****************
 * Declarations *
 ****************/
var parseDeclarationStatement = astGenerator(function() {
	advance('keyword', 'let')
	var declarations = []
	
	while (true) {
		var name = advance('name').value
		advance('symbol', '=')
		var value =
			peek('keyword', 'template') ? parseTemplateLiteral() :
			peek('keyword', 'handler') ?  parseHandlerLiteral() :
			                              parseExpression()
		declarations.push({ type:'DECLARATION', name:name, value:value })
		
		if (!peek('symbol', ',')) { break }
		advance('symbol', ',')
	}
	
	return declarations
})

/************************************************
 * Expressions (literals, aliases, invocations) *
 ************************************************/
var _expressionOperatorSymbols = ['+','-','*','/','%'], _expressionOperatorKeywords = []
var parseExpression = function() {
	return _doParseExpression(_expressionOperatorSymbols, _expressionOperatorKeywords)
}

var _conditionOperatorSymbols = ['<','>','<=','>=','=='], _conditionOperatorKeywords = ['and','or']
var parseConditionExpression = function() {
	return _doParseExpression(_conditionOperatorSymbols, _conditionOperatorSymbols)
}

var _doParseExpression = _groupWithParens(function(operatorSymbols, operatorKeywords) {
	// HACK! Come up with better syntax than __javascriptBridge(<jsType:string>, <jsName:string>)
	if (peek('name', JAVASCRIPT_BRIDGE_TOKEN)) { return _parseJavascriptBridge() }
	if (peek('symbol', '@')) { return _parseItemLiteral() }

	var lValue = _parseRawValueExpression(),
		operator = '', rValue

	if (peek('symbol', operatorSymbols)) { operator = advance('symbol').value }
	else if (peek('keyword', operatorKeywords)) { operator = advance('keyword').value }

	if (!operator) { return lValue }

	rValue = _doParseExpression(operatorSymbols, operatorKeywords)
	return { type:'COMPOSITE', left:lValue, operator:operator, right:rValue }
})

function _groupWithParens(expressionFn) {
	return function() {
		if (!peek('symbol', L_PAREN)) { return expressionFn.apply(this, arguments) }
		advance('symbol', L_PAREN)
		var value = _groupWithParens(expressionFn.apply(this, arguments))
		advance('symbol', R_PAREN)
		return value
	}
}

var _parseCompositeExpression = astGenerator(function(lValue) {
	var operator = advance('symbol').value,
		rValue = parseExpression()
	
	return { type:'COMPOSITE', operator:operator, left:lValue, right:rValue }
})

// @-1.currentUser.name
var _parseItemLiteral = astGenerator(function() {
	advance('symbol', '@')
	var idAST = _parseRawValueExpression()
	assert(idAST.type == 'STATIC' && typeof idAST.value == 'number', 'Item literals need numeric IDs, e.g. @1')
	if (peek('symbol', '.')) {
		advance('symbol', '.')
		var namespace = parseNamespace()
		return { type:'ITEM_PROPERTY', id:idAST.value, namespace:namespace }
	}
	return { type:'ITEM', id:idAST.value }
})

var _prefixOperators = '-!~'.split('')
var _parseRawValueExpression = function() {
	var prefix = (peek('symbol', _prefixOperators) ? advance('symbol').value : null)
	expression = _doParseRawValueExpression()
	if (prefix) { expression.prefix = prefix }
	return expression
}

var _doParseRawValueExpression = function() {
	var token = peek()
	switch(token.type) {
		case 'number':
		case 'string': return _parseStaticValue()
		case 'name':   return _parseAliasOrInvocation()
		case 'symbol':
			switch (token.value) {
				case L_CURLY: return parseObjectLiteral()
				case L_ARRAY: return parseListLiteral()
				default:      halt('Unknown symbol "'+token.value+'"')
			}
		default:       halt('Unknown value token type "'+token.type+'"')
	}
}

var _parseStaticValue = astGenerator(function() {
	advance(['string','number'])
	return { type:'STATIC', valueType:gToken.type, value:gToken.value }
})

var _parseAliasOrInvocation = astGenerator(function() {
	var alias = parseAlias()
	if (!peek('symbol', L_PAREN)) { return alias }
	advance('symbol', L_PAREN)
	var args = parseList(parseExpression, R_PAREN)
	advance('symbol', R_PAREN, 'end of invocation')
	return { type:'INVOCATION', alias:alias, args:args }
})

// HACK expects __javascriptBridge("function", "FacebookModule.connect") - see e.g. Modules/Facebook/Facebook.fun
var JAVASCRIPT_BRIDGE_TOKEN = '__javascriptBridge'
var _parseJavascriptBridge = astGenerator(function() {
	advance('name', JAVASCRIPT_BRIDGE_TOKEN)
	advance('symbol', L_PAREN)
	var jsType = advance('string').value
	advance('symbol', ',')
	var jsName = advance('string').value
	advance('symbol', R_PAREN, 'end of javascript bridge')
	return { type:'JAVASCRIPT_BRIDGE', jsType:jsType, jsName:jsName }
})

var _compositeConditionalSymbols = util.listToObject(['<','>','<=','>=','==','&&','||',])

/************************************
 * JSON - list and object listerals *
 ************************************/
var parseListLiteral = astGenerator(function() {
	advance('symbol', L_ARRAY)
	var content = parseList(parseExpression, R_ARRAY)
	advance('symbol', R_ARRAY, 'right bracket at the end of the JSON array')
	return { type:'LIST', content:content, localName:util.name('LIST_LITERAL') }
})

var parseObjectLiteral = astGenerator(function() {
	advance('symbol', L_CURLY)
	var content = []
	while (true) {
		if (peek('symbol', R_CURLY)) { break }
		var key = advance(['name','string']).value
		advance('symbol', ':')
		var value = parseExpression()
		content.push({ key:key, value:value })
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
	var tagName = gToken.value,
		attributes = _parseXMLAttributes()
	
	advance('symbol', ['/>', '>'], 'end of the XML tag')
	if (gToken.value == '/>') {
		return { type:'XML', tagName:tagName, attributes:attributes, content:[] }
	} else {
		var statements = []
		while(true) {
			if (peek('symbol', '</')) { break }
			statements.push(parseStatement())
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
	var namespace = parseNamespace(),
		singleName = namespace.length == 1 && namespace[0]
	advance('symbol', '=')
	var value =
		singleName == 'style' ? parseObjectLiteral() :
		singleName.match(/on\w+/) ? parseHandlerLiteral(true) :
		parseExpression()
	return { namespace:namespace, value:value }
})

/************************************
 * Invocables (Templates & Handlers *
 ************************************/
var parseTemplateLiteral = astGenerator(function() {
	var callable = _parseCallable(parseStatement, 'template')
	return { type:'TEMPLATE', signature:callable[0], block:callable[1] }
})

var parseHandlerLiteral = astGenerator(function(allowAlias) {
	if (peek('name')) { return parseAlias() }
	var callable = _parseCallable(parseMutationStatement, 'handler')
	return { type:'HANDLER', signature:callable[0], block:callable[1] }
})

var _parseCallable = function(statementParseFn, keyword) {
	advance('keyword', keyword)
	advance('symbol', L_PAREN)
	var signature = parseList(_parseCallableArg, R_PAREN)
	advance('symbol', R_PAREN)
	var block = parseBlock(statementParseFn, keyword)
	return [signature, block]
}

var _parseCallableArg = astGenerator(function() {
	return { type:'TEMPLATE_ARGUMENT', name:advance('name').value }
})

/************************************************
 * Top level mutation statements (handler code) *
 ************************************************/
var parseMutationStatement = function() {
	var token = peek()
	switch(token.type) {
		case 'keyword':
			switch(token.value) {
				case 'debugger':  return parseDebuggerStatement()
				case 'let':       return _parseMutationDeclaration()
				case 'new':       return _parseItemCreation()
				default:          console.log(token); UNKNOWN_MUTATION_KEYWORD
			}
		default:
			return _parseMutationInvocation()
	}
}

var _parseMutationDeclaration = astGenerator(function() {
	advance('keyword', 'let')
	var name = advance('name').value
	advance('symbol', '=')
	var value = (peek('keyword', 'new')
		? _parseItemCreation()
		: parseExpression())
	return {type: 'MUTATION_DECLARATION', name:name, value:value}
})

var _parseMutationInvocation = astGenerator(function() {
	var alias = parseAlias(),
		method = alias.namespace.pop()
	advance('symbol', L_PAREN)
	var args = parseList(parseExpression, R_PAREN)
	advance('symbol', R_PAREN, 'end of mutation method')
	return {type:'MUTATION', method:method, alias:alias, args:args}
})

var _parseItemCreation = astGenerator(function() {
	advance('keyword', 'new')
	var itemProperties = parseObjectLiteral()
	return {type: 'MUTATION_ITEM_CREATION', properties:itemProperties}
})

/*************
* For loops *
*************/
var parseForLoopStatement = astGenerator(function() {
	advance('keyword', 'for')
	advance('symbol', L_PAREN, 'beginning of for_loop\'s iterator statement')
	
	var iteratorName = advance('name', null, 'for_loop\'s iterator alias').value,
		iteratorValue = createAST({ type:'RUNTIME_ITERATOR' }),
		iterator = createAST({ type:'FOR_ITERATOR_DECLARATION', name:iteratorName, value: iteratorValue })
	
	advance('keyword', 'in', 'for_loop\'s "in" keyword')
	var iterable = parseExpression()
	
	advance('symbol', R_PAREN, 'end of for_loop\'s iterator statement')
	var block = parseBlock(parseStatement, 'for_loop')
	
	return { type:'FOR_LOOP', iterable:iterable, iterator:iterator, block:block }
})

/****************
 * If statement *
 ****************/
var parseIfStatement = astGenerator(function() {
	advance('keyword', 'if')
	advance('symbol', L_PAREN, 'beginning of the if statement\'s conditional')
	var condition = parseConditionExpression()
	advance('symbol', R_PAREN, 'end of the if statement\'s conditional')
	
	var ifBlock = parseBlock(parseStatement, 'if statement')
	
	var elseBlock = null
	if (peek('keyword', 'else')) {
		advance('keyword', 'else')
		elseBlock = parseBlock(parseStatement, 'else statement')
	}
	
	return { type:'IF_STATEMENT', condition:condition, ifBlock:ifBlock, elseBlock:elseBlock }
})

/********************
 * Switch statement *
 ********************/
var parseSwitchStatement = astGenerator(function() {
	advance('keyword', 'switch')
	advance('symbol', L_PAREN, 'beginning of the switch statement\'s value')
	var controlValue = parseConditionExpression()
	advance('symbol', R_PAREN, 'end of the switch statement\'s value')
	var cases = parseBlock(_parseCase, 'switch case statement')
	return { type:'SWITCH_STATEMENT', controlValue:controlValue, cases:cases }
})

var _parseCase = astGenerator(function() {
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
		statements.push(parseStatement())
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

// parses <name1>.<name2>.<name3>...
// expects the current token to be <name1> (e.g. foo foo.bar.cat)
var parseNamespace = function(msg) {
	var namespace = []
	while(true) {
		var token = advance('name')
		namespace.push(token.value)
		if (!peek('symbol', '.')) { break }
		advance('symbol', '.', msg)
	}
	return namespace
}

// return an AST for the debugger keyword (translates directly into the javascript debugger keyword in the output code)
var parseDebuggerStatement = astGenerator(function() {
	advance('keyword', 'debugger')
	return { type:'DEBUGGER' }
})

var parseAlias = astGenerator(function(msg) {
	return { type: 'ALIAS', namespace: parseNamespace(msg) }
})

/*********************
 * Utility functions *
 *********************/
function assert(ok, msg) {
	if (!ok) halt(msg)
}

function halt(msg, useNextToken) {
	var token = useNextToken ? peek() : gToken
	sys.puts(util.grabLine(token.file, token.line, token.column, token.span))
	throw new ParseError(token.file, msg)
}

function advance(type, value, expressionType) {
	var nextToken = gTokens[gIndex + 1]
	if (!nextToken) { halt('Unexpected end of file') }
	function check(v1, v2) {
		if (v1 == v2) { return }
		halt(['Expected a', q(type),
			value ? 'of value ' + (value instanceof Array ? value.join(' or ') : value) : ',',
			expressionType ? 'for the ' + expressionType : '',
			'but found a', q(nextToken.type),
			'of value', q(nextToken.value)].join(' '), true)
	}
	if (type) { check(findInArray(type, nextToken.type), nextToken.type) }
	if (value) { check(findInArray(value, nextToken.value), nextToken.value) }
	gToken = gTokens[++gIndex]
	return gToken
}

function peek(type, value, steps) {
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
	astObj.info = {
		file: startToken.file,
		line: startToken.line,
		column: startToken.column,
		span: (startToken.line == endToken.line
			? endToken.column - startToken.column + endToken.span
			: startToken.span)
	}
	return astObj
}

