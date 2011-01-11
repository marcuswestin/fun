var sys = require('sys'),
	util = require('./util'),
	bind = util.bind,
	q = util.q

var L_PAREN = '(', R_PAREN = ')',
	L_CURLY = '{', R_CURLY = '}',
	L_ARRAY = '[', R_ARRAY = ']'
	
var JAVASCRIPT_BRIDGE_TOKEN = '__javascriptBridge'

var gToken, gIndex, gTokens, gState

var ParseError = function(file, msg) {
	var token = peek()
	this.name = 'ParseError';
	this.message = ['on line', token.line + ',', 'column', token.column, 'of', '"'+file+'":', msg].join(' ')
}
ParseError.prototype = Error.protoype

exports.parse = util.intercept('ParseError', function(tokens) {
	gTokens = tokens
	gIndex = -1
	gToken = null
	
	var ast = []
	while (gIndex + 1 != gTokens.length) {
		ast.push(parseStatement())
	}
	return ast
})

/************************************************
 * Top level emit statements (non-handler code) *
 ************************************************/
var parseStatement = function() {
	var token = peek()
	switch(token.type) {
		case 'string':
		case 'number':
		case 'name':
		case 'symbol':
			// allow for inline XML, template invocations, and composite statements in top level statements
			return parseValueStatement({ xml:true, invocation:true, composite:true })
		case 'keyword':
			switch (token.value) {
				case 'import':   return parseImportStatement()
				case 'let':      return parseDeclarationsStatement()
				case 'for':      return parseForLoopStatement()
				case 'if':       return parseIfStatement()
				case 'debugger': return debuggerAST()
				default:         halt('Unexpected keyword "'+token.value+'" at the beginning of a top level statement')
			}
		default:
			halt('Unknown top level statement token: ' + token.type)
	}
}

/***********
 * Imports *
 ***********/
var parseImportStatement = astGenerator(function() {
	advance('keyword', 'import')
	advance(['string','name'])
	if (gToken.type == 'string') {
		return { type: 'IMPORT_FILE', path: gToken.value }
	} else {
		return { type: 'IMPORT_MODULE', name: gToken.value }
	}
})

/****************
 * Declarations *
 ****************/
var parseDeclarationsStatement = astGenerator(function() {
	advance('keyword', 'let')
	var declarations = []
	
	while (true) {
		var allowedValues = { itemLiteral:true, handlerLiteral:true, templateLiteral:true, objectLiteral:true },
			assignment = parseAssignment(allowedValues)
		
		declarations.push({ type:'DECLARATION', namespace:assignment[0], value:assignment[1] })
		
		if (!peek('symbol', ',')) { break }
		advance('symbol', ',')
	}
	
	return declarations
})

/*********************************************************************
 * Value statements (static literals, aliases, template invocations) *
 *********************************************************************/
// parse a value statement - "allowed" is an object of the types of values
//  that are allowed to be parsed here. Numbers and text are allowed unless
//  unless specified false. Aliases are always allowed, since we don't know
//  what type of value they reference until the we're in the resolver stage.
//  The optional allowed value types are "invocation", "itemCreation",
//  "xml", "objectLiteral", "listLiteral", "itemLiteral", "templateLiteral",
//  "handlerLiteral" and "composite"
var parseValueStatement = function(allowed) {
	if (typeof allowed.number == 'undefined') { allowed.number = true }
	if (typeof allowed.text == 'undefined') { allowed.text = true }
	allowed.alias = true
	
	var result = _doParseValueStatement(allowed),
		nextSymbol = peek('symbol'),
		symbol = nextSymbol.value
	
	if (symbol == L_PAREN && result.type == 'ALIAS' && !nextSymbol.hadWhitespace) {
		assert(allowed.invocation, 'Invocation not allowed here')
		return _parseInvocation(result)
	} else if (allowed.composite && (_compositeOperatorSymbols[symbol]
		 	|| (allowed.conditional && _compositeConditionalSymbols[symbol]))) {
		return _parseCompositeValueStatement(result, allowed)
	} else {
		return result
	}
}

var _parseInvocationArgFn = bind(this, parseValueStatement, { composite:true, itemLiteral:true, handlerLiteral: true })
var _parseInvocation = astGenerator(function(alias) {
	advance('symbol', L_PAREN)
	var args = parseList(_parseInvocationArgFn, R_PAREN)
	advance('symbol', R_PAREN, 'end of invocation')
	return { type:'INVOCATION', alias:alias, args:args }
})

var _compositeOperatorSymbols = { '+':1, '-':1, '/':1, '*':1 }
var _compositeConditionalSymbols = { '<':1, '>':1, '<=':1, '>=':1, '==':1, '&&':1, '||':1 }
var _parseCompositeValueStatement = astGenerator(function(left, allowed) {
	var operator = advance('symbol').value
	var right = parseValueStatement(allowed)
	return { type:'COMPOSITE', operator:operator, left:left, right:right }
})

var _doParseValueStatement = function(allowed) {
	var token = peek()
	switch(token.type) {
		case 'string':
			assert(allowed.text, 'Text value not allowed here')
			return parseStaticValue()
		case 'number':
			assert(allowed.number, 'Number value not allowed here')
			return parseStaticValue()
		case 'name':
			assert(allowed.alias, 'Alias not allowed here')
			return parseAlias()
		case 'keyword':
			switch(token.value) {
				case 'template':
					assert(allowed.templateLiteral, 'Template literal not allowed here')
					return parseTemplateLiteral()
				case 'handler':
					assert(allowed.handlerLiteral, 'Handler literal not allowed here')
					return parseHandlerLiteral()
			}
		case 'symbol':
			switch(token.value) {
				case L_PAREN:
					assert(allowed.composite)
					advance('symbol', L_PAREN)
					var result = parseValueStatement(allowed)
					advance('symbol', R_PAREN, 'end of parenthesized composite statement')
					result.hasParens = true
					return result
				case '<':
					assert(allowed.xml, 'XML is not allowed here')
					return parseXML()
				case L_CURLY:
					assert(allowed.objectLiteral, 'Object literal value not allowed here')
					return parseObjectLiteral(allowed)
				case L_ARRAY:
					assert(allowed.listLiteral, 'List literal value not allowed here')
					return parseListLiteral()
				case '@':
					assert(allowed.itemLiteral, 'Item literal value not allowed here')
					return parseItemLiteral()
				default: halt('Unexpected symbol "'+token.value+'"')
			}
		default:
			halt(ast, 'Unexpected token "'+q(token)+'"')
	}
}

// TODO Replace with straight call to parseNamespace wherever it's being called, since they're not real aliases
var parseAlias = astGenerator(function(msg) {
	return { type: 'ALIAS', namespace: parseNamespace(msg) }
})

var parseStaticValue = astGenerator(function() {
	advance(['string','number'])
	return { type:'STATIC_VALUE', valueType:gToken.type, value:gToken.value }
})

/*****************
 * Item literals *
 *****************/
var parseItemLiteral = astGenerator(function() {
	advance('symbol', '@')
	advance(['name', 'number'])
	var itemID = gToken.value
	// TODO parse property, e.g. @GLOBAL.foo.bar.cat
	return { type:'ITEM', id: itemID }
})

/************************************
 * JSON - list and object listerals *
 ************************************/
var _parseListValueFn = bind(this, parseValueStatement, { itemLiteral:true, handlerLiteral: true })
var parseListLiteral = astGenerator(function() {
	advance('symbol', L_ARRAY)
	var content = parseList(_parseListValueFn, R_ARRAY)
	advance('symbol', R_ARRAY, 'right bracket at the end of the JSON array')
	return { type:'LIST', content:content }
})

var parseObjectLiteral = astGenerator(function(allowedValues) {
	advance('symbol', L_CURLY)
	var content = []
	while (true) {
		if (peek('symbol', R_CURLY)) { break }
		var nameValuePair = {},
			token = advance(['name','string'])
		nameValuePair.name = token.value
		advance('symbol', ':')
		// HACK! Come up with better syntax than __javascriptBridge(<jsType:string>, <jsName:string>)
		if (peek('name', JAVASCRIPT_BRIDGE_TOKEN)) {
			nameValuePair.value = parseJavascriptBridge()
		} else {
			nameValuePair.value = parseValueStatement(allowedValues)
		}
		content.push(nameValuePair)
		if (!peek('symbol', ',')) { break }
		advance('symbol',',')
	}
	advance('symbol', R_CURLY, 'right curly at the end of the JSON object')
	return { type:'OBJECT_LITERAL', content:content }
})

/****************
 * XML literals *
 ****************/
var parseXML = astGenerator(function() {
	advance('symbol', '<', 'XML tag opening')
	advance('name', null, 'XML tag name')
	var tagName = gToken.value,
		attributes = _parseXMLAttributes()
	
	advance('symbol', ['/', '>'], 'end of the XML tag')
	if (gToken.value == '/') {
		advance('symbol', '>', 'end of a self-closing XML tag')
		return { type:'XML', tagName:tagName, attributes:attributes, content:[] }
	} else {
		var statements = []
		while(true) {
			if (peek('symbol', '<') && peek('symbol', '/', 2)) { break }
			statements.push(parseStatement())
		}
		
		advance('symbol', '<')
		advance('symbol', '/')
		advance('name', tagName, 'matching XML tags')
		// allow for attributes on closing tag, e.g. <button>"Click"</button onClick=handler(){ ... }>
		attributes = attributes.concat(_parseXMLAttributes())
		advance('symbol', '>')
		
		return { type:'XML', tagName:tagName, attributes:attributes, block:statements }
	}
})
var _parseXMLAttributes = function() {
	var XMLAttributes = []
	while (!peek('symbol', ['/','>'])) {
		XMLAttributes.push(_parseXMLAttribute())
	}
	return XMLAttributes
}
var _parseXMLAttribute = astGenerator(function() {
	var allowedValues = {},
		attribute = peek().value
	if (attribute == 'style') {
		allowedValues.objectLiteral = true
	} else if (attribute.match(/on\w+/)) {
		allowedValues.handlerLiteral = true
	}
	var assignment = parseAssignment(allowedValues)
	return {namespace:assignment[0], value:assignment[1]}
})

/*******************************
 * Template & Handler literals *
 *******************************/
var parseTemplateLiteral = astGenerator(function() {
	var callable = _parseCallable(parseStatement, 'template')
	return { type:'TEMPLATE', signature:callable[0], block:callable[1] }
})

var parseHandlerLiteral = astGenerator(function() {
	var callable = _parseCallable(parseMutationStatement, 'handler')
	return { type:'HANDLER', signature:callable[0], block:callable[1] }
})

var _parseCallable = function(statementParseFn, keyword) {
	advance('keyword', keyword)
	advance('symbol', L_PAREN)
	var args = parseList(function() { advance('name'); return gToken.value }, R_PAREN)
	advance('symbol', R_PAREN)
	var block = parseBlock(statementParseFn, keyword)
	return [args, block]
}

/******************************
 * Javascript bridge literals *
 ******************************/
// HACK expects __javascriptBridge("function", "FacebookModule.connect") - see e.g. Modules/Facebook/Facebook.fun
var parseJavascriptBridge = astGenerator(function() {
	advance('name', JAVASCRIPT_BRIDGE_TOKEN)
	advance('symbol', L_PAREN)
	var jsType = advance('string').value
	advance('symbol', ',')
	var jsName = advance('string').value
	advance('symbol', R_PAREN, 'end of javascript bridge')
	return { type:'JAVASCRIPT_BRIDGE', jsType:jsType, jsName:jsName }
})

/************************************************
 * Top level mutation statements (handler code) *
 ************************************************/
var parseMutationStatement = function() {
	var token = peek()
	switch(token.type) {
		case 'keyword':
			switch(token.value) {
				case 'let':       return _parseMutationAssignment()
				case 'debugger':  return debuggerAST()
				case 'new':       return _parseItemCreation()
				default:          console.log(token); UNKNOWN_MUTATION_KEYWORD
			}
		default:
			return _parseMutationInvocation()
	}
}

var _parseMutationAssignment = astGenerator(function() {
	advance('keyword', 'let')
	var namespace = parseNamespace()
	advance('symbol', '=')
	var value = (peek('keyword', 'new')
		? _parseItemCreation()
		: parseValueStatement())
	return {type: 'MUTATION_DECLARATION', namespace:namespace, value:value}
})

var _parseMutationInvocationArgFn = bind(this, parseValueStatement, {number:true, text:true})
var _parseMutationInvocation = astGenerator(function() {
	var alias = parseAlias(),
		method = alias.namespace.pop()
	advance('symbol', L_PAREN)
	var args = parseList(_parseMutationInvocationArgFn, R_PAREN)
	advance('symbol', R_PAREN, 'end of mutation method')
	
	return {type:'MUTATION', method:method, alias:alias, args:args}
})

var _parseItemCreation = astGenerator(function() {
	advance('keyword', 'new')
	var itemProperties = parseObjectLiteral({ listLiteral:true })
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
		iterator = createAST({ type:'FOR_ITERATOR_DECLARATION', namespace:[iteratorName], value: iteratorValue })
	
	advance('keyword', 'in', 'for_loop\'s "in" keyword')
	var iterable = parseValueStatement({ listLiteral:true, text:false, number:false })
	
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
	var condition = parseValueStatement({ composite:true, conditional:true })
	advance('symbol', R_PAREN, 'end of the if statement\'s conditional')
	
	var ifBlock = parseBlock(parseStatement, 'if statement')
	
	var elseBlock = null
	if (peek('keyword', 'else')) {
		advance('keyword', 'else')
		elseBlock = parseBlock(parseStatement, 'else statement')
	}
	
	return { type:'IF_STATEMENT', condition:condition, ifBlock:ifBlock, elseBlock:elseBlock }
})
var _conditionOperators = '<,<=,>,>=,==,!='.split(',')
var _parseCondition = astGenerator(function() {
	// TODO Parse compound statements, e.g. if (age < 30 && (income > 10e6 || looks=='awesome'))
	// Only strings, numbers, and aliases allowed
	var left = parseStatement()

	var comparison, right
	if (peek('symbol', _conditionOperators)) {
		comparison = advance('symbol', _conditionOperators).value
		var right = parseStatement()
	}

	return { left:left, comparison:comparison, right:right }
})

/****************************
 * Shared parsing functions *
 ****************************/
// parses comma-seperated statements until <breakSymbol> is encounteded (e.g. R_PAREN or R_BRACKET)
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

// parses <namespace> = <value statement>
var parseAssignment = function(allowedValues) {
	var namespace = parseNamespace()
	advance('symbol', '=')
	var value = parseValueStatement(allowedValues)
	return [namespace, value]
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

/*********************
 * Utility functions *
 *********************/
var assert = function(ok, msg) { if (!ok) halt(msg); return true }
var halt = function(msg, useNextToken) {
	var token = useNextToken ? peek() : gToken
	sys.puts(util.grabLine(token.file, token.line, token.column, token.span));
	sys.puts(msg)
	throw new ParseError(token.file, msg)
}
var advance = function(type, value, expressionType) {
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
var findInArray = function(array, target) {
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
var createAST = function(astObj, startToken, endToken) {
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

// return an AST for the debugger keyword (translates directly into the javascript debugger keyword in the output code)
var debuggerAST = astGenerator(function() {
	advance('keyword', 'debugger')
	return { type:'DEBUGGER' }
})

