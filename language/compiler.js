var fs = require('fs'),
	util = require('./compile_util'),
	compiler = exports

compiler.compile = function(ast) {
	var libraryPath = __dirname + '/lib.js',
		libraryCode,
		codeOutput
	
	try { libraryCode = fs.readFileSync(libraryPath).toString() }
	catch(e) { return {error: "Could not read library file", path: libraryPath, e: e} }
	
	var rootContext = {
		hookName: util.getName(),
		referenceTable: {}
	}
	
	try { codeOutput = compile(rootContext, ast) }
	catch(e) { return {error: "Could not compile", e: e} }
	
	return new util.CodeGenerator()
		.newline(2)
			.boxComment("Fun compiled at " + new Date().getTime())
		.newline(2)
			.boxComment("lib.js")
			.code(libraryCode)
		.newline(2)
			.boxComment("Compiled output: ")
			.declareHook(rootContext.hookName)
			.code('fun.setDOMHook('+rootContext.hookName+', document.body)')
			.code(codeOutput)
}

function compile(context, ast) {
	util.assert(context && context.hookName && context.referenceTable,
		"compile called with invalid context", {context:context})
	if (ast instanceof Array) {
		var result = []
		for (var i=0; i<ast.length; i++) {
			result.push(compile(context, ast[i]) + "\n")
		}
		return result.join("")
	} else if (typeof ast == 'object') {
		return compileFunStatement(context, ast) + "\n"
	}
}

function compileFunStatement(context, ast) {
	switch (ast.type) {
		case 'STRING':
			return util.q(ast.value)
		case 'NUMBER':
			return ast.value
		case 'DECLARATION':
			util.setReference(context, ast.name, ast.value)
			return ''
		case 'INLINE_VALUE':
			return getInlineValueCode(context, compileFunStatement(context, ast.value))
		case 'REFERENCE':
			return getReferenceCode(context, ast)
		case 'IF_ELSE':
			return getIfElseCode(context, ast)
		case 'FOR_LOOP':
			return getForLoopCode(context, ast)
		case 'XML_NODE':
			return getXMLCode(context, ast)
		default:
			return util.q("UNDEFINED AST TYPE " + ast.type + ": " + JSON.stringify(ast));
	}
}

/**************
 * Inline XML *
 **************/
function getXMLCode(context, ast) {
	var tagName = ast.name,
		attrList = ast.attributes,
		content = ast.content
	
	var hookName = util.getName(),
		result = new util.CodeGenerator(),
		newContext = util.copy(context, {hookName: hookName}),
		attrs = {}
	
	result.declareHook(hookName)

	for (var i=0, attr; attr = attrList[i]; i++) {
		var value = getRefered(context, attr.value) // e.g. STRING, NUMBER
		if (attr.name == 'data') {
			if (tagName == 'input') { result.reflectInput(hookName, value) }
			else if (tagName == 'checkbox') { } // TODO
		} else if (attr.name == 'style') {
			util.assert(value.type == 'JSON_OBJECT', 'Style attribute must be JSON', {type: value.type})
			handleXMLStyle(newContext, value.content, attrs, result)
		} else if (attr.name == 'onClick') {
			util.assert(value.type == 'HANDLER', 'Handler attribute must be a HANDLER', {type: value})
			handleXMLOnClick(newContext, value.args, value.code, result)
		} else if (attr.value.type == 'REFERENCE') {
			result.bindAttribute(hookName, attr.name, attr.value)
		} else {
			attrs[attr.name] = value.value
		}
	}
	
	return result
		.createHook(context.hookName, hookName, tagName, attrs)
		.code(compile(newContext, content))
}

function handleXMLOnClick(context, args, mutationStatements, result) {
	var hookName = context.hookName,
		mutationCode = new util.CodeGenerator()
	for (var i=0, statement; statement = mutationStatements[i]; i++) {
		var target = statement.target
		util.assert(statement.type == 'MUTATION', 
			'Handler code should be mutation statements',{code:mutationStatements})
		util.assert(target.type == 'REFERENCE' && target.referenceType != 'ALIAS',
			'Target in mutation should be a local or a global data object', {target: target})
		mutationCode.mutate(statement.mutationType, target, getRefered(context, statement.source))
	}
	
	result
		.withHookStart(hookName, 'hook')
			.assign('hook.onclick', 'function(){')
				.code(mutationCode)
			.code('}')
		.withHookEnd()
}

function handleXMLStyle(context, styles, targetAttrs, result) {
	var hookName = context.hookName
	targetAttrs.style = ''
	for (var key in styles) {
		var styleRule = styles[key],
			styleValue = styleRule.value,
			styleType = styleRule.type
		
		if (styleType == 'REFERENCE') {
			result.bindStyle(hookName, key, styleRule)
		} else {
			var postfix = (styleType == 'NUMBER' ? 'px' : '')
			targetAttrs.style += key+':'+styleValue + postfix+'; '
		}
	}
}

/*************************
 * Values and References *
 *************************/
function getReferenceCode(context, ast) {
	if (ast.referenceType == "ALIAS") {
		var ref = util.getReference(context, ast.name),
			nameOrStr = ref.name ? ref.name : util.q(ref.value)
		return getInlineValueCode(context, nameOrStr)
	} else {
		return getObservationCode(context, ast)
	}
}

function getInlineValueCode(context, val) {
	var hookName = util.getName()
	return new util.CodeGenerator()
		.declareHook(hookName)
		.code(util.getHookCode(context.hookName, hookName), '.innerHTML=', val)
}

function getRefered(context, value) {
	if (value.type == 'REFERENCE' && value.referenceType == 'ALIAS') {
		return util.getReference(context, value.name)
	} else {
		return value
	}
}

function getObservationCode(context, reference) {
	var value = getRefered(context, reference),
		parentHookName = context.hookName,
	    hookName = util.getName()
	
	util.assertType(value, util.BYTES)
	
	return new util.CodeGenerator()
		.declareHook(hookName)
		.closureStart()
			.assign('hook', util.getHookCode(parentHookName, hookName))
			.callFunction('fun.observe', 
				util.q(value.valueType),
				util.q(value.referenceType), 
				util.q(value.value), 
				'function(mut,val){ hook.innerHTML=val }')
		.closureEnd()
}

/************************
 * If/Else control flow *
 ************************/
function getIfElseCode(context, ast) {
	var parentHook = context.hookName,
		cond = ast.condition,
		trueAST = ast.ifTrue,
		elseAST = ast.ifFalse
	
	util.assert((cond.comparison && cond.left && cond.right) || cond.expression, 'Conditionals must have either an expression or a comparison with left and right parameters')
	
	var ifContext = util.copy(context, { hookName: util.getName() }),
		elseContext = util.copy(context, { hookName: util.getName() }),
		ifHookCode = util.getHookCode(parentHook, ifContext.hookName),
		elseHookCode = util.getHookCode(parentHook, elseContext.hookName),
		compareCode
	
	var result = new util.CodeGenerator()
		.declareHook(ifContext.hookName)
		.declareHook(elseContext.hookName)
		.closureStart('ifPath', 'elsePath')
			.code(ifHookCode) // force creation of the dom hooks for proper ordering
			.code(elseHookCode)
	
	if (cond.comparison) {
		compareCode = '('+util.getCachedValue(cond.left) + cond.comparison + util.getCachedValue(cond.right)+')'
		result
			.assign('blocker', 'fun.getCallbackBlock(evaluate, {fireOnce: false})')
			.observe(cond.left, 'blocker.addBlock()')
			.observe(cond.right, 'blocker.addBlock()')
	} else {
		compareCode = '('+util.getCachedValue(cond.expression)+')'
		result
			.observe(cond.expression, 'evaluate')
	}
	
	result
			.assign('lastTime', undefined)
			.functionStart('togglePath')
				.code('fun.destroyHook(lastTime ? '+elseContext.hookName+' : '+ifContext.hookName+')')
				.ifElse('lastTime', 'ifPath()', 'elsePath()')
			.functionEnd()
			.functionStart('evaluate')
				.assign('thisTime', compareCode)
				.returnIfEqual('!!thisTime', '!!lastTime')
				.assign('lastTime', 'thisTime')
				.callFunction('togglePath')
			.functionEnd()
		.closureEnd(
			'\nfunction ifPath(){'+compile(ifContext, trueAST)+'}', 
			'\nfunction elsePath(){'+compile(elseContext, elseAST)+'}'
		)
	
	return result
}

/*************************
 * For loop control flow *
 *************************/

function getForLoopCode(context, ast) {
	var parentHookName = context.hookName,
		list = getRefered(context, ast.list),
		codeAST = ast.code,
		loopHookName = util.getName(),
		emitHookName = util.getName(true),
		valueName = util.getName(),
		loopContext = util.copy(context, {hookName: emitHookName})
	
	util.assertType(list, 'list')
	
	loopContext.referenceTable = {}
	loopContext.referenceTable.__proto__ = context.referenceTable
	util.setReference(loopContext, ast.key, {name: valueName})
	
	// Create new context with referenceTable prototyping the current context's reference table
	return new util.CodeGenerator()
		.closureStart()
			.declareHook(loopHookName)
			.createHook(parentHookName, loopHookName)
			.observe(list, 'onMutation')
			.functionStart('onMutation', 'mutation')
				.code('fun.handleListMutation(mutation, function('+valueName+') {')
					.declareHook(emitHookName)
					.callFunction('fun.getDOMHook', loopHookName, emitHookName)
					.code(compile(loopContext, codeAST))
				.code('})')
			.functionEnd()
		.closureEnd()
}

