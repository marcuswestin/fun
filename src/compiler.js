var util = require('./util'),
	name = util.name,
	boxComment = util.boxComment,
	q = util.q,
	assert = util.assert,
	halt = util.halt,
	map = require('std/map'),
	filter = require('std/filter'),
	curry = require('std/curry'),
	slice = require('std/slice'),
	repeat = require('std/repeat'),
	strip = require('std/strip'),
	each = require('std/each'),
	isArray = require('std/isArray'),
	requireCompiler = require('require/compiler'),
	tokenizer = require('./tokenizer'),
	parser = require('./parser'),
	resolver = require('./resolver'),
	path = require('path'),
	extend = require('std/extend'),
	fs = require('fs')

requireCompiler.addFile('fun-runtime-library', __dirname + '/runtime/library.js')

exports.compileFile = function(sourceFilePath, opts, callback) {
	try { _doCompile(tokenizer.tokenizeFile(sourceFilePath), extend(opts, { dirname:path.dirname(sourceFilePath) }), callback) }
	catch(e) { callback(e, null) }
}

exports.compileCode = function(sourceCode, opts, callback) {
	try { _doCompile(tokenizer.tokenize(sourceCode), extend(opts, { dirname:process.cwd() }), callback) }
	catch(e) { callback(e, null) }
}

var _doCompile = function(tokens, opts, callback) {
	try { var ast = parser.parse(tokens) }
	catch(e) { return callback(e, null) }
	
	resolver.resolve(ast, opts, function(err, resolved) {
		if (err) { return callback(err) }
		try {
			var compiledJS = _compileJs(resolved)
			var withoutWhiteLines = filter(compiledJS.split('\n'), function(line) {
				return strip(line).length > 0
			}).join('\n')
			var appHtml = _printHTML(resolved.headers, opts, withoutWhiteLines)
			callback(null, appHtml)
		} catch(e) {
			callback(e, null)
		}
	})
}

var _printHTML = function(headers, opts, compiledJS) {
	compiledJS = requireCompiler.compileCode(
		'fun = require("fun-runtime-library"); \n\n' + compiledJS,
		{ minify:opts.minify, dirname:process.cwd() }
	)
	
	var compiledHeaders = _compileHeaders(headers)
	return [
		'<!doctype html>',
		'<html><head>',
			compiledHeaders,
		'</head><body><script>',
			compiledJS,
		'</script></body></html>'
	].join('\n')
}

var _compileJs = function(resolvedAST) {
	var rootHook = name('ROOT_HOOK')
	return ';(function funApp() {' + code(
		'var {{ hookName }} = fun.name("rootHook")',
		'fun.setHook({{ hookName }}, document.body)',
		'{{ modules }}',
		'{{ code }}',
		{
			hookName: rootHook,
			code: _compileRaw(resolvedAST.expressions, rootHook),
			modules: map(resolvedAST.imports, function(module, name) {
				return boxComment('Module: ' + name) + '\n' + _compileRaw(module)
			}).join('\n\n\n')
		}) + '\n})();'
}

var _compileRaw = function(ast, rootHook) {
	// TODO No longer a need for an entire context object. Just make it hookname, and pass that through
	var context = { hookName:rootHook || name('ROOT_HOOK') }
	return compileTemplateBlock(context, ast)
}

var _compileHeaders = function(headers) {
	return map(headers, function(header) {
		return header
	}).join('\n')
}

/* Templates - emitting code that observes its expressions
 *********************************************************/
var compileTemplateBlock = function(context, ast) {
	if (isArray(ast)) { return map(ast, curry(compileTemplateBlock, context)).join('\n') + '\n' }
	
	var controlStatementCode = tryCompileTemplateControlStatement(context, ast)
	if (controlStatementCode) { return controlStatementCode }
	
	switch(ast.type) {
		case 'NUMBER_LITERAL':
		case 'TEXT_LITERAL':
		case 'LOGIC_LITERAL':
		case 'NULL_LITERAL':
		case 'DICTIONARY_LITERAL':
		case 'LIST_LITERAL':
		case 'REFERENCE':
		case 'COMPOSITE':
		case 'TERNARY':
		case 'INVOCATION':        return _emitExpression(context, ast)
		
		case 'XML':               return _emitXML(context, ast)
		
		default:                  halt(ast, 'Unknown emit statement type '+ast.type)
	}
}

var _emitExpression = function(context, ast) {
	return code(
		'fun.emit({{ hookName }}, {{ value }})', {
		hookName:context.hookName,
		value:compileExpression(ast)
	})
}

var _emitXML = function(context, ast) {
	var nodeHookName = name('XML_HOOK'),
		newContext = copyContext(context, { hookName:nodeHookName })
	
	var attrs = {}
	each(ast.attributes, function(attr) {
		attrs[attr.name] = attr.value
	})
	return code(
		'var {{ hookName }} = fun.name()',
		'fun.hook({{ hookName }}, {{ parentHook }}, { tagName:{{ tagName }}, attrs:{{ attrsObj }} })',
		'{{ block }}',
		{
			parentHook: context.hookName,
			hookName: nodeHookName,
			tagName: q(ast.tagName),
			attrsObj: compileDictionaryLiteral(attrs),
			block: ast.block ? indent(compileTemplateBlock, newContext, ast.block) : ''
		})
}

/* Template control statements
 *****************************/
var tryCompileTemplateControlStatement = function(context, ast) {
	switch(ast.type) {
		case 'SCRIPT_TAG':           return compileScript(context, ast)
		case 'DEBUGGER':             return compileDebugger(context, ast)
		case 'DECLARATION':          return compileDeclaration(context, ast)
		case 'IF_STATEMENT':         return _compileTemplateIfStatement(context, ast)
		case 'SWITCH_STATEMENT':     return _compileTemplateSwitchStatement(context, ast)
		case 'FOR_LOOP':             return _compileTemplateForLoop(context, ast)
	}
}

var _compileTemplateIfStatement = function(context, ast) {
	var hookName = name('IF_ELSE_HOOK'),
		ifElseContext = copyContext(context, { hookName:hookName }),
		lastOutcomeName = name('LAST_VALUE')
	
	return _hookCode(hookName, context.hookName)
		+ code('var {{ lastOutcomeName }}', { lastOutcomeName:lastOutcomeName })
		+ _observeExpression(ast.condition,
		';(function(ifBranch, elseBranch) {',
		'	if ({{ lastOutcome }} && {{ STATEMENT_VALUE }}.equals({{ lastOutcome }}).isTruthy()) { return }',
		'	{{ lastOutcome }} = {{ STATEMENT_VALUE }}',
		'	fun.destroyHook({{ hookName }})',
		'	{{ lastOutcome }}.isTruthy() ? ifBranch() : elseBranch()',
		'})(',
		'	function ifBranch(){',
		'		{{ ifCode }}',
		'	},',
		'	function elseBranch(){',
		'		{{ elseCode }}',
		'	}',
		')',
		{
			hookName: hookName,
			ifCode: indent(compileTemplateBlock, ifElseContext, ast.ifBlock),
			elseCode: ast.elseBlock && indent(compileTemplateBlock, ifElseContext, ast.elseBlock),
			lastOutcome: lastOutcomeName
		})
}

var _compileTemplateSwitchStatement = function(context, ast) {
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
								return 'case ' + compileExpression(value) + ':\n'
							}).join('')
					return labels
						+ 'branches['+i+'](); break'
				}).join('\n'),
		'	}',
		'})([',
			map(ast.cases, function(switchCase, i) {
				return 'function branches'+i+'(){ ' + indent(compileTemplateBlock, switchContext, switchCase.statements) + '}'
			}).join(',\n'),
		'])',
		{
			hookName: switchContext.hookName,
			lastValueName: lastValueName
		})
}

var _compileTemplateForLoop = function(context, ast) {
	var loopContext = copyContext(context, { hookName:name('FOR_LOOP_EMIT_HOOK') })
	return code(
		'var {{ loopHookName }} = fun.name()',
		'fun.hook({{ loopHookName }}, {{ parentHook }})',
		'{{ iterableValue }}.observe(function() {',
		'	fun.destroyHook({{ loopHookName }})',
		'	{{ iterableValue }}.evaluate().iterate(function({{ iteratorName }}) {',
		'		var {{ emitHookName }} = fun.name()',
		'		fun.hook({{ emitHookName }}, {{ loopHookName }})',
		'		{{ loopBlock }}',
		'	})',
		'})',
		{
			parentHook: context.hookName,
			loopHookName: name('FOR_LOOP_HOOK'),
			iterableValue: compileExpression(ast.iterable),
			iteratorName: variableName(ast.iterator.name),
			emitHookName: loopContext.hookName,
			loopBlock: indent(compileTemplateBlock, loopContext, ast.block)
		})
}

var _observeExpression = function(ast /*, line1, line2, ..., lineN, values */) {
	var statementLines = Array.prototype.slice.call(arguments, 1, arguments.length - 1),
		injectValues = arguments[arguments.length - 1]
	
	injectValues['STATEMENT_VALUE'] = name('STATEMENT_VALUE')
	
	return code(
		'{{ __statementValue }}.observe(function() {',
		'	var {{ STATEMENT_VALUE }} = {{ __statementValue }}.evaluate()',
		'	' + code.apply(this, statementLines.concat(injectValues)),
		'})',
		{
			STATEMENT_VALUE: injectValues['STATEMENT_VALUE'],
			__statementValue: compileExpression(ast)
		})
}


/* Functions and Handlers - procedural code where expressions are not observed
 *****************************************************************************/
var compileFunctionDefinition = function(ast) {
	return code(
		'fun.expressions.Function(function block({{ arguments }}) {',
		'	{{ block }}',
		'})',
		{
			arguments:['yieldValue', '__hackFirstExecution'].concat(map(ast.signature, function(argument, i) {
				return variableName(argument.name)
			})).join(', '),
			block:indent(map, ast.block, curry(_compileFunctionBlock, ast.closure)).join('\n')
		})
}

var _compileFunctionBlock = function(context, ast) {
	if (isArray(ast)) { return map(ast, curry(_compileFunctionBlock, context)).join('\n') + '\n' }
	
	var controlStatementCode = tryCompileControlStatement(_compileFunctionBlock, context, ast)
	if (controlStatementCode) { return controlStatementCode }
	
	switch(ast.type) {
		case 'DECLARATION':  return compileDeclaration(context, ast)
		case 'RETURN':       return _compileFunctionReturn(ast)
		default:             halt(ast, 'Unknown function statement type')
	}
}

var _compileFunctionReturn = function(ast) {
	return code(
		'yieldValue({{ value }}); return', { value:compileExpression(ast.value) }
	)
}

var compileHandlerDefinition = function(ast) {
	return code(
		'fun.expressions.Handler(function block({{ signature }}) {',
		'	{{ block }}',
		'})',
		{
			signature: _compileSignature(ast.signature),
			block: indent(map, ast.block, curry(_compileHandlerBlock, ast.closure)).join('\n')
		})
}

var _compileSignature = function(signature) {
	return map(signature, function(argument, i) {
		return variableName(argument.name)
	}).join(', ')
}

var _compileHandlerBlock = function(context, ast) {
	if (isArray(ast)) { return map(ast, curry(_compileHandlerBlock, context)).join('\n') + '\n' }
	
	var controlStatementCode = tryCompileControlStatement(_compileHandlerBlock, context, ast)
	if (controlStatementCode) { return controlStatementCode }
	
	switch(ast.type) {
		case 'MUTATION':          return _compileMutationStatement(ast)
		case 'INVOCATION':        return compileInvocation(ast)
		default:                  halt(ast, 'Unknown handler statement type')
	}
}

var _compileMutationStatement = function(ast) {
	return code('{{ operand }}.{{ operator }}({{ chain }}, {{ value }})', {
		operand:compileExpression(ast.operand),
		operator:ast.operator,
		chain:null,
		value:compileExpression(ast.arguments[0])
	})
}

var compileTemplateDefinition = function(ast) {
	throw new Error("Implement compileTemplateDefinition")
}

/* Function and Handler control code
 ***********************************/
var tryCompileControlStatement = function(blockCompileFn, context, ast) {
	switch(ast.type) {
		case 'SCRIPT_TAG':           return compileScript(context, ast)
		case 'DEBUGGER':             return compileDebugger(context, ast)
		case 'DECLARATION':          return compileDeclaration(context, ast)
		case 'IF_STATEMENT':         return _compileIfStatement(blockCompileFn, context, ast)
		case 'SWITCH_STATEMENT':     return _compileSwitchStatement(blockCompileFn, context, ast)
		case 'FOR_LOOP':             return _compileForLoop(blockCompileFn, context, ast)
	}
}

var _compileIfStatement = function(blockCompileFn, context, ast) {
	return code(
		';(function(ifBranch, elseBranch) {',
		'	{{ expression }}.isTruthy() ? ifBranch() : elseBranch()',
		'})(',
		'	function ifBranch(){',
		'		{{ ifCode }}',
		'	},',
		'	function elseBranch(){',
		'		{{ elseCode }}',
		'	}',
		')',
		{
			expression: compileExpression(ast.condition),
			ifCode: indent(blockCompileFn, context, ast.ifBlock),
			elseCode: ast.elseBlock && indent(blockCompileFn, context, ast.elseBlock)
		})
}

var _compileSwitchStatement = function(blockCompileFn, context, ast) {
	return code(
		';(function(branches) {',
		'	switch ({{ expression }}) {',
				map(ast.cases, function(switchCase, i) {
					var labels = switchCase.isDefault
							? 'default:\n'
							: map(switchCase.values, function(value) {
								return 'case ' + compileExpression(value) + ':\n'
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
			expression: compileExpression(ast.controlValue)
		})
}

var _compileForLoop = function(blockCompileFn, context, ast) {
	return code(
		'{{ expression }}.evaluate().iterate(function({{ iteratorName }}) {',
		'	{{ loopBlock }}',
		'})',
		{
			expression: compileExpression(ast.iterable),
			iteratorName: variableName(ast.iterator.name),
			loopBlock: indent(blockCompileFn, context, ast.block)
		})
}

/* Utility functions
 *******************/
var code = function() {
	return _code(arguments, true)
}

var _indentation = 1
var indent = function(fn /*, arg1, ... argN */) {
	_indentation++
	var result = fn.apply(this, slice(arguments, 1))
	_indentation--
	return result
}

var compileDictionaryLiteral = function(obj) {
	return '{ '+map(obj, function(value, name) {
		return '"'+name+'":'+compileExpression(value)
	}).join(', ')+' }'
}

var variableName = function(name) {
	return '__variableName__'+name
}

var copyContext = function(context, addValues) {
	return addValues // we currently have only a hookName - we can probably get rid of compilation context and just have the hook name
}

var compileExpression = function(ast) {
	assert(ast, typeof ast == 'object', 'ASTs should always be objects')
	switch(ast.type) {
		case 'TEXT_LITERAL':
		case 'NUMBER_LITERAL':
		case 'NULL_LITERAL':
		case 'LOGIC_LITERAL':
			return _inlineCode('fun.expressions.{{ expressionType }}({{ value }})', {
				expressionType:_getType(ast),
				value:q(ast.value)
			})
		case 'REFERENCE':
			return ast.chain.length
				? _inlineCode('fun.expressions.reference({{ name }}, {{ chain }})', {
					name:variableName(ast.name),
					chain:q(ast.chain)
				}) : variableName(ast.name)
		case 'ARGUMENT':
			return ast.runtimeName
		case 'DICTIONARY_LITERAL':
			return _inlineCode('fun.expressions.Dictionary({{ contentObj }})', {
				contentObj:compileDictionaryLiteral(ast.content)
			})
		case 'LIST_LITERAL':
			return _inlineCode('fun.expressions.List([ {{ content }} ])', {
				content:map(ast.content, compileExpression).join(', ')
			})
		case 'COMPOSITE':
			return _inlineCode('fun.expressions.composite({{ left }}, "{{ operator }}", {{ right }})', {
				left:compileExpression(ast.left),
				operator:ast.operator,
				right:compileExpression(ast.right)
			})
		case 'TERNARY':
			return _inlineCode('fun.expressions.ternary({{ condition }}, {{ ifValue }}, {{ elseValue }})', {
				condition:compileExpression(ast.condition),
				ifValue:compileExpression(ast.ifValue),
				elseValue:compileExpression(ast.elseValue)
			})
		case 'UNARY':
			return _inlineCode('fun.expressions.unary({{ operator }}, {{ value }})', {
				operator:q(ast.operator),
				value:compileExpression(ast.value)
			})
		case 'INVOCATION':
			return compileInvocation(ast)
		case 'FUNCTION':
			return compileFunctionDefinition(ast)
		case 'HANDLER':
			return compileHandlerDefinition(ast)
		case 'TEMPLATE':
			return compileTemplateDefinition(ast)
		default:
			halt(ast, 'Unknown runtime value type ' + ast.type)
	}
}

var compileInvocation = function(ast) {
	return _inlineCode('fun.invoke({{ operand }}, {{ arguments }}, "")', {
		operand:compileExpression(ast.operand),
		arguments:'['+map(ast.arguments, function(arg) { return compileExpression(arg) }).join(',')+']'
	})
}

var compileScript = function(context, ast) {
	var variables = (ast.attributes.length == 0) ? '' : 'var '+map(ast.attributes, function(attr) {
		return attr.name+'='+compileExpression(attr.value)
	}).join(', ')+';'
	return code(';(function(){',
	'	{{ variables }}',
	'/* START INLINE JAVASCRIPT */',
	'{{ javascript }}',
	'/* END INLINE JAVASCRIPT */',
	'})()', {
		variables:variables,
		javascript:ast.inlineJavascript
	})
}

var compileDeclaration = function(context, ast) {
	return code('var {{ name }} = fun.expressions.variable({{ initialContent }})', {
		name:variableName(ast.name),
		initialContent:compileExpression(ast.initialValue)
	})
}

var compileDebugger = function(context, ast) {
	return code('debugger', null)
}

var _inlineCode = function() { return _code(arguments, false) }
var _emitReplaceRegex = /{{\s*(\w+)\s*}}/
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
		if (typeof value == 'function') { throw new Error('Illegal code value: "'+nameMatch+'"') }
		if (typeof value == 'undefined') { throw new Error('Missing inject value: "'+nameMatch+'"') }
		output = output.replace(wholeMatch, value)
	}
	return output
}

var _types = { 'TEXT_LITERAL':'Text', 'NUMBER_LITERAL':'Number', 'LOGIC_LITERAL':'Logic', 'NULL_LITERAL':'Null', 'DICTIONARY_LITERAL':'Dictionary', 'LIST_LITERAL':'List' }
var _getType = function(ast) {
	assert(ast, !!_types[ast.type], 'Unknown value literal type')
	return _types[ast.type]
}

var _hookCode = function(hookName, parentHookName) {
	return code(
		'var {{ hookName }} = fun.name()',
		'fun.hook({{ hookName }}, {{ parentHookName }})',
		{
			hookName: hookName,
			parentHookName: parentHookName
		})
}
