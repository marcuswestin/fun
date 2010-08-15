var fs = require('fs'),
	util = require('./compile_util'),
	compiler = exports,
	referenceTable = {}

compiler.compile = function(ast) {
	var libraryPath = __dirname + '/lib.js',
		libraryCode, 
		codeOutput
	
	try { libraryCode = fs.readFileSync(libraryPath) }
	catch(e) {
		return { error: "Could not read library file", path: libraryPath, e: e }
	}
	
	var domRootHookID = util.getHookID()
	
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

function boxComment(msg) {
	var arr = []
	arr.length = msg.length + 2
	return '/*' + arr.join('*') + "**\n"
		+ ' * ' + msg + " *\n"
		+ ' *' + arr.join('*') + "**/\n"
}

function compile(hookID, ast) {
	if (ast instanceof Array) {
		var result = []
		for (var i=0; i<ast.length; i++) {
			result.push(compile(hookID, ast[i]) + "\n")
		}
		return result.join("")
	} else if (typeof ast == 'object') {
		return compileFunStatement(hookID, ast) + "\n"
	}
}

function compileFunStatement(hookID, ast) {
	switch (ast.type) {
		case 'STRING':
			return util.q(ast.value)
		case 'NUMBER':
			return ast.value
		case 'DECLARATION':
			if (referenceTable[ast.name]) {
				throw { error: 'Repeat Declaration', name: ast.name }
			}
			var id = util.unique(ast.name),
				reference = ast.value
			
			referenceTable[ast.name] = { id: id, reference: reference }
			return 'var '+id+' = '+compile(hookID, reference)
		case 'INLINE_VALUE':
			return getInlineValueCode(hookID, compileFunStatement(hookID, ast.value))
		case 'REFERENCE':
			if (ast.referenceType == 'ALIAS') {
				return getAliasCode(hookID, ast.name, reference.id)
			} else {
				return getReferenceCode(ast.referenceType, hookID, ast.value)
			}
		case 'IF_ELSE':
			return getIfElseCode(hookID, ast.condition, ast.ifTrue, ast.ifFalse)
		case 'XML_NODE':
			return getXMLCode(hookID, ast.name, ast.attributes, ast.content)
		default:
			return util.q("UNDEFINED AST TYPE " + ast.type + ": " + JSON.stringify(ast));
	}
}

function getRefered(value) {
	if (value.type == 'REFERENCE' && value.referenceType == 'ALIAS') {
		return referenceTable[value.name].reference
	} else {
		return value
	}
}

function getXMLCode(parentHook, tagName, attrList, content) {
	var hook = util.getHookID(),
		result = new util.CodeGenerator(),
		attrs = {}
	
	for (var i=0, attr; attr = attrList[i]; i++) {
		var valueAST = getRefered(attr.value) // e.g. STRING, NUMBER
		if (attr.name == 'data') {
			if (tagName == 'input') { result.reflectInput(hook, valueAST) }
			else if (tagName == 'checkbox') { } // TODO
		} else if (attr.name == 'style') {
			if (valueAST.type != 'JSON') {
				throw { error: 'Style attribute must be JSON', type: valueAST.type }
			}
			handleXMLStyle(hook, valueAST.content, attrs, result)
		} else {
			
			attrs[attr.name] = valueAST.value
		}
	}
	
	result.createHook(parentHook, hook, tagName, attrs)
	
	return result + compile(hook, content)
}

function handleXMLStyle(hook, styles, targetAttrs, result) {
	targetAttrs.style = ''
	for (var styleName in styles) {
		var styleRule = styles[styleName],
			styleValue = styleRule.value,
			styleType = styleRule.type
		
		if (styleType == 'REFERENCE') {
			result.bindStyle(hook, styleName, styleRule)
		} else if (styleType == 'NUMBER') {
			targetAttrs.style += styleName+':'+styleValue+'px; '
		} else {
			targetAttrs.style += styleName+':'+styleValue+'; '
		}
	}
}

function getAliasCode(hookID, name, referenceID) {
	if (!referenceTable[name]) {
		throw { error: 'Undeclared Reference', name: name }
	}
	var reference = referenceTable[name]
	return getInlineValueCode(hookID, referenceID)
}

function getInlineValueCode(parentHook, val) {
	return new util.CodeGenerator()
		.closureStart()
			.assign('hook', util.getHookCode(parentHook))
			.assign('hook.innerHTML', val)
		.closureEnd()
}

function getReferenceCode(refType, parentHook, property) {
	return new util.CodeGenerator()
		.closureStart()
			.assign('hook', util.getHookCode(parentHook))
			.callFunction('fun.observe', util.q(refType), util.q(property), 'function(mut,val){ hook.innerHTML=val }')
		.closureEnd()
}

function getIfElseCode(parentHook, cond, trueAST, elseAST) {
	var ifHookID = util.getHookID(),
		elseHookID = util.getHookID(),
		ifHookCode = util.getHookCode(parentHook, ifHookID),
		elseHookCode = util.getHookCode(parentHook, elseHookID),
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
