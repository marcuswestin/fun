var fs = require('fs'),
	path = require('path'),
	util = require('./util'),
	info = require('./info'),
	pick = util.pick,
	name = util.name,
	boxComment = util.boxComment,
	q = util.q,
	log = util.log,
	
	flatten = require('std/flatten'),
	map = require('std/map'),
	filter = require('std/filter'),
	curry = require('std/curry'),
	slice = require('std/slice'),
	repeat = require('std/repeat'),
	filter = require('std/filter'),
	strip = require('std/strip'),
	each = require('std/each'),
	arrayToObject = require('std/arrayToObject'),
	
	requireCompiler = require('require/compiler'),
	
	tokenizer = require('./tokenizer'),
	parser = require('./parser'),
	resolver = require('./resolver'),

	assert = util.assert,
	halt = util.halt

exports.compileFile = function(sourceFilePath) { return _doCompile(tokenizer.tokenizeFile(sourceFilePath)) }
exports.compileCode = function(sourceCode) { return _doCompile(tokenizer.tokenize(sourceCode)) }

var _doCompile = function(tokens) {
	var ast = parser.parse(tokens),
		resolved = resolver.resolve(ast),
		compiledJS = exports.compile(resolved)
	return exports._printHTML(_removeWhiteLines(compiledJS))
}

var _removeWhiteLines = function(js) {
	return filter(js.split('\n'), function(line) { return strip(line).length > 0 }).join('\n')
}

exports._printHTML = function(compiledJS) {
	runtimeUtilJS = requireCompiler.compile(__dirname + '/../src/runtime/library.js', { minify:false })
	return [
		'<!doctype html>',
		'<html><head></head><body><script>',
			'fun = {}',
			runtimeUtilJS + "\n" + compiledJS,
		'</script></body></html>'
	].join('\n')
}

exports.compile = function(resolvedAST) {
	var rootHook = name('ROOT_HOOK')
	return ';(function funApp() {' + code(
		'var {{ hookName }} = fun.name("rootHook")',
		'fun.setHook({{ hookName }}, document.body)',
		'{{ modules }}',
		'{{ code }}',
		{
			hookName: rootHook,
			code: exports.compileRaw(resolvedAST.expressions, rootHook),
			modules: map(resolvedAST.imports, function(module, name) {
				return boxComment('Module: ' + name) + '\n' + exports.compileRaw(module)
			}).join('\n\n\n')
		}) + '\n})();'
}

exports.compileRaw = function(ast, rootHook) {
	// TODO No longer a need for an entire context object. Just make it hookname, and pass that through
	var context = { hookName:rootHook || name('ROOT_HOOK') }
	return compileEmitStatement(context, ast)
}

/****************************************************
 * Emit (template), function and handler statements *
 ****************************************************/
var compileEmitStatement = function(context, ast) {
	if (ast instanceof Array) { return map(ast, curry(compileEmitStatement, context)).join('\n') + '\n' }
	if (controlStatements[ast.type]) { return compileControlStatement(context, ast) }
	switch(ast.type) {
		case 'VALUE_LITERAL':     return emitValue(context, ast)
		case 'REFERENCE':         return emitValue(context, ast)
		case 'OBJECT_LITERAL':    return emitValue(context, ast)
		case 'ITERATOR':          return emitValue(context, ast)
		case 'COMPOSITE':         return emitValue(context, ast)
		
		case 'XML':               return emitXML(context, ast)
		case 'INVOCATION':        return compileInvocation(context, ast)

		default:                  halt(ast, 'Unknown emit statement type '+ast.type)
	}
}

var compileScript = function(context, ast) {
	return code(';(function(){ /* INLINE JS */',
	'	{{ variables }}',
	'	{{ javascript }}',
	'})()', {
		variables:map(ast.attributes, function(attr) {
			return 'var '+attr.name+' = '+runtimeValue(attr.value)
		}).join('\n'),
		javascript:ast.inlineJavascript
	})
}
/*********************************************************
 * Values (numbers, texts, collections, references, ...) *
 *********************************************************/
var emitValue = function(context, ast) {
	return code(
		'fun.emit({{ hookName }}, {{ value }})', {
		hookName:context.hookName,
		value:runtimeValue(ast)
	})
}

/*******
 * XML *
 *******/
var emitXML = function(context, ast) {
	var nodeHookName = name('XML_HOOK'),
		newContext = copyContext(context, { hookName:nodeHookName })
	
	var attributes = _handleXMLAttributes(nodeHookName, ast)
	return code(
		'var {{ hookName }} = fun.name()',
		'fun.hook({{ hookName }}, {{ parentHook }}, { tagName:{{ tagName }}, attrs:{{ staticAttributes }} })',
		'{{ dynamicAttributesCode }}',
		'{{ block }}',
		{
			parentHook: context.hookName,
			hookName: nodeHookName,
			tagName: q(ast.tagName),
			staticAttributes: q(attributes.staticAttrs),
			dynamicAttributesCode: attributes.dynamicCode,
			block: ast.block ? indent(compileEmitStatement, newContext, ast.block) : ''
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
	var name = attribute.name,
		value = attribute.value,
		match
	
	if (name == 'style') {
		assert(ast, value.type == 'OBJECT_LITERAL' || value.type == 'REFERENCE', 'The style attribute should be an object, e.g. style={ color:"red" }')
		dynamicCode.push('fun.reflectStyles('+nodeHookName+', '+runtimeValue(value, true)+')')
	} else if (name == 'data') {
		_handleDataAttribute(nodeHookName, ast, dynamicCode, value, attribute.dataType)
	} else if (match = name.match(/^on(\w+)$/)) {
		_handleHandlerAttribute(nodeHookName, ast, dynamicCode, match[1], value)
	} else if (value.type == 'VALUE_LITERAL') {
		staticAttrs[name] = value.value
	} else {
		assert(ast, value.type != 'OBJECT_LITERAL', 'Does not make sense to assign a JSON object literal to other attribtues than "style" (tried to assign to "'+name+'")')
		_handleDynamicAttribute(nodeHookName, ast, dynamicCode, name, value)
	}
}

// modifies dynamicCode
var _handleDataAttribute = function(nodeHookName, ast, dynamicCode, value, dataType) {
	dynamicCode.push(code(
		'fun.reflectInput({{ hookName }}, {{ value }})',
		{
			hookName: nodeHookName,
			value: runtimeValue(value)
		}))
}

// modifies dynamicCode
var _handleDynamicAttribute = function(nodeHookName, ast, dynamicCode, attrName, value) {
	dynamicCode.push(_statementCode(value,
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
/************************************************************************
 * Control statements - if/else, switch, for loop, script tag, debugger *
 ************************************************************************/
var controlStatements = arrayToObject(['IF_STATEMENT', 'SWITCH_STATEMENT', 'FOR_LOOP', 'SCRIPT_TAG', 'DEBUGGER', 'VARIABLE_DECLARATION'])
var compileControlStatement = function(context, ast) {
	switch(ast.type) {
		case 'VARIABLE_DECLARATION': return compileVariableDeclaration(context, ast)
		case 'IF_STATEMENT':      return compileIfStatement(compileHandlerStatement, context, ast)
		case 'SWITCH_STATEMENT':  return compileSwitchStatement(compileHandlerStatement, context, ast)
		case 'FOR_LOOP':          return compileForLoop(compileHandlerStatement, context, ast)
		case 'SCRIPT_TAG':        return compileScript(context, ast)
		case 'DEBUGGER':          return 'debugger'
		default:                  halt(ast, 'Unknown control statement')
	}
}

var compileVariableDeclaration = function(context, ast) {
	return code('var {{ name }} = fun.expressions.variable({{ initialContent }})', {
		name:variableName(ast.name),
		initialContent:runtimeValue(ast.initialValue, true)
	})
}

var compileIfStatement = function(blockCompileFn, context, ast) {
	var hookName = name('IF_ELSE_HOOK'),
		ifElseContext = copyContext(context, { hookName:hookName }),
		lastValueName = name('LAST_VALUE')
	
	return _hookCode(hookName, context.hookName)
		+ code('var {{ lastValueName }}', { lastValueName:lastValueName })
		+ _statementCode(ast.condition,
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
			ifCode: indent(blockCompileFn, ifElseContext, ast.ifBlock),
			elseCode: ast.elseBlock && indent(blockCompileFn, ifElseContext, ast.elseBlock),
			lastValueName: lastValueName
		})
}

var compileSwitchStatement = function(blockCompileFn, context, ast) {
	var switchContext = copyContext(context, { hookName:name('SWITCH_HOOK') })
		lastValueName = name('LAST_VALUE')

	return _hookCode(switchContext.hookName, context.hookName)
		+ code('var {{ lastValueName }}', { lastValueName:lastValueName })
		+ _statementCode(ast.controlValue,
		';(function(branches) {',
		'	if ({{ STATEMENT_VALUE }} === {{ lastValueName }}) { return }',
		'	{{ lastValueName }} = {{ STATEMENT_VALUE }}',
		'	fun.destroyHook({{ hookName }})',
		'	switch ({{ STATEMENT_VALUE }}) {',
				map(ast.cases, function(switchCase, i) {
					var labels = switchCase.isDefault
							? 'default:\n'
							: map(switchCase.values, function(value) {
								return 'case ' + runtimeValue(value) + ':\n'
							}).join('')
					return labels
						+ 'branches['+i+'](); break'
				}).join('\n'),
		'	}',
		'})([',
			map(ast.cases, function(switchCase, i) {
				return 'function branches'+i+'(){ ' + indent(blockCompileFn, switchContext, switchCase.statements) + '}'
			}).join(',\n'),
		'])',
		{
			hookName: switchContext.hookName,
			lastValueName: lastValueName
		})
}

var compileForLoop = function(blockCompileFn, context, ast) {
	var loopContext = copyContext(context, { hookName:name('FOR_LOOP_EMIT_HOOK') })
	
	return code(
		'var {{ loopHookName }} = fun.name()',
		'fun.hook({{ loopHookName }}, {{ parentHook }})',
		'fun.observe("LIST_LITERAL", {{ value }}, function(mutation, value) { fun.splitListMutation(onMutation, mutation, value) })',
		'function onMutation({{ iteratorRuntimeName }}, op) {',
		'	var {{ emitHookName }} = fun.name()',
		'	fun.hook({{ emitHookName }}, {{ loopHookName }}, { prepend: (op=="unshift") })',
		'	{{ loopCode }}',
		'}',
		{
			parentHook: context.hookName,
			loopHookName: name('FOR_LOOP_HOOK'),
			value: runtimeValue(ast),
			iteratorRuntimeName: ast.iteratorRuntimeName,
			emitHookName: loopContext.hookName,
			loopCode: indent(blockCompileFn, loopContext, ast.block)
		})
}

/****************
 * Declarations *
 ****************/
var compileValueDeclaration = function(ast) {
	return code('fun.declare({{ uniqueID }}, {{ valueType }}, {{ initialValue }})', {
		uniqueID: q(ast.uniqueID),
		valueType: q(ast.valueType),
		initialValue: q(ast.initialValue)
	})
}

var compileListLiteral = function(ast) {
	halt(ast, 'Implement compileListLiteral')
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
			code: indent(compile, {hookName:hookName}, ast.block),
			argNames: _commaPrefixJoin(ast.signature, function(arg) { return arg.runtimeName })
		})
}

var _compileTemplateInvocation = function(context, invocationAST, templateAST) {
	return code(
		'{{ templateFunctionName }}({{ hookName }} {{ argumentValues }})',
		{
			templateFunctionName: templateAST.compiledFunctionName,
			hookName: context.hookName,
			argumentValues: _commaPrefixJoin(invocationAST.args, runtimeValue)
		})
}

var _commaPrefixJoin = function(arr, fn) {
	if (arr.length == 0) { return '' }
	return ', ' + map(arr, runtimeValue).join(', ')
}

var compileMutationItemCreation = function(ast) {
	var value = ast.value
	// get the item creation property values -> fun.create({ prop1:val1, prop2:val2, ... })
	//  TODO: do we need to wait for promises for the values that are itemProperties?
	var propertiesCode = pick(value.properties.content, function(prop) {
		return prop.key + ':' + runtimeValue(prop.value)
	}).join(',')
	
	value.promiseName = name('ITEM_CREATION_PROMISE')
	return code(
		'var {{ promiseName }} = fun.create({ {{ propertiesCode }} })',
		{
			promiseName: value.promiseName,
			propertiesCode: propertiesCode
		})
}

/* Functions
 ***********/
var compileFunctionDefinition = function(ast) {
	assert(ast, !ast.compiledFunctionName, 'Tried to compile the same function twice')
	ast.compiledFunctionName = name('FUNCTION_JS_NAME')
	return code(
		'function {{ functionJsName }}({{ arguments }}) {',
		'	var __functionReturnValue__ = fun.expressions.variable()',
		'	{{ block }}',
		'	return __functionReturnValue__',
		'}',
		{
			functionJsName:ast.compiledFunctionName,
			arguments:map(ast.signature, function(argument, i) { return argument.name }).join(', '),
			block:indent(map, ast.block, curry(compileFunctionStatement, ast.closure)).join('\n')
		})
}

var compileFunctionStatement = function(context, ast) {
	if (controlStatements[ast.type]) { return compileControlStatement(context, ast) }
	switch(ast.type) {
		case 'RETURN':       return compileFunctionReturn(ast)
		default:             halt(ast, 'Unknown function statement type')
	}
}

var compileFunctionReturn = function(ast) {
	return code(
		'__functionReturnValue__.set({{ value }})', { value:runtimeValue(ast.value) }
	)
}

/**************************************
 * Handler declarations and mutations *
 **************************************/
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
			code: indent(map, ast.block, curry(compileHandlerStatement, ast.closure)).join('\n')
		})
}

var compileHandlerStatement = function(context, ast) {
	if (controlStatements[ast.type]) { return compileControlStatement(context, ast) }
	switch(ast.type) {
		case 'MUTATION':          return compileMutationStatement(ast)
		default:                  halt(ast, 'Unknown handler statement type')
	}
}

var compileMutationStatement = function(ast) {
	return code('{{ operand }}.{{ operator }}({{ chain }}, {{ value }})', {
		operand:runtimeValue(ast.operand),
		operator:ast.operator,
		chain:null,
		value:runtimeValue(ast.arguments[0])
	})
}

var namespace = function(reference) {
	return q([reference.value.name].concat(reference.chain).join('.'))
}

/***************************************************
 * Invocations (templates, functions and handlers) *
 ***************************************************/
var invocables = { 'TEMPLATE':1, 'FUNCTION':1, 'HANDLER':1 }
var compileInvocation = function(context, ast) {
	assert(ast, invocables[ast.invocable.type], 'Unknown invocable type')
	assert(ast, ast.invocable.functionName, 'Invocable is expected to have a function name')
	return code('{{ functionName }}({{ arguments }}, {{ hookName }})', {
		functionName:ast.invocable.functionName,
		arguments:ast.arguments,
		hookName:context.hookName
	})
}

/*********************
 * Utility functions *
 *********************/
var inlineCode = function() { return _code(arguments, false) }
var code = function() { return _code(arguments, true) }

var _emitReplaceRegex = /{{\s*(\w+)\s*}}/,
	_indentation = 1
var _code = function(args, addNewlines) {
	var argsLen = args.length,
		injectObj = args[argsLen - 1],
		snippets = slice(args, 0, argsLen - 1),
		splitter = (addNewlines ? ('\n' + repeat('\t', _indentation)) : ' '),
		output = splitter + snippets.join(splitter),
		match
	
	while (match = output.match(_emitReplaceRegex)) {
		var wholeMatch = match[0],
			nameMatch = match[1],
			value = injectObj[nameMatch]
		if (typeof value == 'function') { log(nameMatch); ILLEGAL_CODE_VALUE }
		if (typeof value == 'undefined') { log(nameMatch); MISSING_INJECT_VALUE }
		output = output.replace(wholeMatch, value)
	}
	return output
}

var indent = function(fn /*, arg1, ... argN */) {
	_indentation++
	var result = fn.apply(this, slice(arguments, 1))
	_indentation--
	return result
}

var runtimeValue = function(ast, isVariable) {
	switch(ast.type) {
		case 'VALUE_LITERAL':
			return isVariable
				? inlineCode('fun.expressions.variable({{ content }})', { content:runtimeValue(ast, false) })
				: inlineCode('fun.expressions.{{ type }}({{ value }})', { type:_getType(ast), value:q(ast.value) })
		case 'REFERENCE':
			return inlineCode('fun.expressions.reference({{ name }}, {{ chain }})', { name:variableName(ast.name), chain:q(ast.chain) })
		case 'ITERATOR':
			return ast.runtimeName
		case 'ARGUMENT':
			return ast.runtimeName
		case 'LIST_LITERAL':
			return q(ast.content)
		case 'OBJECT_LITERAL':
			return inlineCode('fun.expressions.dictionary({ {{ content }} })', { 
				content:map(ast.content, function(value, name) { return name+':'+runtimeValue(value, isVariable) }).join(', ')
			})
		case 'COMPOSITE':
			return inlineCode('fun.expressions.composite({{ left }}, "{{ operator }}", {{ right }})', {
				left:runtimeValue(ast.left),
				operator:ast.operator,
				right:runtimeValue(ast.right)
			})
		case 'FUNCTION':      return compileFunctionDefinition(ast)
		case 'TEMPLATE':      return compileTemplateDeclaration(declaration)
		case 'HANDLER':       return compileHandlerDeclaration(declaration)
		case 'FUNCTION':      return compileFunctionDeclaration(declaration)
		case 'LIST_LITERAL':  return compileListLiteral(declaration)
		case 'VALUE':         return compileValueDeclaration(declaration)
		
		default:
			halt(ast, 'Unknown runtime value type ' + ast.type)
	}
}

var variableName = function(name) { return '_variableName_'+name }

var _types = { 'string':'text', 'number':'number', 'boolean':'logic', 'null':'null' }
var _getType = function(ast) {
	switch (ast.type) {
		case 'VALUE_LITERAL':
			var type = (ast.value === null ? 'null' : typeof ast.value)
			assert(ast, !!_types[type], 'Unknown value literal type')
			return _types[type]
		case 'OBJECT_LITERAL': return 'dictionary'
		default:
			halt(ast, 'Unknown _getType type')
	}
}


var _statementCode = function(ast /*, line1, line2, ..., lineN, values */) {
	var statementLines = Array.prototype.slice.call(arguments, 1, arguments.length - 1),
		injectValues = arguments[arguments.length - 1]
	
	injectValues['STATEMENT_VALUE'] = name('STATEMENT_VALUE')
	
	return code(
		'fun.dependOn({{ __values }}, function() {',
		'	var {{ STATEMENT_VALUE }} = {{ __statementValue }}',
			code.apply(this, statementLines.concat(injectValues)),
		'})',
		{
			STATEMENT_VALUE: injectValues['STATEMENT_VALUE'],
			__values: map(ast, runtimeValue),
			__statementValue: runtimeValue(ast)
		})
}

var _collectDynamicASTs = function(ast) {
	if (!ast) { return [] }
	switch(ast.type) {
		case 'COMPOSITE':
			return _collectDynamicASTs(ast.left).concat(_collectDynamicASTs(ast.right))
		case 'ITERATOR':
		case 'VALUE':
			return [ast]
		case 'VALUE_LITERAL':
			return []
		case 'ARGUMENT':
			// need to know the type of the argument - in the meantime, assume that no type means its a literal value
			return ast.property.length ? [ast] : []
		case 'OBJECT_LITERAL':
			return filter(flatten(map(ast.content, _collectDynamicASTs)))
		default:
			halt(ast, 'Unknown dynamic AST type');
	}
}

function _hookCode(hookName, parentHookName) {
	return code(
		'var {{ hookName }} = fun.name()',
		'fun.hook({{ hookName }}, {{ parentHookName }})',
		{
			hookName: hookName,
			parentHookName: parentHookName
		})
}

var copyContext = function(context, addValues) {
	return addValues // we currently have only a hookName - we can probably get rid of compilation context and just have the hook name
}