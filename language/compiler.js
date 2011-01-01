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

exports.compile = util.intercept('CompileError', function(ast, modules, declarations) {
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
var compile = function(context, ast) {
	assert(ast, context && context.hookName, "compile called with invalid context")
	if (ast instanceof Array) {
		return map(ast, bind(this, compileStatement, context)).join('\n') + '\n'
	} else {
		return compileStatement(context, ast) + '\n'
	}
}

var compileStatement = function(context, ast) {
	if (!ast) { return '' }
	switch (ast.type) {
		case 'STATIC_VALUE':     return compileStaticValue(context, ast)
		case 'ITEM_PROPERTY':    return compileItemProperty(context, ast)
		case 'COMPOSITE':        return compileCompositeStatement(context, ast)
		case 'RUNTIME_ITERATOR': return compileRuntimeIterator(context, ast);
		case 'XML':              return compileXML(context, ast)
		case 'IF_STATEMENT':     return compileIfStatement(context, ast)
		case 'FOR_LOOP':         return compileForLoop(context, ast)
		case 'INVOCATION':       return compileInvocation(context, ast)
		case 'DEBUGGER':         return 'debugger'
		
		default:                 console.log(ast); UNKNOWN_AST_TYPE
	}
}

var compileRuntimeIterator = function(context, ast) {
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
var compileStaticValue = function(context, ast) {
	return code(
		'fun.text({{ parentHook }}, {{ value }})',
		{
			parentHook: context.hookName,
			value: _getValue(ast)
		})
}

var _getValue = function(ast) {
	switch(ast.type) {
		case 'STATIC_VALUE':     return q(ast.value)
		case 'RUNTIME_ITERATOR': return ast.runtimeName
		case 'LIST':             return q(ast.content)
		case 'ITEM_PROPERTY':    return 'fun.cachedValue('+getItemID(ast)+','+getPropertyName(ast)+')'
		default:                 console.log(ast); UNKNOWN_AST_TYPE
	}
}

var getItemID = function(ast) {
	switch(ast.type) {
		case 'RUNTIME_ITERATOR':
			assert(ast, ast.iterable.type == 'ITEM_PROPERTY', 'getItemID expects ITEM_PROPERTY runtime iterators but found a "'+ast.iterable.type+'"')
			return ast.runtimeName
		case 'ITEM_PROPERTY':
			return q(ast.item.id)
		default:
			console.log(ast); UNKNOWN_AST_TYPE
	}
}

var getPropertyName = function(ast) {
	switch(ast.type) {
		case 'RUNTIME_ITERATOR':
			assert(ast, ast.iterable.type == 'ITEM_PROPERTY', 'getPropertyName expects ITEM_PROPERTY runtime iterators but found a "'+ast.iterable.type+'"')
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
var compileItemProperty = function(context, ast) {
	return code(
		'var {{ hookName }} = fun.name()',
		'fun.hook({{ hookName }}, {{ parentHook }})',
		'fun.observe({{ type }}, {{ id }}, {{ property }}, function(mutation, value) {',
		'	fun.getHook({{ hookName }}).innerHTML = value',
		'})',
		{
			hookName: name('ITEM_PROPERTY_HOOK'),
			parentHook: context.hookName,
			id: getItemID(ast),
			property: getPropertyName(ast),
			type: q('BYTES')
		})
}

/************************
 * Composite statements *
 ************************/
var compileCompositeStatement = function(context, ast) {
	var hookName = name('COMPOSITE_HOOK')
	return hookCode(hookName, context.hookName) + statementCode(ast,
		'fun.getHook({{ hookName }}).innerHTML = {{ STATEMENT_VALUE }}',
		{
			hookName: hookName,
		})
}

/*******
 * XML *
 *******/
var compileXML = function(context, ast) {
	var nodeHookName = name('XML_HOOK'),
		newContext = util.shallowCopy(context, { hookName:nodeHookName })
	
	var attributes = _handleXMLAttributes(nodeHookName, ast)
	return code(
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

var _handleXMLAttributes = function(nodeHookName, ast) {
	var staticAttrs = {}, dynamicCode = []
	for (var i=0, attribute; attribute = ast.attributes[i]; i++) {
		_handleXMLAttribute(nodeHookName, ast, staticAttrs, dynamicCode, attribute)
	}
	return { staticAttrs: staticAttrs, dynamicCode: dynamicCode.join('\n') }
}

// modifies staticAttrs and, dynamicCode
var _handleXMLAttribute = function(nodeHookName, ast, staticAttrs, dynamicCode, attribute) {
	var name = attribute.namespace.join('.'),
		value = attribute.value,
		match
	
	if (name == 'dataType') {
		// do nothing
	} else if (name == 'data') {
		// TODO Individual tags should define how to handle the data attribute
		_handleDataAttribute(nodeHookName, ast, dynamicCode, value, attribute.dataType)
	} else if (match = name.match(/^on(\w+)$/)) {
		_handleHandlerAttribute(nodeHookName, ast, dynamicCode, match[1], value)
	} else if (value.type == 'STATIC_VALUE') {
		staticAttrs[name] = value.value
	} else {
		assert(ast, value.type != 'OBJECT_LITERAL', 'Does not make sense to assign a JSON object literal to other attribtues than "style" (tried to assign to "'+name+'")')
		_handleDynamicAttribute(nodeHookName, ast, dynamicCode, name, value)
	}
}

// modifies dynamicCode
var _handleDataAttribute = function(nodeHookName, ast, dynamicCode, value, dataType) {
	dynamicCode.push(code(
		'fun.reflectInput({{ hookName }}, {{ itemID }}, {{ property }}, {{ type }})',
		{
			hookName: nodeHookName,
			itemID: getItemID(value),
			property: getPropertyName(value),
			type: q(dataType || 'string')
		}))
}

// modifies dynamicCode
var _handleDynamicAttribute = function(nodeHookName, ast, dynamicCode, attrName, value) {
	dynamicCode.push(code(
		'fun.observe({{ type }}, {{ id }}, {{ property }}, function(mutation, value) {',
		'	fun.attr({{ hookName }}, {{ attr }}, value)',
		'})',
		{
			type: q('BYTES'),
			id: getItemID(value),
			property: getPropertyName(value),
			attr: q(attrName),
			hookName: nodeHookName
		}))
}

// modifies dynamicCode
var _handleHandlerAttribute = function(nodeHookName, ast, dynamicCode, handlerName, handlerAST) {
	var handlerFunctionCode
	if (handlerAST.compiledFunctionName) {
		handlerFunctionCode = handlerAST.compiledFunctionName
	} else {
		handlerFunctionCode = compileHandlerDeclaration(handlerAST)
	}
	dynamicCode.push(code(
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
var compileIfStatement = function(context, ast) {
	var left = ast.condition.left,
		right = ast.condition.right,
		ifContext = util.shallowCopy(context, { hookName: name('IF_HOOK') }),
		elseContext = util.shallowCopy(context, { hookName: name('ELSE_HOOK') }),
		isDynamic = { left:(left.type == 'ITEM_PROPERTY'), right:(right ? right.type == 'ITEM_PROPERTY' : false) }
	
	return code(
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
			leftProperty: isDynamic.left && getPropertyName(left),
			rightProperty: isDynamic.right && getPropertyName(right),
			ifCode: compile(ifContext, ast.ifBlock),
			elseCode: ast.elseBlock && compile(elseContext, ast.elseBlock)
		})
}

/*************
 * For loops *
 *************/
var compileForLoop = function(context, ast) {
	var loopContext = util.shallowCopy(context, { hookName:name('FOR_LOOP_EMIT_HOOK') })
	
	return code(
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
			itemID: getItemID(ast.iterable),
			propertyName: getPropertyName(ast.iterable),
			iteratorRuntimeName: ast.iteratorRuntimeName,
			emitHookName: loopContext.hookName,
			loopCode: compile(loopContext, ast.block)
		})
}

/*************
 * Templates *
 *************/
var compileDeclaration = function(declaration) {
	switch (declaration.type) {
		case 'TEMPLATE':  return compileTemplateDeclaration(declaration)
		case 'HANDLER':   return compileHandlerDeclaration(declaration)
		default:          halt(declaration, 'Found declaration that requires compilation of unknown type')
	}
}

var compileTemplateDeclaration = function(ast) {
	assert(ast, !ast.compiledFunctionName, 'Tried to compile the same template twice')
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

var _compileTemplateInvocation = function(context, invocationAST, templateAST) {
	// ast.args is a list of invocation values/aliases
	assert(invocationAST, invocationAST.args.length == 0, 'TODO Handle template invocation arguments')
	assert(templateAST, templateAST.signature.length == 0, 'TODO Handle template signature')
	return code(
		'{{ templateFunctionName }}({{ hookName }})',
		{
			templateFunctionName: templateAST.compiledFunctionName,
			hookName: context.hookName
		})
}

var compileMutationItemCreation = function(ast) {
	var value = ast.value
	// get the item creation property values -> fun.create({ prop1:val1, prop2:val2, ... })
	//  TODO: do we need to wait for promises for the values that are itemProperties?
	var propertiesCode = pick(value.properties.content, function(prop) {
		return prop.name + ':' + _getValue(prop.value)
	}).join(',')
	
	value.promiseName = name('ITEM_CREATION_PROMISE')
	return code(
		'var {{ promiseName }} = fun.create({ {{ propertiesCode }} })',
		{
			promiseName: value.promiseName,
			propertiesCode: propertiesCode
		})
}

/************
 * Handlers *
 ************/
var compileHandlerDeclaration = function(ast) {
	assert(ast, !ast.compiledFunctionName, 'Tried to compile the same handler twice')
	ast.compiledFunctionName = name('HANDLER_FUNCTION')
	var hookName = name('HANDLER_HOOK')
	return code(
		'function {{ handlerFunctionName }}({{ hookName }}) {',
		'	{{ code }}',
		'}',
		{
			handlerFunctionName: ast.compiledFunctionName,
			hookName: hookName,
			code: map(ast.block, bind(this, _compileMutationStatement)).join('\n')
		})
}

var _compileMutationStatement = function(ast) {
	if (ast.type == 'DEBUGGER') { return 'debugger' }
	switch(ast.value.type) {
		case 'MUTATION_ITEM_CREATION':
			return compileMutationItemCreation(ast)
		case 'JAVASCRIPT_BRIDGE':
			return compileJavascriptBridge(ast)
		case 'ITEM_PROPERTY':
			return compileItemPropertyMutation(ast)
		default:
			console.log(ast.value); UNKNOWN_MUTATION_VALUE_AST_TYPE
	}
}

var compileJavascriptBridge = function(ast) {
	var value = ast.value,
		args = map(ast.args, _getValue)
	
	switch (value.jsType) {
		case 'function': return code('{{ functionName }}({{ args }})', { functionName: value.jsName, args: args.join(',') })
		default:         console.log(ast); UNKNOWN_AST_JS_TYPE
	}
}

var compileItemPropertyMutation = function(ast) {
	// TODO Need to check if any of the ast.args are asynchronously retrieved, in which case we need
	//  to wait for them
	var promiseNames = pick(ast.args, function(arg) { return arg.promiseName })
	return code(
		'fun.waitForPromises({{ promiseNames }}, function() {',
		'	fun.mutate({{ operation }}, {{ id }}, {{ prop }}, [{{ args }}])',
		'})',
		{
			promiseNames: '['+promiseNames.join(',')+']',
			operation: q(ast.method),
			id: getItemID(ast.value),
			prop: getPropertyName(ast.value),
			args: _cachedValueListCode(ast.args)
		})
}

var _cachedValueListCode = function(args) {
	return map(args, function(arg) {
		switch (arg.type) {
			case 'STATIC_VALUE': return q(arg.value)
			case 'MUTATION_ITEM_CREATION': return arg.promiseName+'.fulfillment[0]' // the fulfillment is [itemID]
			case 'RUNTIME_ITERATOR': return arg.runtimeName
			default: return code(
				'fun.cachedValue({{ itemID }}, {{ property }})',
				{
					itemID: getItemID(arg),
					property: getPropertyName(arg)
				})
		}
	}).join(',')
}

var _compileHandlerInvocation = function(context, invocationAST, handlerAST) {
	halt(statementAST, 'TODO Compile handler invocation')
}

/****************************************
 * Invocations (handlers and templates) *
 ****************************************/
var compileInvocation = function(context, ast) {
	switch(ast.invocable.type) {
		case 'TEMPLATE': return _compileTemplateInvocation(context, ast, ast.invocable)
		default:         halt(ast, 'Couldn\'t invoce the value of type "'+ast.type+'". Expected a template or a handler.')
	}
}

/*********************
 * Utility functions *
 *********************/
var emitReplaceRegex = /{{\s*(\w+)\s*}}/
var code = function(/*, line1, line2, line3, ..., lineN, optionalValues */) {
	var argsLen = arguments.length,
		injectObj = arguments[argsLen - 1],
		snippets = Array.prototype.slice.call(arguments, 0, argsLen - 1),
		output = '\n' + snippets.join('\n'),
		match
	
	while (match = output.match(emitReplaceRegex)) {
		var wholeMatch = match[0],
			nameMatch = match[1],
			value = injectObj[nameMatch]
		if (typeof value == 'function') { console.log(nameMatch); ILLEGAL_CODE_VALUE }
		if (typeof value == 'undefined') { console.log(nameMatch); MISSING_INJECT_VALUE }
		output = output.replace(wholeMatch, value)
	}
	return output
}

function statementCode(ast /*, line1, line2, ..., lineN, values */) {
	var statementLines = Array.prototype.slice.call(arguments, 1, arguments.length - 1),
		injectValues = arguments[arguments.length - 1],
		statementValue = _compileStatementValue(ast)
	
	injectValues['STATEMENT_VALUE'] = name('STATEMENT_VALUE')
	
	return code(
		'fun.dependOn({{ dynamicValues }}, function() {',
		'	var {{ STATEMENT_VALUE }} = {{ statementValue }}',
			code.apply(this, statementLines.concat(injectValues)),
		'})',
		{
			STATEMENT_VALUE: injectValues['STATEMENT_VALUE'],
			dynamicValues: _itemPropertiesArray(ast.dynamicASTs),
			statementValue: statementValue
		})
}
var _itemPropertiesArray = function(ASTs) {
	if (!ASTs) { return '[]' }
	var itemProperties = []
	for (var i=0, ast; ast = ASTs[i]; i++) {
		if (ast.type != 'ITEM_PROPERTY' && ast.type != 'RUNTIME_ITERATOR') { continue }
		itemProperties.push('{id:'+getItemID(ast)+', property:'+getPropertyName(ast)+'}')
	}
	return '['+itemProperties.join(',')+']'
}
function _compileStatementValue(ast) {
	switch(ast.type) {
		case 'COMPOSITE':
			return _compileStatementValue(ast.left) + ast.operator + _compileStatementValue(ast.right)
		case 'ITEM_PROPERTY':
		case 'RUNTIME_ITERATOR':
		case 'STATIC_VALUE':
			return _getValue(ast)
		default:
			console.log(ast); UNKNOWN_AST_TYPE
	}
}

function hookCode(hookName, parentHookName) {
	return code(
		'var {{ hookName }} = fun.name()',
		'fun.hook({{ hookName }}, {{ parentHookName }})',
		{
			hookName: hookName,
			parentHookName: parentHookName
		})
}

var CompileError = function(file, ast, msg) {
	var info = ast.info
	this.name = "CompileError"
	this.message = ['on line', info.line + ',', 'column', info.column, 'of', '"'+file+'":', msg].join(' ')
}
CompileError.prototype = Error.prototype

var assert = function(ast, ok, msg) { if (!ok) halt(ast, msg) }
var halt = function(ast, msg) {
	var info = ast.info
	if (info.file) { sys.puts(util.grabLine(info.file, info.line, info.column, info.span)) }
	throw new CompileError(info.file, ast, msg)
}
