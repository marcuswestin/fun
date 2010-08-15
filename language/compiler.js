var fs = require('fs'),
	util = require('./compile_util'),
	compiler = exports,
	uniqueId = 0,
	referenceTable = {}

function unique(name) { return '_u' + (uniqueId++) + (name ? '_' + name : '') }

function boxComment(msg) {
	var arr = []
	arr.length = msg.length + 2
	return '/*' + arr.join('*') + "**\n"
		+ ' * ' + msg + " *\n"
		+ ' *' + arr.join('*') + "**/\n"
}

compiler.compile = function(ast) {
	var libraryPath = __dirname + '/lib.js',
		libraryCode, 
		codeOutput
	
	try { libraryCode = fs.readFileSync(libraryPath) }
	catch(e) {
		return { error: "Could not read library file", path: libraryPath, e: e }
	}
	
	var domRootHookID = _getHookID()
	
	
	try { codeOutput = compile(domRootHookID, ast) }
	catch(e) {
		return { error: "Could not compile", e: e, ast: ast }
	}
	
	return "(function(){\n"
		+ boxComment("Fun compiled at " + new Date().getTime())
		+ "\n\n" + boxComment("lib.js") + libraryCode
		+ "\n\n" + 'fun.setDOMHook('+util.q(domRootHookID)+', document.body)'
		+ "\n\n" + boxComment("compiled output") + codeOutput
		+ "\n})();"
}

function compile(hookID, ast) {
	if (ast instanceof Array) {
		var result = []
		for (var i=0; i<ast.length; i++) {
			result.push(compile(hookID, ast[i]) + "\n")
		}
		return result.join("")
	} else if (typeof ast == 'object') {
		return _parseExpression(hookID, ast) + "\n"
	}
}

function _parseExpression(hookID, ast) {
	switch (ast.type) {
		case 'STRING':
			return util.q(ast.value)
		case 'NUMBER':
			return ast.value
		case 'DECLARATION':
			if (referenceTable[ast.name]) {
				throw { error: 'Repeat Declaration', name: ast.name }
			}
			var id = unique(ast.name),
				reference = ast.value
			
			referenceTable[ast.name] = { id: id, reference: reference }
			return 'var '+id+' = '+compile(hookID, reference)
		case 'REFERENCE':
			if (!referenceTable[ast.name]) {
				throw { error: 'Undeclared Reference', name: ast.name }
			}
			var name = ast.name,
				reference = referenceTable[ast.name]
			
			return getInlineValueCode(hookID, reference.id)
		case 'INLINE_VALUE':
			return getInlineValueCode(hookID, _parseExpression(hookID, ast.value))
		case 'LOCAL_REFERENCE':
		case 'GLOBAL_REFERENCE':
			return getReferenceCode(ast.type, hookID, ast.value)
		case 'IF_ELSE':
			return getIfElseCode(hookID, ast.condition, ast.ifTrue, ast.ifFalse)
		case 'XML_NODE':
			return getXMLCode(hookID, ast.name, ast.attributes, ast.content)
		default:
			return util.q("UNDEFINED AST TYPE " + ast.type + ": " + JSON.stringify(ast));
	}
}

function getXMLCode(parentHook, tagName, attrList, content) {
	var hook = _getHookID(),
		result = new util.CodeGenerator(),
		attrs = {}
	
	for (var i=0, attr; attr = attrList[i]; i++) {
		var valueAST = attr.value // e.g. STRING, NUMBER
		if (attr.name == 'data') {
			if (tagName == 'input') { result.reflectInput(hook, valueAST) }
		} else {
			attrs[attr.name] = valueAST.value
		}
	}
	
	result.code(_getHookCode(parentHook, hook, tagName, attrs))
	
	return result + compile(hook, content)
}

function getInlineValueCode(parentHook, val) {
	return new util.CodeGenerator()
		.closureStart()
			.assign('hook', _getHookCode(parentHook))
			.assign('hook.innerHTML', val)
		.closureEnd()
}

function getReferenceCode(id, parentHook, property) {
	return new util.CodeGenerator()
		.closureStart()
			.assign('hook', _getHookCode(parentHook))
			.callFunction('fun.observe', util.q(id), util.q(property), 'function(mut,val){ hook.innerHTML=val }')
		.closureEnd()
}

function getIfElseCode(parentHook, cond, trueAST, elseAST) {
	var ifHookID = _getHookID(),
		elseHookID = _getHookID(),
		ifHookCode = _getHookCode(parentHook, ifHookID),
		elseHookCode = _getHookCode(parentHook, elseHookID),
		compareCode = '('+util.getFinCached(cond.left) + cond.comparison + util.getFinCached(cond.right)+')'
	
	return new util.CodeGenerator()
		.closureStart('ifPath', 'elsePath')
			.code(ifHookCode) // force creation of the dom hooks for proper ordering
			.code(elseHookCode)
			.assign('blocker', 'fun.getCallbackBlock(evaluate, {fireOnce: false})')
			.observe(cond.left, 'blocker.addBlock()')
			.observe(cond.right, 'blocker.addBlock()')
			.assign('lastTime', undefined)
			.functionStart('togglePath')
				.assign(ifHookCode+'.style.display', '(lastTime ? "block" : "none")')
				.assign(elseHookCode+'.style.display', '(lastTime ? "none" : "block")')
				.ifElse('lastTime', 'ifPath()', 'elsePath()')
			.functionEnd()
			.functionStart('evaluate')
				.assign('thisTime', compareCode)
				.returnIfEqual('thisTime', 'lastTime')
				.assign('lastTime', 'thisTime')
				.callFunction('togglePath')
			.functionEnd()
		.closureEnd(
			'\nfunction ifPath(){'+compile(ifHookID, trueAST)+'}', 
			'\nfunction elsePath(){'+compile(elseHookID, elseAST)+'}'
		)
}

function _getHookID() { return unique('dom') }
function _getHookCode(parentHook, hookID, tagName, attrs) {
	hookID = hookID || _getHookID()
	attrs = attrs || []
	var attrKVPs = {}
	
	return 'fun.getDOMHook('
		+ util.q(parentHook) + ', '
		+ util.q(hookID) + ', '
		+ util.q(tagName||'span') + ', '
		+ JSON.stringify(attrs) + ')'
}
