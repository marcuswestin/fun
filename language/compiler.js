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

function getHookID() { return unique('dom') }

function getHookCode(parentHook, hookID) {
	hookID = hookID || getHookID()
	return 'fun.getDOMHook('+util.quote(parentHook)+', '+util.quote(hookID)+')'
}

compiler.compile = function(ast) {
	var libraryPath = __dirname + '/lib.js',
		libraryCode, 
		codeOutput
	
	try { libraryCode = fs.readFileSync(libraryPath) }
	catch(e) {
		return { error: "Could not read library file", path: libraryPath, e: e }
	}
	
	var domRootHookID = getHookID()
	
	
	try { codeOutput = compile(domRootHookID, ast) }
	catch(e) {
		return { error: "Could not compile", e: e, ast: ast }
	}
	
	return "(function(){\n"
		+ boxComment("Fun compiled at " + new Date().getTime())
		+ "\n\n" + boxComment("lib.js") + libraryCode
		+ "\n\n" + 'fun.setDOMHook('+util.quote(domRootHookID)+', document.body)'
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
			return util.quote(ast.value)
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
			return getLocalReferenceCode(hookID, ast.value)
		case 'IF_ELSE':
			return getIfElseCode(hookID, ast.condition, ast.ifTrue, ast.ifFalse)
		default:
			return util.quote("UNDEFINED AST TYPE " + ast.type + ": " + JSON.stringify(ast));
	}
}

function getInlineValueCode(parentHook, val) {
	return new util.CodeGenerator()
		.closureStart()
			.assign('hook', getHookCode(parentHook))
			.assign('hook.innerHTML', val)
		.closureEnd()
}

function getLocalReferenceCode(parentHook, property) {
	return new util.CodeGenerator()
		.closureStart()
			.assign('hook', getHookCode(parentHook))
			.code('fin.observeLocal('+util.quote(property)+', function(mut,val){ hook.innerHTML=val })')
		.closureEnd()
}

function getIfElseCode(parentHook, cond, trueAST, elseAST) {
	var ifHookID = getHookID(),
		elseHookID = getHookID(),
		ifHookCode = getHookCode(parentHook, ifHookID),
		elseHookCode = getHookCode(parentHook, elseHookID),
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

