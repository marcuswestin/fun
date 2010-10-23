var util = require('./util'),
	assert = util.assert
	q = util.q,
	debug = util.debug

var LPAREN = '(',
    RPAREN = ')',
    LBLOCK = '{',
    RBLOCK = '}'

var gToken, gIndex, gTokens, gState, gAST

exports.parse = function(tokens) {
	gTokens = tokens
	gIndex = -1
	gToken = null
	gAST = []
	
	while (true) {
		advance()
		if (gIndex == gTokens.length) { break }
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
			return parseXML() // only XML statements begin with a symbol (<)
		case 'name':
		    switch (gToken.value) {
        		case 'let': return parseDeclaration()
				case 'for': return parseForLoop()
				case 'if': return parseIfStatement()
				default: return getAlias()
			}
		
		default:
			throw new Error('Unknown parse statement token: ' + JSON.stringify(gToken))
	}
}

/*******************
 * Utility methods *
 *******************/
var advance = function(type, value, expressionType) {
	gToken = gTokens[++gIndex]
	function check(v1, v2) {
		assert.equal(v1, v2,
			['Expected the', q(type),
				value ? 'of value ' + q(value) : '',
				expressionType ? 'for the ' + expressionType : '',
				'on line:', gToken.line,
				'column:', gToken.column,
				'but found a', q(gToken.type),
				'of value', q(gToken.value)].join(' ')
	)}
	if (type) { check(type, gToken.type) }
	if (value) {
		if (value instanceof Array) { for (var i=0, val; val=value[i]; i++) {
			if (val != gToken.value) { continue }
			value = val // allow for the check to pass if one of the values passed in matches
			break
		}}
		check(value, gToken.value)
	}
}
var peek = function(amount) { return gTokens[gIndex + (amount || 1)] }
var isAhead = function(amount, type, value) {
	var token = gTokens[gIndex + amount]
	if (type && type != token.type) { return false }
	if (value && value != token.value) { return false }
	return true
}

/******************************
 * Aliases and literal values *
 ******************************/
function getAlias() {
	assert(gToken.type == 'name')
	// TODO Parse dot notation
	return { type:'ALIAS', name:gToken.value }
}

function getLiteralValue() {
	assert(gToken.type == 'string' || gToken.type == 'number')
	return { type:gToken.type.toUpperCase(), value:gToken.value }
}

 

/*******
 * XML *
 *******/
var parseXML = function() {
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
			if (isAhead(1, 'symbol', '<') && isAhead(2, 'symbol', '/')) { break }
			advance()
			statements.push(parseStatement())
		}
		
		advance('symbol', '<')
		advance('symbol', '/')
		advance('name', tagName, 'matching XML tags')
		advance('symbol', '>')
		
		return { type:'XML', tag:tagName, attributes:attributes, block:statements }
	}
}

var parseXMLAttributes = function() {
	debug('parseXMLAttributes')
	if (!peek('name')) { return [] } // no attributes
}

/****************
 * Declarations *
 ****************/
function parseDeclaration() {
	debug('parseDeclaration')
	advance('name', null, 'declaration')
	var name = gToken.value
	advance('symbol', '=', 'declaration')
	value = parseDeclarable()
	return { type:'DECLARATION', name:name, value:value }
}
function parseDeclarable() {
	debug('parseDeclarable')
	advance()
	switch(gToken.type) {
		case 'name':
		    return getAlias()
		case 'symbol':
			// TODO Parse JSON literal
			return parseXML()
		case 'string':
		case 'number':
			return getLiteralValue()
		default:
			throw new Error('Unkown declarable token: ' + JSON.stringify(gToken))
	}
}

/*************
 * For loops *
 *************/
function parseForLoop() {
	debug('parseForLoop')
	throw new Error("For loops are not yet implemented")
}

/****************
 * If statement *
 ****************/
function parseIfStatement() {
	debug('parseIfStatement')
	
	advance('symbol', LPAREN, 'beginning of the if statement\'s conditional')
	var condition = parseCondition()
	advance('symbol', RPAREN, 'end of the if statement\'s conditional')
	
	advance('symbol', LBLOCK, 'beginning of the if statement\'s block')
	var statements = []
	while(true) {
		if (isAhead(1, 'symbol', RBLOCK)) { break }
		advance()
		statements.push(parseStatement())
	}
	advance('symbol', RBLOCK, 'end of the if statement\'s block')
	
	return { type:'IF_STATEMENT', condition:condition, block:statements }
}

function parseCondition() {
	// TODO Implement condition parsing
	advance()
	return {}
}
