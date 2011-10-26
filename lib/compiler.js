var fs = require('fs'),
	path = require('path'),
	util = require('./util'),
	info = require('./info'),
	bind = util.bind,
	pick = util.pick,
	name = util.name,
	boxComment = util.boxComment,
	q = util.q,
	log = util.log,
	
	flatten = require('std/flatten'),
	map = require('std/map'),
	filter = require('std/filter'),
	curry = require('std/curry'),

	assert = util.assert,
	halt = util.halt

exports.compile = function(resolvedAST) {
	var rootHook = name('ROOT_HOOK')
	return code(
		';(function funApp() {',
		'	var {{ hookName }} = fun.name("rootHook")',
		'	fun.setHook({{ hookName }}, document.body)',
		'	{{ declarationsCode }}',
		'	{{ code }}',
		// '	{{ modules }}',
		'})(); // let\'s kick it',
		{
			hookName: rootHook,
			declarationsCode: map(resolvedAST.declarations, compileDeclaration).join('\n'),
			code: exports.compileRaw(resolvedAST.expressions, rootHook)
			// modules: map(modules, function(module, name) {
			// 	return boxComment('Module: ' + name) + '\n' + module.jsCode
			// }).join('\n\n\n')
		})
}

exports.compileRaw = function(ast, rootHook) {
	// TODO No longer a need for an entire context object. Just make it hookname, and pass that through
	var context = { hookName:rootHook || name('ROOT_HOOK') }
	return compile(context, ast)
}

var compile = function(context, ast) {
	assert(ast, context && context.hookName, "compile called with invalid context")
	if (ast instanceof Array) {
		return map(ast, curry(compile, context)).join('\n') + '\n'
	} else if (info.expressionTypes[ast.type]) {
		return compileExpression(context, ast) + '\n'
	} else {
		return compileStatement(context, ast) + '\n'
	}
}

/************************
 * Top level statements *
 ************************/
var compileExpression = function(context, ast) {
	switch(ast.type) {
		case 'VALUE_LITERAL':     return compileStaticValue(context, ast)
		case 'VALUE':             return compileValue(context, ast)
		case 'COMPOSITE':         return compileCompositeStatement(context, ast)
		case 'RUNTIME_ITERATOR':  return compileItemProperty(context, ast)
		case 'TEMPLATE_ARGUMENT': return compileTemplateArgument(context, ast)
		case 'INVOCATION':        return compileInvocation(context, ast)
		case 'INLINE_SCRIPT':     return ast.inlineJavascript
		default:                  halt(ast, 'Unknown expression type')
	}
}

var compileStatement = function(context, ast) {
	switch (ast.type) {
		case 'XML':               return compileXML(context, ast)
		case 'IF_STATEMENT':      return compileIfStatement(context, ast)
		case 'SWITCH_STATEMENT':  return compileSwitchStatement(context, ast)
		case 'FOR_LOOP':          return compileForLoop(context, ast)
		case 'DEBUGGER':          return 'debugger'
		default:                  halt(ast, 'Unknown statement type')
	}
}

var compileTemplateArgument = function(context, ast) {
	switch(ast.valueType) {
		case 'RUNTIME_ITERATOR':
			return compileItemProperty(context, ast)
		default:
			return compileStaticValue(context, ast)
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
			value: _runtimeValue(ast)
		})
}

var _runtimeValue = function(ast) {
	var prefix = ast.prefix || ''
	switch(ast.type) {
		case 'VALUE_LITERAL':     return prefix + q(ast.value)
		case 'RUNTIME_ITERATOR':  return prefix + ast.runtimeName
		case 'TEMPLATE_ARGUMENT': return prefix + ast.runtimeName
		case 'LIST':              return prefix + q(ast.content)
		// case 'ITEM_PROPERTY':     return prefix + 'fun.cachedValue('+getItemID(ast)+','+getPropertyName(ast)+')'
		default:                  halt(ast, 'Unknown runtime value type')
	}
}

var getItemID = function(ast) {
	switch(ast.type) {
		case 'RUNTIME_ITERATOR':
		case 'TEMPLATE_ARGUMENT':
			return ast.runtimeName
		// case 'ITEM_PROPERTY':
		// 	return q(ast.item.id)
		case 'LIST':
			return info.LOCAL_ID
		default:
			halt(ast, 'Unknown item type')
	}
}

var getPropertyName = function(ast) {
	switch(ast.type) {
		case 'RUNTIME_ITERATOR':
			// assert(ast, ast.iterable.type == 'ITEM_PROPERTY', 'getPropertyName expects ITEM_PROPERTY runtime iterators but found a "'+ast.iterable.type+'"')
			// If the iterator is being referrenced directly as an item ID, rather than as a an item property, then there is no property
			return ast.iteratorProperty && q(ast.iteratorProperty)
		// case 'ITEM_PROPERTY':
		// 	return q(ast.property.join('.'))
		case 'TEMPLATE_ARGUMENT':
			return q(ast.property)
		case 'LIST':
			return q(ast.localName)
		default:
			halt(ast, 'Unknown property type')
	}
}

/********************************
 * Values (numbers and strings) *
 ********************************/
var compileValue = function(context, ast) {
	return code(
		'var {{ hookName }} = fun.hook(fun.name(), {{ parentHookName }})',
		'fun.observe({{ uniqueID }}, function(mutation) {',
		'	fun.getHook({{ hookName }}).innerHTML = mutation.value',
		'})',
		{
			hookName: name('ValueHook'),
			parentHookName: context.hookName,
			uniqueID: q(ast.uniqueID)
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
	} else if (value.type == 'STATIC') {
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
	dynamicCode.push(statementCode(value,
		'fun.attr({{ hookName }}, {{ attr }}, {{ STATEMENT_VALUE }})',
		{
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
	var hookName = name('IF_ELSE_HOOK'),
		ifElseContext = util.shallowCopy(context, { hookName:hookName }),
		lastValueName = name('LAST_VALUE')
	
	return hookCode(hookName, context.hookName)
		+ code('var {{ lastValueName }}', { lastValueName:lastValueName })
		+ statementCode(ast.condition,
		';(function(ifBranch, elseBranch) {',
		'	if ({{ STATEMENT_VALUE }} === {{ lastValueName }}) { return }',
		'	{{ lastValueName }} = {{ STATEMENT_VALUE }}',
		'	fun.destroyHook({{ hookName }})',
		'	if({{ STATEMENT_VALUE }}) { ifBranch() } else { elseBranch() }',
		'})(',
		'	function(){',
		'		{{ ifCode }}',
		'	},',
		'	function(){',
		'		{{ elseCode }}',
		'	}',
		')',
		{
			hookName: hookName,
			ifCode: compile(ifElseContext, ast.ifBlock),
			elseCode: ast.elseBlock && compile(ifElseContext, ast.elseBlock),
			lastValueName: lastValueName
		})
}

/*********************
 * Switch statements *
 *********************/
var compileSwitchStatement = function(context, ast) {
	var switchContext = util.shallowCopy(context, { hookName:name('SWITCH_HOOK') })
		lastValueName = name('LAST_VALUE')

	return hookCode(switchContext.hookName, context.hookName)
		+ code('var {{ lastValueName }}', { lastValueName:lastValueName })
		+ statementCode(ast.controlValue,
		';(function(branches) {',
		'	if ({{ STATEMENT_VALUE }} === {{ lastValueName }}) { return }',
		'	{{ lastValueName }} = {{ STATEMENT_VALUE }}',
		'	fun.destroyHook({{ hookName }})',
		'	switch ({{ STATEMENT_VALUE }}) {',
				map(ast.cases, function(switchCase, i) {
					var labels = switchCase.isDefault
							? 'default:\n'
							: map(switchCase.values, function(value) {
								return 'case ' + _runtimeValue(value) + ':\n'
							}).join('')
					return labels
						+ 'branches['+i+'](); break'
				}).join('\n'),
		'	}',
		'})([',
			map(ast.cases, function(switchCase, i) {
				return 'function branches'+i+'(){ ' + compile(switchContext, switchCase.statements) + '}'
			}).join(',\n'),
		'])',
		{
			hookName: switchContext.hookName,
			lastValueName: lastValueName
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
		'fun.observe("LIST", {{ itemID }}, {{ propertyName }}, function(mutation, value) { fun.splitListMutation(onMutation, mutation, value) })',
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
		case 'TEMPLATE':      return compileTemplateDeclaration(declaration)
		case 'HANDLER':       return compileHandlerDeclaration(declaration)
		case 'LIST':          return compileListLiteral(declaration)
		case 'VALUE':         return compileValueDeclaration(declaration)
		// case 'ITEM_PROPERTY': return compileItemPropertyDeclaration(declaration)
		default:              halt(declaration, 'Found declaration that requires compilation of unknown type')
	}
}

var compileValueDeclaration = function(ast) {
	return code('fun.declare({{ uniqueID }}, {{ valueType }}, {{ initialValue }})', {
		uniqueID: q(ast.uniqueID),
		valueType: q(ast.valueType),
		initialValue: q(ast.initialValue)
	})
}

var compileListLiteral = function(ast) {
	return map(ast.content, function(contentAST) {
		// TODO wait for content AST IDs
		return code(
			'fun.mutate({{ op }}, {{ id }}, {{ prop }}, [{{ args }}])',
			{
				op: q('push'),
				id: q(info.LOCAL_ID),
				prop: q(ast.localName),
				args: _cachedValueListCode([contentAST])
			}
		)
	})
}

var compileItemPropertyDeclaration = function(ast) {
	return code(
		'fun.mutate("set", {{ id }}, {{ prop }}, [{{ value }}])',
		{
			id: getItemID(ast),
			prop: getPropertyName(ast),
			value: q(ast.value)
		})
}

var compileTemplateDeclaration = function(ast) {
	assert(ast, !ast.compiledFunctionName, 'Tried to compile the same template twice')
	ast.compiledFunctionName = name('TEMPLATE_FUNCTION')
	var hookName = name('TEMPLATE_HOOK')
	
	return code(
		'function {{ templateFunctionName }}({{ hookName }} {{ argNames }}) {',
		'	{{ code }}',
		'}',
		{
			templateFunctionName: ast.compiledFunctionName,
			hookName: hookName,
			code: compile({hookName:hookName}, ast.block),
			argNames: _commaPrefixJoin(ast.signature, function(arg) { return arg.runtimeName })
		})
}

var _compileTemplateInvocation = function(context, invocationAST, templateAST) {
	return code(
		'{{ templateFunctionName }}({{ hookName }} {{ argumentValues }})',
		{
			templateFunctionName: templateAST.compiledFunctionName,
			hookName: context.hookName,
			argumentValues: _commaPrefixJoin(invocationAST.args, _compileStatementValue)
		})
}

var _commaPrefixJoin = function(arr, fn) {
	if (arr.length == 0) { return '' }
	return ', ' + map(arr, _compileStatementValue).join(', ')
}

var compileMutationItemCreation = function(ast) {
	var value = ast.value
	// get the item creation property values -> fun.create({ prop1:val1, prop2:val2, ... })
	//  TODO: do we need to wait for promises for the values that are itemProperties?
	var propertiesCode = pick(value.properties.content, function(prop) {
		return prop.key + ':' + _runtimeValue(prop.value)
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
			code: map(ast.block, _compileMutationStatement).join('\n')
		})
}

var _compileMutationStatement = function(ast) {
	if (ast.type == 'DEBUGGER') { return 'debugger' }
	switch(ast.value.type) {
		case 'MUTATION_ITEM_CREATION':
			return compileMutationItemCreation(ast)
		case 'JAVASCRIPT_BRIDGE':
			return compileJavascriptBridge(ast)
		// case 'ITEM_PROPERTY':
		// 	return compileItemPropertyMutation(ast)
		default:
			halt(ast, "Unknown mutation value type")
	}
}

var compileJavascriptBridge = function(ast) {
	var value = ast.value,
		args = map(ast.args, _runtimeValue)
	
	switch (value.jsType) {
		case 'function': return code('{{ functionName }}({{ args }})', { functionName: value.jsName, args: args.join(',') })
		default:         halt(ast, 'Unknown javascript bridge type')
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
			case 'STATIC': return q(arg.value)
			case 'MUTATION_ITEM_CREATION': return arg.promiseName+'.fulfillment[0]' // the fulfillment is [itemID]
			case 'RUNTIME_ITERATOR': return arg.runtimeName
			case 'TEMPLATE_ARGUMENT': return arg.runtimeName
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
	util.halt(statementAST, 'TODO Compile handler invocation')
}

/****************************************
 * Invocations (handlers and templates) *
 ****************************************/
var compileInvocation = function(context, ast) {
	switch(ast.invocable.type) {
		case 'TEMPLATE': return _compileTemplateInvocation(context, ast, ast.invocable)
		default:         util.halt(ast, 'Couldn\'t invoce the value of type "'+ast.type+'". Expected a template or a handler.')
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
		if (typeof value == 'function') { log(nameMatch); ILLEGAL_CODE_VALUE }
		if (typeof value == 'undefined') { log(nameMatch); MISSING_INJECT_VALUE }
		output = output.replace(wholeMatch, value)
	}
	return output
}

function statementCode(ast /*, line1, line2, ..., lineN, values */) {
	var statementLines = Array.prototype.slice.call(arguments, 1, arguments.length - 1),
		injectValues = arguments[arguments.length - 1],
		statementValue = _compileStatementValue(ast),
		dynamicASTs = _collectDynamicASTs(ast)
	
	injectValues['STATEMENT_VALUE'] = name('STATEMENT_VALUE')
	
	return code(
		'fun.dependOn({{ dynamicValues }}, function() {',
		'	var {{ STATEMENT_VALUE }} = {{ statementValue }}',
			code.apply(this, statementLines.concat(injectValues)),
		'})',
		{
			STATEMENT_VALUE: injectValues['STATEMENT_VALUE'],
			dynamicValues: _itemPropertiesArray(dynamicASTs),
			statementValue: statementValue
		})
}
var _collectDynamicASTs = function(ast) {
	if (!ast) { return [] }
	switch(ast.type) {
		case 'COMPOSITE':
			return _collectDynamicASTs(ast.left).concat(_collectDynamicASTs(ast.right))
		// case 'ITEM_PROPERTY':
		case 'RUNTIME_ITERATOR':
			return [ast]
		case 'STATIC':
			return []
		case 'TEMPLATE_ARGUMENT':
			// need to know the type of the argument - in the meantime, assume that no type means its a literal value
			return ast.property.length ? [ast] : []
		default:
			halt(ast, 'Unknown dynamic AST type');
	}
}
var _itemPropertiesArray = function(ASTs) {
	if (!ASTs) { return '[]' }
	var itemProperties = []
	for (var i=0, ast; ast = ASTs[i]; i++) {
		if (/*ast.type != 'ITEM_PROPERTY' &&*/ ast.type != 'RUNTIME_ITERATOR') { continue }
		var propertyName = getPropertyName(ast)
		if (!propertyName) { continue }
		itemProperties.push('{id:'+getItemID(ast)+', property:'+propertyName+'}')
	}
	return '['+itemProperties.join(',')+']'
}
function _compileStatementValue(ast) {
	if (!ast) { return '' }
	switch(ast.type) {
		case 'COMPOSITE':
			var res = _compileStatementValue(ast.left) + ast.operator + _compileStatementValue(ast.right)
			return ast.hasParens ? '('+res+')' : res
		// case 'ITEM_PROPERTY':
		case 'RUNTIME_ITERATOR':
		case 'TEMPLATE_ARGUMENT':
		case 'STATIC':
			return _runtimeValue(ast)
		default:
			halt(ast, 'Unknown value type')
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
