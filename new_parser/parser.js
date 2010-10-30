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
			return getLiteralValue()
		case 'symbol':
			if (gToken.value == '<') { return parseXML() }
			else if (gToken.value == '=') { halt('Unexpected symbol "=". Did you forget to put "let" at the beginning of the line?') }
			else { halt('Unexpected symbol "'+gToken.value+'"') }
		case 'name':
			return parseAliasOrInvocation()
		case 'keyword':
			switch (gToken.value) {
				case 'let': return parseDeclaration()
				case 'for': return parseForLoop()
				case 'if': return parseIfStatement()
				default: halt('Unexpected keyword "'+gToken.value+'" at the beginning of a statement')
			}
		default:
			halt('Unknown parse statement token: ' + gToken.type)
	}
}

function parseBlock(statementType) {
	advance('symbol', L_CURLY, 'beginning of the '+statementType+'\'s block')
	var block = []
	while(!isAhead('symbol', R_CURLY)) {
		advance()
		block.push(parseStatement())
	}
	advance('symbol', R_CURLY, 'end of the '+statementType+' statement\'s block')
	return block
}


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
	gToken = nextToken
	function check(v1, v2) {
		assert(v1 == v2,
			['Expected a', q(type),
				value ? 'of value ' + q(value) : '',
				expressionType ? 'for the ' + expressionType : '',
				'but found a', q(gToken.type),
				'of value', q(gToken.value)].join(' ')
	)}
	if (type) { check(findInArray(type, gToken.type), gToken.type) }
	if (value) { check(findInArray(value, gToken.value), gToken.value) }
}
var isAhead = function(type, value, steps) {
	var token = gTokens[gIndex + (steps || 1)]
	if (!token) { return false }
	if (type && findInArray(type, token.type) != token.type) { return false }
	if (value && findInArray(value, token.value) != token.value) { return false }
	return true
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
			ast = generatorFn(),
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

/**********************
 * Aliases and values *
 **********************/
function parseValueOrAlias() {
	debug('parseValueOrAlias')
	advance()
	switch(gToken.type) {
		case 'name':
		    return parseAliasOrInvocation()
		case 'string':
		case 'number':
			return getLiteralValue()
		case 'symbol':
			if (gToken.value == '<') { return parseXML() }
			else if (gToken.value == L_CURLY || gToken.value == L_ARRAY) { return parseJSON() }
			else { halt('Unexpected symbol "'+gToken.value+'". Expected XML or JSON') }
		case 'keyword':
			if (gToken.value == 'template') { return parseTemplate() }
			else if (gToken.value == 'handler') { return parseHandler() }
			else { halt('Expected keyword of value "template" or "handler" but found "'+gToken.value+'"')}
		default:
			halt('Unexpected value or alias token: ' + gToken.type + ' ' + gToken.value)
	}
}

var parseAliasOrInvocation = astGenerator(function() {
	debug('parseAliasOrInvocation')
	var namespace = parseNamespace()
	if (isAhead('symbol', L_PAREN)) {
		advance('symbol', L_PAREN)
		var args = parseValueList(R_PAREN)
		advance('symbol', R_PAREN)
		return { type:'INVOCATION', namespace:namespace, args:args }
	} else {
		return { type:'ALIAS', namespace:namespace }
	}
})

var getStaticValue = astGenerator(function() {
	debug('getStaticValue')
	assert(gToken.type == 'string' || gToken.type == 'number')
	return { type:'STATIC_VALUE', valueType:gToken.type, value:gToken.value }
})

function parseNamespace() {
	var namespace = []
	while(true) {
		assert(gToken.type == 'name')
		namespace.push(gToken.value)
		if (!isAhead('symbol', '.')) { break }
		advance('symbol', '.')
		advance('name')
	}
	return namespace;
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
		return { type:'XML', tag:tagName, attributes:attributes, content:[] }
	} else {
		var statements = []
		while(true) {
			if (isAhead('symbol', '<') && isAhead('symbol', '/', 2)) { break }
			advance()
			statements.push(parseStatement())
		}
		
		advance('symbol', '<')
		advance('symbol', '/')
		advance('name', tagName, 'matching XML tags')
		// allow for attributes on closing tag, e.g. <button>"Click"</button onClick=handler(){ ... }>
		attributes = attributes.concat(parseXMLAttributes())
		advance('symbol', '>')
		
		return { type:'XML', tag:tagName, attributes:attributes, block:statements }
	}
})
var parseXMLAttributes = function() {
	debug('parseXMLAttributes')
	
	var XMLAttributes = []
	while (isAhead('name')) {
		var assignment = parseAssignment('XML_attribute')
		XMLAttributes.push({ name:assignment[0], value:assignment[1] })
	}
	
	return XMLAttributes
}

function parseAssignment(acceptDotNotation, msg) {
	debug('parseAssignment')
	var namespace
	advance('name', null, msg)
	if (acceptDotNotation) { namespace = parseNamespace() }
	else { namespace = gToken.value }
	advance('symbol', '=', msg)
	var value = parseValueOrAlias()
	return [namespace, value]
}

/****************
 * Declarations *
 ****************/
var parseDeclaration = astGenerator(function() {
	debug('parseDeclaration')
	var assignment = parseAssignment('declaration')
	return { type:'DECLARATION', namespace:assignment[0], value:assignment[1] }
})

/********
 * JSON *
 ********/
function parseJSON() {
	if (gToken.value == L_CURLY) { return parseJSONObject() }
	else { return parseJSONArray() }
}
var parseJSONObject = astGenerator(function() {
	debug('parseJSONObject')
	assert(gToken.type == 'symbol' && gToken.value == L_CURLY)
	var content = []
	while (true) {
		if (isAhead('symbol', R_CURLY)) { break }
		var nameValuePair = {}
		advance(['name','string'])
		nameValuePair.name = gToken.value
		advance('symbol', ':')
		nameValuePair.value = parseValueOrAlias()
		content.push(nameValuePair)
		if (!isAhead('symbol', ',')) { break }
		advance('symbol',',')
	}
	advance('symbol', R_CURLY, 'right curly at the end of the JSON object')
	return { type:'JSON_OBJECT', content:content }
})
var parseJSONArray = astGenerator(function() {
	debug('parseJSONArray')
	assert(gToken.type == 'symbol' && gToken.value == L_ARRAY)
	var content = parseValueList(R_ARRAY)
	advance('symbol', R_ARRAY, 'right bracket at the end of the JSON array')
	return { type:'JSON_ARRAY', content:content }
})
function parseValueList(breakSymbol) {
	var list = []
	while (true) {
		if (isAhead('symbol', breakSymbol)) { break }
		list.push(parseValueOrAlias())
		if (!isAhead('symbol', ',')) { break }
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
	advance('name', null, 'for_loop\'s iterator')
	var iterator = gToken.value
	advance('keyword', 'in', 'for_loop\'s "in" keyword')
	advance('name', null, 'for_loop\'s iterable value')
	var iterable = gToken.value
	advance('symbol', R_PAREN, 'end of for_loop\'s iterator statement')
	
	// parse "{ ... for loop statements ... }"
	var block = parseBlock('for_loop')
	
	return { type:'FOR_LOOP', iterable:iterable, iterator:iterator, block:block }
})

/****************
 * If statement *
 ****************/
var parseIfStatement = astGenerator(function() {
	debug('parseIfStatement')
	
	advance('symbol', L_PAREN, 'beginning of the if statement\'s conditional')
	var condition = parseCondition()
	advance('symbol', R_PAREN, 'end of the if statement\'s conditional')
	
	var ifBlock = parseBlock('if statement')
	
	var elseBlock = null
	if (isAhead('keyword', 'else')) {
		advance('keyword', 'else')
		elseBlock = parseBlock('else statement')
	}
	
	return { type:'IF_STATEMENT', condition:condition, ifBlock:ifBlock, elseBlock:elseBlock }
})
function parseCondition() {
	debug('parseCondition')
	// TODO Parse compond statements, e.g. if (age < 30 && (income > 10e6 || looks=='awesome'))
	var type = gToken.type,
		value = gToken.value
	
	// Only strings, numbers, and aliases allowed
	advance(['string', 'number', 'name'])
	var left = parseStatement()
	
	var comparison, right
	if (isAhead('symbol', ['<','<=','>','>=','=='])) {
		advance('symbol')
		comparison = gToken.value
		advance(['string', 'number', 'name'])
		var right = parseStatement()
	}
	
	return { left:left, comparison:comparison, right:right }
}

/************************
 * Templates & Handlers *
 ************************/
var parseTemplate = astGenerator(function() {
	debug('parseTemplate')
	var callable = parseCallable('template')
	return { type:'TEMPLATE', args:callable[0], block:callable[1] }
})

var parseHandler = astGenerator(function() {
	debug('parseHandler')
	var callable = parseCallable('handler')
	return { type:'HANDLER', args:callable[0], block:callable[1] }
})

function parseCallable(msg) {
	advance('symbol', L_PAREN)
	var args = parseArgumentList()
	advance('symbol', R_PAREN)
	var block = parseBlock(msg)
	return [args, block]
}

function parseArgumentList() {
	debug('parseArgumentList')
	var args = []
	while (true) {
		if (isAhead('symbol', R_PAREN)) { break }
		advance('name')
		args.push(gToken.value)
		if (!isAhead('symbol', ',')) { break }
		advance('symbol', ',')
	}
	return args
}
