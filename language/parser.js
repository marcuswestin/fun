var sys = require('sys'),
	util = require('./util'),
	q = util.q

exports.parse = util.intercept('ParseError', doParse)

var L_PAREN = '(',
	R_PAREN = ')',
	L_CURLY = '{',
	R_CURLY = '}',
	L_ARRAY = '[',
	R_ARRAY = ']'
	
var JAVASCRIPT_BRIDGE_TOKEN = '__javascriptBridge'

var gToken, gIndex, gTokens, gState

var ParseError = function(file, msg) {
	this.name = 'ParseError';
	this.message = ['on line', gToken.line + ',', 'column', gToken.column, 'of', '"'+file+'":', msg].join(' ')
}
ParseError.prototype = Error.protoype

function doParse(tokens) {
	gTokens = tokens
	gIndex = -1
	gToken = null
	
	var ast = []
	while (gIndex + 1 != gTokens.length) {
		advance()
		ast.push(parseStatement())
	}
	return ast
}

/************************************************
 * Top level emit statements (non-handler code) *
 ************************************************/
var parseStatement = function() {
	switch(gToken.type) {
		case 'string':
		case 'number':
			return getStaticValue()
		case 'name':
			return parseAliasOrInvocation()
		case 'symbol':
			switch(gToken.value) {
				case '<': return parseXML()
				case '=': halt('Unexpected symbol "=". Did you forget a "let" at the beginning of the line?')
				default:  halt('Unexpected symbol "'+gToken.value+'"')
			}
		case 'keyword':
			switch (gToken.value) {
				case 'import':   return parseImport()
				case 'let':      return parseDeclaration()
				case 'for':      return parseForLoop()
				case 'if':       return parseIfStatement()
				case 'debugger': return debuggerAST()
				default:         halt('Unexpected keyword "'+gToken.value+'" at the beginning of a top level statement')
			}
		default:
			halt('Unknown parse statement token: ' + gToken.type)
	}
}

/***********
 * Imports *
 ***********/
var parseImport = astGenerator(function() {
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
var parseDeclaration = function() {
	var assignment = parseAssignment('declaration')
	return _createDeclaration(assignment[0], assignment[1])
}

var _createDeclaration = astGenerator(function(namespace, value) {
	return { type:'DECLARATION', namespace:namespace, value:value }
})

/*********************************************************************
 * Value statements (static literals, aliases, template invocations) *
 *********************************************************************/
var parseValueOrAlias = function() {
	advance()
	switch(gToken.type) {
		case 'name':
		    return parseAlias()
		case 'string':
		case 'number':
			return getStaticValue()
		case 'symbol':
			switch(gToken.value) {
				case '<':     return parseXML()
				case L_CURLY: return parseObjectLiteral()
				case L_ARRAY: return parseListLiteral()
				case '@':     return parseItemLiteral()
				default:      halt('Unexpected symbol "'+gToken.value+'". Expected XML or JSON')
			}
		case 'keyword':
			switch(gToken.value) {
				case 'template': return parseTemplateLiteral()
				case 'handler':  return parseHandlerLiteral()
				default:         halt('Unexpected keyword "'+gToken.value+'"')
			}
		default:
			halt('Unexpected value or alias token: ' + gToken.type + ' ' + gToken.value)
	}
}

var parseAlias = astGenerator(function(msg) {
	return { type: 'ALIAS', namespace: parseNamespace(msg) }
})

var parseAliasOrInvocation = astGenerator(function() {
	var namespace = parseNamespace()
	if (peek('symbol', L_PAREN)) {
		advance('symbol', L_PAREN)
		var args = parseList(parseValueOrAlias, R_PAREN)
		advance('symbol', R_PAREN)
		return { type:'INVOCATION', method:namespace.pop(), namespace:namespace, args:args }
	}
	return { type: 'ALIAS', namespace: namespace }
})

var getStaticValue = astGenerator(function() {
	assert(gToken.type == 'string' || gToken.type == 'number')
	return { type:'STATIC_VALUE', valueType:gToken.type, value:gToken.value }
})

/*****************
 * Item literals *
 *****************/
var parseItemLiteral = astGenerator(function() {
	assert(gToken.type == 'symbol' && gToken.value == '@')
	advance(['name', 'number'])
	var itemID = gToken.value
	if (peek('symbol', '.')) {
		// TODO parse property
	}
	return { type:'ITEM', id: itemID }
})

/************************************
 * JSON - list and object listerals *
 ************************************/
var parseListLiteral = astGenerator(function() {
	assert(gToken.type == 'symbol' && gToken.value == L_ARRAY)
	var content = parseList(parseValueOrAlias, R_ARRAY)
	advance('symbol', R_ARRAY, 'right bracket at the end of the JSON array')
	return { type:'LIST', content:content }
})

var parseObjectLiteral = astGenerator(function() {
	assert(gToken.type == 'symbol' && gToken.value == L_CURLY)
	var content = []
	while (true) {
		if (peek('symbol', R_CURLY)) { break }
		var nameValuePair = {}
		advance(['name','string'])
		nameValuePair.name = gToken.value
		advance('symbol', ':')
		// HACK! Come up with better syntax than __javascriptBridge(<jsType:string>, <jsName:string>)
		if (peek('name', JAVASCRIPT_BRIDGE_TOKEN)) {
			nameValuePair.value = parseJavascriptBridge()
		} else {
			nameValuePair.value = parseValueOrAlias()
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
	advance('name', null, 'XML tag')
	var tagName = gToken.value,
		attributes = _parseXMLAttributes()
	
	advance('symbol', ['>', '/'], 'end of XML tag')
	if (gToken.value == '/') {
		advance('symbol', '>', 'self-closing XML tag')
		return { type:'XML', tagName:tagName, attributes:attributes, content:[] }
	} else {
		var statements = []
		while(true) {
			if (peek('symbol', '<') && peek('symbol', '/', 2)) { break }
			advance()
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
	while (peek('name')) { XMLAttributes.push(_parseXMLAttribute()) }
	return XMLAttributes
}
var _parseXMLAttribute = astGenerator(function() {
	var assignment = parseAssignment('XML_attribute')
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

var _parseCallable = function(statementParseFn, msg) {
	advance('symbol', L_PAREN)
	var args = parseList(function() { advance('name'); return gToken.value }, R_PAREN)
	advance('symbol', R_PAREN)
	var block = parseBlock(statementParseFn, msg)
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
	advance('symbol', R_PAREN)
	return { type:'JAVASCRIPT_BRIDGE', jsType:jsType, jsName:jsName }
})

/************************************************
 * Top level mutation statements (handler code) *
 ************************************************/
var parseMutationStatement = function() {
	switch(gToken.type) {
		case 'keyword':
			switch(gToken.value) {
				case 'let':       return _parseMutationAssignment()
				case 'debugger':  return debuggerAST()
				default:          console.log(gToken); UNKNOWN_MUTATION_KEYWORD
			}
		default:
			return _parseValueMutation()
	}
}

var _parseMutationAssignment = astGenerator(function() {
	var namespace = [advance('name').value]
	advance('symbol', '=')
	var value = _parseValueOrAliasOrItemCreation()
	return {type: 'MUTATION_DECLARATION', namespace:namespace, value:value}
})

var _parseValueMutation = astGenerator(function() {
	// TODO Make this parseNamespace instead of parseAlias
	var alias = parseAlias('Object mutation')
	advance('symbol', L_PAREN)
	var args = parseList(_parseValueOrAliasOrItemCreation, R_PAREN)
	advance('symbol', R_PAREN)
	
	var method = alias.namespace[alias.namespace.length - 1]
	return {type: 'MUTATION', alias:alias, method:method, args:args}
})

var _parseValueOrAliasOrItemCreation = function() {
	if (peek('keyword', 'new')) { return _parseItemCreation() }
	else { return parseValueOrAlias() }
}

var _parseItemCreation = astGenerator(function() {
	advance('keyword', 'new')
	advance('symbol', L_CURLY)
	var itemProperties = parseObjectLiteral()
	return {type: 'MUTATION_ITEM_CREATION', properties:itemProperties}
})

/*************
* For loops *
*************/
var parseForLoop = astGenerator(function() {
	// parse "(item in Global.items)"
	advance('symbol', L_PAREN, 'beginning of for_loop\'s iterator statement')
	advance('name', null, 'for_loop\'s iterator alias')
	var iterator = _createDeclaration([gToken.value], _createRuntimeIterator())
	advance('keyword', 'in', 'for_loop\'s "in" keyword')
	advance('name', null, 'for_loop\'s iterable value')
	var iterable = parseAlias()
	advance('symbol', R_PAREN, 'end of for_loop\'s iterator statement')
	
	// parse "{ ... for loop statements ... }"
	var block = parseBlock(parseStatement, 'for_loop')

	return { type:'FOR_LOOP', iterable:iterable, iterator:iterator, block:block }
})

var _createRuntimeIterator = astGenerator(function() {
	return { type:'RUNTIME_ITERATOR' }
})

/****************
 * If statement *
 ****************/
var parseIfStatement = astGenerator(function() {
	advance('symbol', L_PAREN, 'beginning of the if statement\'s conditional')
	var condition = _parseCondition()
	advance('symbol', R_PAREN, 'end of the if statement\'s conditional')

	var ifBlock = parseBlock(parseStatement, 'if statement')

	var elseBlock = null
	if (peek('keyword', 'else')) {
		advance('keyword', 'else')
		elseBlock = parseBlock(parseStatement, 'else statement')
	}

	return { type:'IF_STATEMENT', condition:condition, ifBlock:ifBlock, elseBlock:elseBlock }
})

var _parseCondition = astGenerator(function() {
	// TODO Parse compound statements, e.g. if (age < 30 && (income > 10e6 || looks=='awesome'))
	var type = gToken.type,
		value = gToken.value

	// Only strings, numbers, and aliases allowed
	advance(['string', 'number', 'name'])
	var left = parseStatement()

	var comparison, right
	if (peek('symbol', '<,<=,>,>=,==,!='.split(','))) {
		advance('symbol')
		comparison = gToken.value
		advance(['string', 'number', 'name'])
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
var parseAssignment = function(msg) {
	advance('name', null, msg)
	var namespace = parseNamespace()
	advance('symbol', '=', msg)
	var value = parseValueOrAlias()
	return [namespace, value]
}

// parses a series of statements enclosed by curlies, e.g. { <statement> <statement> <statement> }
var parseBlock = function(statementParseFn, statementType) {
	advance('symbol', L_CURLY, 'beginning of the '+statementType+'\'s block')
	var block = []
	while(!peek('symbol', R_CURLY)) {
		advance()
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
		assert(gToken.type == 'name')
		namespace.push(gToken.value)
		if (!peek('symbol', '.')) { break }
		advance('symbol', '.', msg)
		advance('name', null, msg)
	}
	return namespace
}

/*********************
 * Utility functions *
 *********************/
var assert = function(ok, msg) { if (!ok) halt(msg) }
var halt = function(msg) {
	sys.puts(util.grabLine(gToken.file, gToken.line, gToken.column, gToken.span));
	throw new ParseError(gToken.file, msg)
}
var advance = function(type, value, expressionType) {
	var nextToken = gTokens[++gIndex]
	if (!nextToken) { halt('Unexpected end of file') }
	function check(v1, v2) {
		assert(v1 == v2,
			['Expected a', q(type),
				value ? 'of value ' + q(value) : '',
				expressionType ? 'for the ' + expressionType : '',
				'but found a', q(nextToken.type),
				'of value', q(nextToken.value)].join(' ')
	)}
	if (type) { check(findInArray(type, nextToken.type), nextToken.type) }
	if (value) { check(findInArray(value, nextToken.value), nextToken.value) }
	gToken = nextToken
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

// Generates an AST
function astGenerator(generatorFn) {
	return function() {
		var startToken = gToken,
			ast = generatorFn.apply(this, arguments),
			endToken = gToken
		
		ast.info = {
			file: startToken.file,
			line: startToken.line,
			column: startToken.column,
			span: (startToken.line == endToken.line
				? endToken.column - startToken.column + endToken.span
				: startToken.span)
		}
		
		return ast
	}
}

// return an AST for the debugger keyword (translates directly into the javascript debugger keyword in the output code)
var debuggerAST = astGenerator(function() {
	if (gToken.type != 'keyword' || gToken.value != 'debugger') { UNEXPECTED_NON_DEBUGGER_TOKEN }
	return { type:'DEBUGGER' }
})

