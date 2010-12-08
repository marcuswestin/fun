var fs = require('fs'),
	sys = require('sys'),
	path = require('path'),
	util = require('./util'),
	Types = require('./Types'),
	Tags = require('./Tags'),
	bind = util.bind,
	map = util.map,
	pick = util.pick,
	name = util.name,
	boxComment = util.boxComment,
	q = util.q

exports.compile = util.intercept('CompileError', function (ast, modules, declarations) {
	// TODO No longer a nead for an entire context object. Just make it hookname, and pass that through
	var context = { hookName: name('ROOT_HOOK') } // root context
	return code(ast,
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
	assert(ast, context && context.hookName, "compile called with invalid context")
	if (ast instanceof Array) {
		return map(ast, bind(this, compileStatement, context)).join('\n') + '\n'
	} else {
		return compileStatement(context, ast) + '\n'
	}
}

function compileStatement(context, ast) {
	if (!ast) { return '' }
	switch (ast.type) {
		case 'STATIC_VALUE':     return compileStaticValue(context, ast)
		case 'ITEM_PROPERTY':    return compileItemProperty(context, ast)
		case 'RUNTIME_ITERATOR': return compileRuntimeIterator(context, ast);
		case 'XML':              return compileXML(context, ast)
		case 'IF_STATEMENT':     return compileIfStatement(context, ast)
		case 'FOR_LOOP':         return compileForLoop(context, ast)
		case 'INVOCATION':       return compileInvocation(context, ast)
		case 'DEBUGGER':         return 'debugger'
		
		default:                 halt(ast, 'Unknown AST type ' + ast.type)
	}
}

function compileRuntimeIterator(context, ast) {
	// TODO this function assumes that the iterable is an item property.
	//  It would be nice if it could be a static inline-defined list
	if (ast.iterable.type == 'ITEM_PROPERTY') {
		return compileItemProperty(context, ast)
	} else {
		console.log(ast); UNKNOWN_ITERABLE_TYPE
	}
}

/*****************
 * Static values *
 *****************/
// TODO This should be using Types[ast.value.type].emit(ast.value)
function compileStaticValue(context, ast) {
	return code(ast,
		'fun.hook(fun.name("inlineString"), {{ parentHook }}).innerHTML = {{ value }}',
		{
			parentHook: context.hookName,
			value: _getValue(ast)
		})
}

function _getValue(ast) {
	switch(ast.type) {
		case 'STATIC_VALUE':     return q(ast.value)
		case 'RUNTIME_ITERATOR': return ast.name
		case 'LIST':             return q(ast.content)
		case 'ITEM_PROPERTY':    return 'fun.cachedValue('+q(ast.item.id)+','+q(ast.property.join('.'))+')'
		default:                 console.log(ast); UNKNOWN_AST_TYPE
	}
}

function _getItemID(ast) {
	switch(ast.type) {
		case 'RUNTIME_ITERATOR':
			assert(ast, ast.iterable.type == 'ITEM_PROPERTY', '_getItemID expects ITEM_PROPERTY runtime iterators but found a "'+ast.iterable.type+'"')
			return ast.runtimeName
		case 'ITEM_PROPERTY':
			return q(ast.item.id)
		default:
			console.log(ast); UNKNOWN_AST_TYPE
	}
}

function _getPropertyName(ast) {
	switch(ast.type) {
		case 'RUNTIME_ITERATOR':
			assert(ast, ast.iterable.type == 'ITEM_PROPERTY', '_getPropertyName expects ITEM_PROPERTY runtime iterators but found a "'+ast.iterable.type+'"')
			return q(ast.iteratorProperty)
		case 'ITEM_PROPERTY':
			return q(ast.property.join('.'))
		default:
			console.log(ast); UNKNOWN_AST_TYPE
	}
}

/************************
 * Item Property values *
 ************************/
function compileItemProperty(context, ast) {
	return code(ast,
		'var {{ hookName }} = fun.name()',
		'fun.hook({{ hookName }}, {{ parentHook }})',
		'fun.observe({{ type }}, {{ id }}, {{ property }}, function(mutation, value) {',
		'	fun.getHook({{ hookName }}).innerHTML = value',
		'})',
		{
			hookName: name('ITEM_PROPERTY_HOOK'),
			parentHook: context.hookName,
			id: _getItemID(ast),
			property: _getPropertyName(ast),
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
	return code(ast,
		'var {{ hookName }} = fun.name()',
		'fun.hook({{ hookName }}, {{ parentHook }}, { tagName:{{ tagName }}, attrs:{{ staticAttributes }} })',
		'{{ dynamicAttributesCode }}',
		'{{ childCode }}',
		{
			parentHook: context.hookName,
			hookName: nodeHookName,
			tagName: q(ast.tagName),
			staticAttributes: q(attributes.staticAttrs),
			dynamicAttributesCode: attributes.dynamicCode,
			childCode: ast.block ? compile(newContext, ast.block) : ''
		})
}

function _handleXMLAttributes(nodeHookName, ast) {
	var staticAttrs = {}, dynamicCode = []
	for (var i=0, attribute; attribute = ast.attributes[i]; i++) {
		assert(attribute, attribute.namespace.length == 1, 'TODO Handle dot notation attributes')
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
	} else if (name == 'data') {
		_handleDataAttribute(nodeHookName, ast, dynamicCode, value)
	} else if (match = name.match(/^on(\w+)$/)) {
		_handleHandlerAttribute(nodeHookName, ast, dynamicCode, match[1], value)
	} else if (value.type == 'STATIC_VALUE') {
		staticAttrs[name] = value.value
	} else {
		assert(ast, value.type != 'NESTED_ALIAS', 'Does not make sense to assign a JSON object literal to other attribtues than "style" (tried to assign to "'+name+'")')
		_handleDynamicAttribute(nodeHookName, ast, dynamicCode, name, value)
	}
}

// modifies staticAttrs and dynamicCode
function _handleStyleAttribute(nodeHookName, ast, staticAttrs, dynamicCode, name, value) {
	assert(ast, value.type == 'NESTED_ALIAS', 'You should assign the style tag to a JSON object, e.g. <div style={width:100,height:100} />')
	for (var i=0, prop; prop = value.content[i]; i++) {
		_handleXMLAttribute(nodeHookName, ast, staticAttrs, dynamicCode, 'style.'+prop.name, prop.value)
	}
}

// modifies dynamicCode
function _handleDataAttribute(nodeHookName, ast, dynamicCode, value) {
	dynamicCode.push(code(ast,
		'fun.withHook({{ hookName }}, function(hook) {',
		'	fun.on(hook, "keypress", function() {',
		'		setTimeout(function() {',
		'			fun.mutate("set", {{ itemID }}, {{ property }}, [hook.value])',
		'		}, 0)',
		'	})',
		'	fun.observe("BYTES", {{ itemID }}, {{ property }}, function(mutation, value) {',
		'		hook.value = value',
		'	})',
		'})',
		{
			hookName: nodeHookName,
			itemID: _getItemID(value),
			property: _getPropertyName(value)
		}))
}

// modifies dynamicCode
function _handleDynamicAttribute(nodeHookName, ast, dynamicCode, attrName, value) {
	assert(ast, value.property.length == 1, 'TODO: Handle nested item property references')
	dynamicCode.push(code(ast,
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
function _handleHandlerAttribute(nodeHookName, ast, dynamicCode, handlerName, handlerAST) {
	var handlerFunctionCode
	if (handlerAST.compiledFunctionName) {
		handlerFunctionCode = handlerAST.compiledFunctionName
	} else {
		handlerFunctionCode = compileHandlerDeclaration(handlerAST)
	}
	dynamicCode.push(code(ast,
		'fun.withHook({{ hookName }}, function(hook) {',
		'	fun.on(hook, "{{ handlerName }}", {{ handlerFunctionCode }})',
		'})',
		{
			hookName: nodeHookName,
			handlerName: handlerName.toLowerCase(),
			handlerFunctionCode: handlerFunctionCode
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
		isDynamic = { left:(left.type == 'ITEM_PROPERTY'), right:(right ? right.type == 'ITEM_PROPERTY' : false) }
	
	return code(ast,
		'var {{ ifHookName }} = fun.name(),',
		'	{{ elseHookName }} = fun.name()',
		';(function(ifBranch, elseBranch) {',
		'	fun.hook({{ ifHookName }}, {{ parentHookName }})',
		'	fun.hook({{ elseHookName }}, {{ parentHookName }})',
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
			rightValue: isDynamic.right ? 'fun.cachedValue({{ rightID }}, {{ rightProperty }})' : right ? _getValue(right) : null,
			comparison: ast.condition.comparison || '||', // if there is no comparison/right side, just use OR
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
	var loopContext = util.shallowCopy(context, { hookName:name('FOR_LOOP_EMIT_HOOK') })
	
	return code(ast,
		'var {{ loopHookName }} = fun.name()',
		'fun.hook({{ loopHookName }}, {{ parentHook }})',
		'fun.observe("LIST", {{ itemID }}, {{ propertyName }}, bind(fun, "splitListMutation", onMutation))',
		'function onMutation({{ iteratorRuntimeName }}, op) {',
		'	var {{ emitHookName }} = fun.name()',
		'	fun.hook({{ emitHookName }}, {{ loopHookName }}, { prepend: (op=="unshift") })',
		'	{{ loopCode }}',
		'}',
		{
			parentHook: context.hookName,
			loopHookName: name('FOR_LOOP_HOOK'),
			itemID: q(ast.iterable.item.id),
			propertyName: q(ast.iterable.property.join('.')),
			iteratorRuntimeName: ast.iteratorRuntimeName,
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
		default:          halt(declaration, 'Found declaration that requires compilation of unknown type')
	}
}

function compileTemplateDeclaration(ast) {
	assert(ast, !ast.compiledFunctionName, 'Tried to compile the same template twice')
	ast.compiledFunctionName = name('TEMPLATE_FUNCTION')
	var hookName = name('TEMPLATE_HOOK')
	return code(ast,
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
	assert(invocationAST, invocationAST.args.length == 0, 'TODO Handle template invocation arguments')
	assert(templateAST, templateAST.signature.length == 0, 'TODO Handle template signature')
	return code(templateAST,
		'{{ templateFunctionName }}({{ hookName }})',
		{
			templateFunctionName: templateAST.compiledFunctionName,
			hookName: context.hookName
		})
}

function compileMutationItemCreation(ast) {
	// get the item creation property values -> fun.create({ prop1:val1, prop2:val2, ... })
	//  TODO: do we need to wait for promises for the values that are itemProperties?
	var propertiesCode = pick(ast.properties.content, function(prop) {
		return prop.name + ':' + _getValue(prop.value)
	}).join(',')
	
	ast.promiseName = name('ITEM_CREATION_PROMISE')
	return code(ast,
		'var {{ promiseName }} = fun.create({ {{ propertiesCode }} })',
		{
			promiseName: ast.promiseName,
			propertiesCode: propertiesCode
		})
}

/************
 * Handlers *
 ************/
function compileHandlerDeclaration(ast) {
	assert(ast, !ast.compiledFunctionName, 'Tried to compile the same handler twice')
	ast.compiledFunctionName = name('HANDLER_FUNCTION')
	var hookName = name('HANDLER_HOOK')
	return code(ast,
		'function {{ handlerFunctionName }}({{ hookName }}) {',
		'	{{ code }}',
		'}',
		{
			handlerFunctionName: ast.compiledFunctionName,
			hookName: hookName,
			code: map(ast.block, bind(this, _compileMutationStatement, {hookName:hookName})).join('\n')
		})
}

function _compileMutationStatement(context, ast) {
	if (ast.type == 'DEBUGGER') { return 'debugger' }
	if (ast.value.type == 'MUTATION_ITEM_CREATION') {
		return compileMutationItemCreation(ast.value)
	}
	// TODO Need to check if any of the ast.args are asynchronously retrieved, in which case we need
	//  to wait for them
	var promiseNames = pick(ast.args, function(arg) { return arg.promiseName })
	return code(ast,
		'fun.waitForPromises({{ promiseNames }}, function() {',
		'	fun.mutate({{ operation }}, {{ id }}, {{ prop }}, [{{ args }}])',
		'})',
		{
			promiseNames: '['+promiseNames.join(',')+']',
			operation: q(ast.method),
			id: q(ast.value.item.id),
			prop: q(ast.value.property.join('.')),
			args: _cachedValueListCode(ast.args)
		})
}

function _cachedValueListCode(args) {
	return map(args, function(arg) {
		switch (arg.type) {
			case 'STATIC_VALUE': return q(arg.value)
			case 'MUTATION_ITEM_CREATION': return arg.promiseName+'.fulfillment[0]' // the fulfillment is [itemID]
			case 'RUNTIME_ITERATOR': return arg.runtimeName
			default: return code(arg,
				'fun.cachedValue({{ itemID }}, {{ property }})',
				{
					itemID: q(arg.item.id), // this can be a runtime item ID
					property: q(arg.property[0])
				})
		}
	}).join(',')
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
		default:         halt(ast, 'Couldn\'t invoce the value of type "'+ast.type+'". Expected a template or a handler.')
	}
}

/*********************
 * Utility functions *
 *********************/
var emitReplaceRegex = /{{\s*(\w+)\s*}}/
function code(ast /*, line1, line2, line3, ..., lineN, optionalValues */) {
	var argsLen = arguments.length,
		lastArg = arguments[argsLen - 1],
		injectObj = (typeof lastArg == 'string' ? null : lastArg),
		snippets = Array.prototype.slice.call(arguments, 1, injectObj ? argsLen - 1 : argsLen),
		code = '\n' + snippets.join('\n'),
		match
	
	while (match = code.match(emitReplaceRegex)) {
		var wholeMatch = match[0],
			nameMatch = match[1],
			value = injectObj[nameMatch]
		assert(ast, typeof value != 'function', 'Found a function passed in as a value to code()')
		assert(ast, typeof value != 'undefined', 'Missing inject value "'+nameMatch+'"')
		code = code.replace(wholeMatch, value)
	}
	return code
}

var CompileError = function(file, ast, msg) {
	this.name = "CompileError"
	this.message = ['on line', ast.line + ',', 'column', ast.column, 'of', '"'+file+'":', msg].join(' ')
}
CompileError.prototype = Error.prototype

var assert = function(ast, ok, msg) { if (!ok) halt(ast, msg) }
var halt = function(ast, msg) {
	if (ast.file) { sys.puts(util.grabLine(ast.file, ast.line, ast.column, ast.span)) }
	throw new CompileError(ast.file, ast, msg)
}
