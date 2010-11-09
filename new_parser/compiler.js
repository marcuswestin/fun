var fs = require('fs'),
	sys = require('sys'),
	path = require('path'),
	util = require('./util'),
	bind = util.bind,
	map = util.map,
	boxComment = util.boxComment,
	q = util.q

exports.compile = util.intercept('CompileError', function (ast, modules, declarations) {
	// TODO No longer a nead for an entire context object. Just make it hookname, and pass that through
	var context = { hookName: name('ROOT_HOOK') } // root context
	return code(
		';(function funApp() {',
		'	var {{ hookName }} = fun.name("rootHook")',
		'	fun.setHook({{ hookName }}, document.body)',
		'	{{ declarationsCode }}',
		'	{{ code }}',
		'	{{ modules }}',
		'})(); // let\'s kick it',
		{
			hookName: context.hookName,
			declarationsCode: map(declarations, compileDeclaration).join('\n'),
			code: compile(context, ast),
			modules: map(modules, function(module, name) {
				return boxComment('Module: ' + name) + '\n' + module.jsCode }).join('\n\n\n')
		})
})

/************************
 * Top level statements *
 ************************/
function compile(context, ast) {
	assert(context && context.hookName, ast, "compile called with invalid context")
	if (ast instanceof Array) {
		return map(ast, bind(this, compileStatement, context)).join('\n') + '\n'
	} else {
		return compileStatement(context, ast) + '\n'
	}
}

function compileStatement(context, ast) {
	if (!ast) { return '' }
	switch (ast.type) {
		case 'RUNTIME_ITERATOR': // TODO Give types to the runtime iterator values,
		                         // so that list iterators can take other things than static
		                         // for now, fall through to STATIC_VALUE
		case 'STATIC_VALUE':     return compileStaticValue(context, ast)
		case 'ITEM_PROPERTY':    return compileItemProperty(context, ast)
		case 'XML':              return compileXML(context, ast)
		case 'IF_STATEMENT':     return compileIfStatement(context, ast)
		case 'FOR_LOOP':         return compileForLoop(context, ast)
		case 'INVOCATION':       return compileInvocation(context, ast)
		
		case 'ALIAS':            halt(ast, 'Should no longer have alias references in compile stages')
		case 'IMPORT_MODULE':    halt(ast, 'Should no longer have import references in compile stage')
		case 'IMPORT_FILE':      halt(ast, 'Should no longer have import references in compile stage')
		default:                 halt(ast, 'Unknown AST type ' + ast.type)
	}
}

/*****************
 * Static values *
 *****************/
// TODO This should be using Types[ast.value.type].emit(ast.value)
function compileStaticValue(context, ast) {
	return code(
		'fun.hook({{ parentHook }}, fun.name("inlineString")).innerHTML = {{ value }}',
		{
			parentHook: context.hookName,
			value: _getValue(ast)
		})
}

function _getValue(ast) {
	switch(ast.type) {
		case 'STATIC_VALUE':     return q(ast.value)
		case 'RUNTIME_ITERATOR': return ast.name
		default: halt(ast, 'Unknown value type "'+ast.type+'"')
	}
}


/************************
 * Item Property values *
 ************************/
function compileItemProperty(context, ast) {
	assert(ast.property.length > 0, ast, 'Missing property on item reference. "'+ast.namespace[0]+'" should probably be something like "'+ast.namespace[0]+'.foo"')
	assert(ast.property.length == 1, ast, 'TODO: Handle nested property references')
	var hookName = name('ITEM_PROPERTY_HOOK')
	return code(
		'fun.hook({{ parentHook }}, {{ hookName }})',
		'fun.observe({{ type }}, {{ id }}, {{ property }}, function(mutation, value) {',
		'	fun.getHook({{ hookName }}).innerHTML = value',
		'})',
		{
			parentHook: context.hookName,
			hookName: q(hookName),
			id: q(ast.item.id),
			property: q(ast.property[0]),
			type: q('BYTES')
		})
}

/*******
 * XML *
 *******/
function compileXML(context, ast) {
	var nodeHookName = name('XML_HOOK'),
		newContext = util.shallowCopy(context, { hookName:nodeHookName })
	
	var attributes = _handleXMLAttributes(nodeHookName, ast)
	return code(
		'var {{ hookName }} = fun.name()',
		'fun.hook({{ parentHook }}, {{ hookName }}, {{ tagName }}, {{ staticAttributes }})',
		'{{ dynamicAttributesCode }}',
		'{{ childCode }}',
		{
			parentHook: context.hookName,
			hookName: nodeHookName,
			tagName: q(ast.tag),
			staticAttributes: q(attributes.staticAttrs),
			dynamicAttributesCode: attributes.dynamicCode,
			childCode: ast.block ? compile(newContext, ast.block) : ''
		})
}

function _handleXMLAttributes(nodeHookName, ast) {
	var staticAttrs = {}, dynamicCode = []
	for (var i=0, attribute; attribute = ast.attributes[i]; i++) {
		assert(attribute.namespace.length == 1, attribute, 'TODO Handle dot notation attributes')
		var name = attribute.namespace[0],
			value = attribute.value
		_handleXMLAttribute(nodeHookName, ast, staticAttrs, dynamicCode, name, value)
	}
	return { staticAttrs: staticAttrs, dynamicCode: dynamicCode.join('\n') }
}

// modifies staticAttrs and, dynamicCode
function _handleXMLAttribute(nodeHookName, ast, staticAttrs, dynamicCode, name, value) {
	var match
	if (name == 'style') {
		_handleStyleAttribute(nodeHookName, ast, staticAttrs, dynamicCode, name, value)
	} else if (match = name.match(/^on(\w+)$/)) {
		_handleHandlerAttribute(nodeHookName, ast, dynamicCode, match[1], value)
	} else if (value.type == 'STATIC_VALUE') {
		staticAttrs[name] = value.value
	} else {
		assert(value.type != 'NESTED_ALIAS', ast, 'Does not make sense to assign a JSON object literal to other attribtues than "style" (tried to assign to "'+name+'")')
		_handleDynamicAttribute(nodeHookName, ast, dynamicCode, name, value)
	}
}

// modifies staticAttrs and dynamicCode
function _handleStyleAttribute(nodeHookName, ast, staticAttrs, dynamicCode, name, value) {
	assert(value.type == 'NESTED_ALIAS', ast, 'You should assign the style tag to a JSON object, e.g. <div style={width:100,height:100} />')
	for (var i=0, prop; prop = value.content[i]; i++) {
		_handleXMLAttribute(nodeHookName, ast, staticAttrs, dynamicCode, 'style.'+prop.name, prop.value)
	}
}

// modifies dynamicCode
function _handleDynamicAttribute(nodeHookName, ast, dynamicCode, attrName, value) {
	assert(value.property.length == 1, ast, 'TODO: Handle nested item property references')
	dynamicCode.push(code(
		'fun.observe({{ type }}, {{ id }}, {{ property }}, function(mutation, value) {',
		'	fun.attr({{ hookName }}, {{ attr }}, value)',
		'})',
		{
			type: q('BYTES'),
			id: q(value.item.id),
			property: q(value.property[0]),
			attr: q(attrName),
			hookName: nodeHookName
		}))
}

// modifies dynamicCode
function _handleHandlerAttribute(dynamicCode, ast, nodeHookName, handlerName, handler) {
	dynamicCode.push(code(
		'fun.withHook({{ hookName }}, function(hook) {',
		'	fun.on(hook, "{{ handlerName }}", function() {',
		'		console.log("TODO _handleHandlerAttribute - add mutationCode")',
		'	})',
		'})',
		{
			hookName: nodeHookName,
			handlerName: handlerName.toLowerCase()
		}))
}
/**********************
 * If/Else statements *
 **********************/
function compileIfStatement(context, ast) {
	var left = ast.condition.left,
		right = ast.condition.right,
		ifContext = util.shallowCopy(context, { hookName: name('IF_HOOK') }),
		elseContext = util.shallowCopy(context, { hookName: name('ELSE_HOOK') }),
		isDynamic = { left:(left.type == 'ITEM_PROPERTY'), right:(right.type == 'ITEM_PROPERTY') }
	
	return code(
		'var {{ ifHookName }} = fun.name(),',
		'	{{ elseHookName }} = fun.name()',
		';(function(ifBranch, elseBranch) {',
		'	fun.hook({{ parentHookName }}, {{ ifHookName }})',
		'	fun.hook({{ parentHookName }}, {{ elseHookName }})',
		'	var ready = fun.block(evaluate, {fireOnce: false}), lastTime',
		'	{{ leftIsDynamic }} && fun.observe("BYTES", {{ leftID }}, {{ leftProperty }}, ready.addBlock())',
		'	{{ rightIsDynamic }} && fun.observe("BYTES", {{ rightID }}, {{ rightProperty }}, ready.addBlock())',
		'	ready.tryNow()',
		'	function evaluate() {',
		'		var thisTime = {{ leftValue }} {{ comparison }} {{ rightValue }}',
		'		if (lastTime !== undefined && thisTime == lastTime) { return }',
		'		fun.destroyHook(lastTime ? {{ ifHookName }} : {{ elseHookName }})',
		'		lastTime = thisTime',
		'		thisTime ? ifBranch() : elseBranch()',
		'	}',
		'})(',
		'	function() {',
		'		{{ ifCode }}',
		'	},',
		'	function() {',
		'		{{ elseCode }}',
		'	}',
		');',
		{
			parentHookName: context.hookName,
			ifHookName: ifContext.hookName,
			elseHookName: elseContext.hookName,
			leftIsDynamic: isDynamic.left,
			rightIsDynamic: isDynamic.right,
			leftValue: isDynamic.left ? 'fun.cachedValue({{ leftID }}, {{ leftProperty }})' : _getValue(left),
			rightValue: isDynamic.right ? 'fun.cachedValue({{ rightID }}, {{ rightProperty }})' : _getValue(right),
			comparison: ast.condition.comparison,
			leftID: isDynamic.left && q(left.item.id),
			rightID: isDynamic.right && q(right.item.id),
			leftProperty: isDynamic.left && q(left.property[0]),
			rightProperty: isDynamic.right && q(right.property[0]),
			ifCode: compile(ifContext, ast.ifBlock),
			elseCode: ast.elseBlock && compile(elseContext, ast.elseBlock)
		})
}

/*************
 * For loops *
 *************/
function compileForLoop(context, ast) {
	var iteratorName = name('FOR_LOOP_ITERATOR_VALUE'),
		loopContext = util.shallowCopy(context, { hookName:name('FOR_LOOP_EMIT_HOOK') })
	
	ast.iterator.value.name = iteratorName
	
	return code(
		'var {{ loopHookName }} = fun.name()',
		'fun.hook({{ parentHookName }}, {{ loopHookName }})',
		'fun.observe("LIST", {{ itemID }}, {{ propertyName }}, bind(fun, "splitListMutation", onMutation))',
		'function onMutation({{ iteratorName }}) {',
		'	var {{ emitHookName }} = fun.name()',
		'	fun.hook({{ loopHookName }}, {{ emitHookName }})',
		'	{{ loopCode }}',
		'}',
		{
			parentHookName: context.hookName,
			loopHookName: name('FOR_LOOP_HOOK'),
			itemID: q(ast.iterable.item.id),
			propertyName: q(ast.iterable.property[0]),
			iteratorName: iteratorName,
			emitHookName: loopContext.hookName,
			loopCode: compile(loopContext, ast.block)
		})
}

/*************
 * Templates *
 *************/
function compileDeclaration(declaration) {
	switch (declaration.type) {
		case 'TEMPLATE':  return compileTemplateDeclaration(declaration)
		case 'HANDLER':   return compileHandlerDeclaration(declaration)
		default:          return ''
	}
}

function compileTemplateDeclaration(ast) {
	ast.compiledFunctionName = name('TEMPLATE_FUNCTION')
	var hookName = name('TEMPLATE_HOOK')
	return code(
		'function {{ templateFunctionName }}({{ hookName }}) {',
		'	{{ code }}',
		'}',
		{
			templateFunctionName: ast.compiledFunctionName,
			hookName: hookName,
			code: compile({hookName:hookName}, ast.block)
		})
}

function _compileTemplateInvocation(context, invocationAST, templateAST) {
	// ast.args is a list of invocation values/aliases
	assert(invocationAST.args.length == 0, invocationAST, 'TODO Handle template invocation arguments')
	assert(templateAST.signature.length == 0, templateAST, 'TODO Handle template signature')
	return code(
		'{{ templateFunctionName }}({{ hookName }})',
		{
			templateFunctionName: templateAST.compiledFunctionName,
			hookName: context.hookName
		})
}

/************
 * Handlers *
 ************/
function compileHandlerDeclaration(context, ast) {
	return map(ast.block, bind(this, _compileMutationStatement, context)).join('\n')
}

function _compileMutationStatement(context, statementAST) {
	halt(statementAST, 'TODO Compile mutation statements')
}

function _compileHandlerInvocation(context, invocationAST, handlerAST) {
	halt(statementAST, 'TODO Compile handler invocation')
}

/****************************************
 * Invocations (handlers and templates) *
 ****************************************/
function compileInvocation(context, ast) {
	switch(ast.invocable.type) {
		case 'TEMPLATE': return _compileTemplateInvocation(context, ast, ast.invocable)
		case 'HANDLER':  return _compileHandlerInvocation(context, ast, ast.invocable)
		default:         halt(ast, 'Couldn\'t invoce the value of type "'+ast.type+'". Expected a template or a handler.')
	}
}

/*********************
 * Utility functions *
 *********************/
function name(readable) { return '_' + (readable || '') + '$' + (name._uniqueId++) }
name._uniqueId = 0

var emitReplaceRegex = /{{\s*(\w+)\s*}}/
function code(/* line1, line2, line3, ..., lineN, optionalValues */) {
	var argsLen = arguments.length,
		lastArg = arguments[argsLen - 1],
		injectObj = (typeof lastArg == 'string' ? null : lastArg),
		snippets = Array.prototype.slice.call(arguments, 0, injectObj ? argsLen - 1 : argsLen),
		code = '\n' + snippets.join('\n'),
		match
	
	while (match = code.match(emitReplaceRegex)) {
		var wholeMatch = match[0],
			nameMatch = match[1],
			value = injectObj[nameMatch]
		code = code.replace(wholeMatch, typeof value == 'undefined' ? 'MISSING INJECT VALUE' : value)
	}
	return code
}

var CompileError = function(file, ast, msg) {
	this.name = "CompileError"
	this.message = ['on line', ast.line + ',', 'column', ast.column, 'of', '"'+file+'":', msg].join(' ')
}
CompileError.prototype = Error.prototype

var assert = function(ok, ast, msg) { if (!ok) halt(ast, msg) }
var halt = function(ast, msg) {
	if (ast.file) { sys.puts(util.grabLine(ast.file, ast.line, ast.column, ast.span)) }
	throw new CompileError(ast.file, ast, msg)
}
