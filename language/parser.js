var sys = require('sys'),
	util = require('./util'),
	q = util.q,
	debug = util.debug

exports.parse = util.intercept('ParseError', doParse)

var L_PAREN = '(',
	R_PAREN = ')',
	L_CURLY = '{',
	R_CURLY = '}',
	L_ARRAY = '[',
	R_ARRAY = ']'

var gToken, gIndex, gTokens, gState, gAST

var ParseError = function(file, msg) {
	this.name = 'ParseError';
	this.message = ['on line', gToken.line + ',', 'column', gToken.column, 'of', '"'+file+'":', msg].join(' ')
}
ParseError.prototype = Error.protoype

function doParse(tokens) {
	gTokens = tokens
	gIndex = -1
	gToken = null
	gAST = []
	
	while (true) {
		if (gIndex + 1 == gTokens.length) { break }
		advance()
		gAST.push(parseStatement())
	}
	
	return gAST
}

var parseStatement = function() {
	switch(gToken.type) {
		case 'string':
		case 'number':
			return getStaticValue()
		case 'symbol':
			switch(gToken.value) {
				case '<': return parseXML()
				case '=': halt('Unexpected symbol "=". Did you forget a "let" at the beginning of the line?')
				default:  halt('Unexpected symbol "'+gToken.value+'"')
			}
		case 'name':
			return parseAliasOrInvocation()
		case 'keyword':
			switch (gToken.value) {
				case 'import':   return parseImport()
				case 'let':      return parseDeclaration()
				case 'for':      return parseForLoop()
				case 'if':       return parseIfStatement()
				case 'debugger': return parseDebuggerStatement()
				default:       halt('Unexpected keyword "'+gToken.value+'" at the beginning of a statement')
			}
		default:
			halt('Unknown parse statement token: ' + gToken.type)
	}
}

function parseBlock(statementType, statementParseFn) {
	advance('symbol', L_CURLY, 'beginning of the '+statementType+'\'s block')
	var block = []
	while(!peek('symbol', R_CURLY)) {
		advance()
		block.push(statementParseFn())
	}
	advance('symbol', R_CURLY, 'end of the '+statementType+' statement\'s block')
	return block
}

var parseDebuggerStatement = astGenerator(function() {
	return {type:'DEBUGGER'}
})

/***********************
 * Mutation statements *
 ***********************/
var parseMutationStatement = function() {
	switch(gToken.type) {
		case 'keyword':
			switch(gToken.value) {
				case 'let':       return parseMutationAssignment()
				case 'debugger':  return parseDebuggerStatement()
				default:          console.log(gToken); UNKNOWN_MUTATION_KEYWORD
			}
		default:
			return parseValueMutation()
	}
}

var parseMutationAssignment = astGenerator(function() {
	var namespace = [advance('name').value]
	advance('symbol', '=')
	var value = parseValueOrAliasOrItemCreation()
	return {type: 'MUTATION_DECLARATION', namespace:namespace, value:value}
})

var parseValueMutation = astGenerator(function() {
	var alias = parseAlias('Object mutation'),
		method = alias.namespace.pop() // e.g. task.title.set() -> namespace ['task','title'], method 'set'
	
	advance('symbol', L_PAREN)
	var args = parseList(parseValueOrAliasOrItemCreation)
	advance('symbol', R_PAREN)
	
	return {type: 'MUTATION', alias:alias, method:method, args:args}
})

var parseValueOrAliasOrItemCreation = function() {
	if (peek('keyword', 'new')) { return parseItemCreation() }
	else { return parseValueOrAlias() }
}

var parseItemCreation = astGenerator(function() {
	advance('keyword', 'new')
	advance('symbol', L_CURLY)
	var itemProperties = parseAliasLiteral()
	return {type: 'MUTATION_ITEM_CREATION', properties:itemProperties}
})

/*******************
 * Utility methods *
 *******************/
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

function astGenerator(generatorFn) {
	return function() {
		var startToken = gToken,
			ast = generatorFn.apply(this, arguments),
			endToken = gToken
		
		ast.file = startToken.file
		ast.line = startToken.line
		ast.column = startToken.column
		ast.lineEnd = endToken.line
		ast.columnEnd = endToken.column
		if (ast.line == ast.lineEnd) {
			ast.span = endToken.column - startToken.column + endToken.span
		} else {
			ast.span = startToken.span
		}
		
		return ast
	}
}

/***********
 * Imports *
 ***********/
var parseImport = astGenerator(function() {
	debug('parseImport')
	advance(['string','name'])
	if (gToken.type == 'string') {
		return { type: 'IMPORT_FILE', path: gToken.value }
	} else {
		return { type: 'IMPORT_MODULE', name: gToken.value }
	}
})

/*****************************
 * Items, aliases and values *
 *****************************/
function parseValueOrAlias() {
	debug('parseValueOrAlias')
	advance()
	switch(gToken.type) {
		case 'name':
		    return parseAlias()
		case 'string':
		case 'number':
			return getStaticValue()
		case 'symbol':
			return parseValueLiteral();
		case 'keyword':
			return parseKeyword();
		default:
			halt('Unexpected value or alias token: ' + gToken.type + ' ' + gToken.value)
	}
}

function parseValueLiteral() {
	switch(gToken.value) {
		case '<':
			return parseXML()
		case L_CURLY:
		case L_ARRAY:
			return parseJSON()
		case '@':
			return parseItem()
		default:
			halt('Unexpected symbol "'+gToken.value+'". Expected XML or JSON')
	}
}

var parseItem = astGenerator(function() {
	debug('parseItem')
	assert(gToken.type == 'symbol' && gToken.value == '@')
	advance(['name', 'number'])
	var itemID = gToken.value
	if (peek('symbol', '.')) {
		// TODO parse property
	}
	return { type:'ITEM', id: itemID }
})

function parseKeyword() {
	switch(gToken.value) {
		case 'import': return parseImport()
		case 'template': return parseTemplate()
		case 'handler': return parseHandler()
		default:
			halt('Unexpected keyword "'+gToken.value+'"')
	}
}

var parseAlias = astGenerator(function(msg) {
	return { type: 'ALIAS', namespace: _parseNamespace(msg) }
})

var parseAliasOrInvocation = astGenerator(function() {
	debug('parseAliasOrInvocation')
	var alias = parseAlias()
	if (peek('symbol', L_PAREN)) {
		advance('symbol', L_PAREN)
		var args = parseValueList(R_PAREN)
		advance('symbol', R_PAREN)
		return { type:'INVOCATION', alias:alias, args:args }
	}
	return alias
})

var getStaticValue = astGenerator(function() {
	debug('getStaticValue')
	assert(gToken.type == 'string' || gToken.type == 'number')
	return { type:'STATIC_VALUE', valueType:gToken.type, value:gToken.value }
})

// Note: _parseNamespace expects the current token to be a name (the first in name.foo.bar)
function _parseNamespace(msg) {
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

/*******
 * XML *
 *******/
var parseXML = astGenerator(function() {
	debug('parseXML')
	advance('name', null, 'XML tag')
	var tagName = gToken.value,
		attributes = parseXMLAttributes()
	
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
		attributes = attributes.concat(parseXMLAttributes())
		advance('symbol', '>')
		
		return { type:'XML', tagName:tagName, attributes:attributes, block:statements }
	}
})
var parseXMLAttributes = function() {
	debug('parseXMLAttributes')
	var XMLAttributes = []
	while (peek('name')) { XMLAttributes.push(_parseXMLAttribute()) }
	return XMLAttributes
}

var _parseXMLAttribute = astGenerator(function() {
	var assignment = parseAssignment('XML_attribute')
	return {namespace:assignment[0], value:assignment[1]}
})

function parseAssignment(acceptDotNotation, msg) {
	debug('parseAssignment')
	var namespace
	advance('name', null, msg)
	if (acceptDotNotation) { namespace = _parseNamespace() }
	else { namespace = gToken.value }
	advance('symbol', '=', msg)
	var value = parseValueOrAlias()
	return [namespace, value]
}

/****************
 * Declarations *
 ****************/
function parseDeclaration() {
	debug('parseDeclaration')
	var assignment = parseAssignment('declaration')
	return _createDeclaration(assignment[0], assignment[1])
}

var _createDeclaration = astGenerator(function(namespace, value) {
	return { type:'DECLARATION', namespace:namespace, value:value }
})

/********
 * JSON *
 ********/
function parseJSON() {
	if (gToken.value == L_CURLY) { return parseAliasLiteral() }
	else { return parseListLiteral() }
}
var parseAliasLiteral = astGenerator(function() {
	debug('parseObjectLiteral')
	assert(gToken.type == 'symbol' && gToken.value == L_CURLY)
	var content = []
	while (true) {
		if (peek('symbol', R_CURLY)) { break }
		var nameValuePair = {}
		advance(['name','string'])
		nameValuePair.name = gToken.value
		advance('symbol', ':')
		nameValuePair.value = parseValueOrAlias()
		content.push(nameValuePair)
		if (!peek('symbol', ',')) { break }
		advance('symbol',',')
	}
	advance('symbol', R_CURLY, 'right curly at the end of the JSON object')
	return { type:'NESTED_ALIAS', content:content }
})
var parseListLiteral = astGenerator(function() {
	debug('parseListLiteral')
	assert(gToken.type == 'symbol' && gToken.value == L_ARRAY)
	var content = parseValueList(R_ARRAY)
	advance('symbol', R_ARRAY, 'right bracket at the end of the JSON array')
	return { type:'LIST', content:content }
})
function parseValueList(breakSymbol) {
	var list = []
	while (true) {
		if (peek('symbol', breakSymbol)) { break }
		list.push(parseValueOrAlias())
		if (!peek('symbol', ',')) { break }
		advance('symbol', ',')
	}
	return list
}

/*************
* For loops *
*************/
var parseForLoop = astGenerator(function() {
	debug('parseForLoop')
	
	// parse "(item in Global.items)"
	advance('symbol', L_PAREN, 'beginning of for_loop\'s iterator statement')
	advance('name', null, 'for_loop\'s iterator alias')
	var iterator = _createDeclaration([gToken.value], _createRuntimeIterator())
	advance('keyword', 'in', 'for_loop\'s "in" keyword')
	advance('name', null, 'for_loop\'s iterable value')
	var iterable = parseAlias()
	advance('symbol', R_PAREN, 'end of for_loop\'s iterator statement')
	
	// parse "{ ... for loop statements ... }"
	var block = parseBlock('for_loop', parseStatement)
	
	return { type:'FOR_LOOP', iterable:iterable, iterator:iterator, block:block }
})

var _createRuntimeIterator = astGenerator(function() {
	return { type:'RUNTIME_ITERATOR' }
})

/****************
 * If statement *
 ****************/
var parseIfStatement = astGenerator(function() {
	debug('parseIfStatement')
	
	advance('symbol', L_PAREN, 'beginning of the if statement\'s conditional')
	var condition = parseCondition()
	advance('symbol', R_PAREN, 'end of the if statement\'s conditional')
	
	var ifBlock = parseBlock('if statement', parseStatement)
	
	var elseBlock = null
	if (peek('keyword', 'else')) {
		advance('keyword', 'else')
		elseBlock = parseBlock('else statement', parseStatement)
	}
	
	return { type:'IF_STATEMENT', condition:condition, ifBlock:ifBlock, elseBlock:elseBlock }
})
var parseCondition = astGenerator(function() {
	debug('parseCondition')
	// TODO Parse compond statements, e.g. if (age < 30 && (income > 10e6 || looks=='awesome'))
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

/************************
 * Templates & Handlers *
 ************************/
var parseTemplate = astGenerator(function() {
	debug('parseTemplate')
	var callable = parseCallable('template', parseStatement)
	return { type:'TEMPLATE', signature:callable[0], block:callable[1] }
})

var parseHandler = astGenerator(function() {
	debug('parseHandler')
	var callable = parseCallable('handler', parseMutationStatement)
	return { type:'HANDLER', signature:callable[0], block:callable[1] }
})

function parseCallable(msg, statementParseFn) {
	advance('symbol', L_PAREN)
	var args = parseList(function() {
		advance('name')
		return gToken.value
	})
	advance('symbol', R_PAREN)
	var block = parseBlock(msg, statementParseFn)
	return [args, block]
}

function parseList(itemParseFn) {
	debug('parseSignature')
	var args = []
	while (true) {
		if (peek('symbol', R_PAREN)) { break }
		args.push(itemParseFn())
		if (!peek('symbol', ',')) { break }
		advance('symbol', ',')
	}
	return args
}
