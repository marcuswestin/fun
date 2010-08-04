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

	try { codeOutput = compile(ast) }
	catch(e) {
		return { error: "Could not compile", e: e, ast: ast }
	}
	
	return "(function(){\n"
		+ boxComment("Fun compiled at " + new Date().getTime())
		+ "\n\n" + boxComment("lib.js") + libraryCode
		+ "\n\n" + boxComment("compiled output") + codeOutput
		+ "\n})();"
}

function compile(ast) {
	if (ast instanceof Array) {
		var result = []
		for (var i=0; i<ast.length; i++) {
			result.push(compile(ast[i]) + "\n")
		}
		return result.join("")
	} else if (typeof ast == 'object') {
		return _parseExpression(ast) + "\n"
	}
}

function _parseExpression(ast) {
	switch (ast.type) {
		case 'STRING':
			return '"' + ast.value + '"'
		case 'NUMBER':
			return ast.value
		case 'DECLARATION':
			if (referenceTable[ast.name]) {
				throw { error: 'Repeat Declaration', name: ast.name }
			}
			var id = unique(ast.name),
				reference = ast.value
			
			referenceTable[ast.name] = { id: id, reference: reference }
			return ['var', id, '=', compile(reference)].join(' ')
		case 'REFERENCE':
			if (!referenceTable[ast.name]) {
				throw { error: 'Undeclared Reference', name: ast.name }
			}
			var name = ast.name,
				reference = referenceTable[ast.name]
			
			return getInlineValueCode(reference.id)
		case 'INLINE_VALUE':
			return getInlineValueCode(_parseExpression(ast.value))
		case 'LOCAL_REFERENCE':
			return getLocalReferenceCode(ast.value)
		case 'IF_ELSE':
			return getIfElseCode(ast.condition, ast.ifTrue, ast.ifFalse)
		default:
			return "'UNDEFINED AST TYPE " + ast.type + ": " + JSON.stringify(ast) + "'";
	}
}

function getInlineValueCode(val) {
	return new util.CodeGenerator()
		.closureStart()
			.assign('hook', 'fun.getDomHook()')
			.assign('hook.innerHTML', val)
		.closureEnd()
}

function getLocalReferenceCode(property) {
	return new util.CodeGenerator()
		.closureStart()
			.assign('hook', 'fun.getDomHook()')
			.code('fin.observeLocal('+util.quote(property)+', function(mut,val){ hook.innerHTML=val })')
		.closureEnd()
}

function getIfElseCode(cond, trueAST, elseAST) {
	var compareCode = '('+util.getFinCached(cond.left) + cond.comparison + util.getFinCached(cond.right)+')'
	return new util.CodeGenerator()
		.closureStart('ifPath', 'elsePath')
			.assign('blocker', 'fun.getCallbackBlock(evaluate)')
			.observe(cond.left, 'blocker.addBlock()')
			.observe(cond.right, 'blocker.addBlock()')
			.assign('lastTime', undefined)
			.funcStart('evaluate')
				.assign('thisTime', compareCode)
				.returnIfEqual('thisTime', 'lastTime')
				.assign('lastTime', 'thisTime')
				.ifElse('thisTime', 'ifPath()', 'elsePath()')
			.funcEnd()
		.closureEnd('function(){'+compile(trueAST)+'}', 'function(){'+compile(elseAST)+'}')
}

