var fs = require('fs'),
	path = require('path'),
	util = require('./lib/util'),
	extend = require('std/extend'),
	uglifyJS = require('uglify-js')

module.exports = {
	compile: compileFile,
	compileCode: compileCode
}

/* api
 *****/
function compileFile(filePath, opts) {
	filePath = path.resolve(filePath)
	opts = extend(opts, { basePath:path.dirname(filePath), toplevel:true })
	var code = fs.readFileSync(filePath).toString()
	return _compile(code, opts, filePath)
}

function compileCode(code, opts) {
	opts = extend(opts, { basePath:process.cwd(), toplevel:true })
	return _compile(code, opts, '<code passed into compiler.compile()>')
}

var _compile = function(code, opts, mainModule) {
	var code = 'var require = {}\n' + _compileModule(code, opts.basePath, mainModule)
	if (opts.compile === false) { return code } // TODO use uglifyjs' beautifier?

	var ast = uglifyJS.parser.parse(code, opts.strict_semicolons),
	ast = uglifyJS.uglify.ast_mangle(ast, opts)
	ast = uglifyJS.uglify.ast_squeeze(ast, opts)

	return uglifyJS.uglify.gen_code(ast, opts)
}

/* util
 ******/
var _compileModule = function(code, pathBase, mainModule) {
	var modules = [mainModule]
	_replaceRequireStatements(mainModule, code, modules, pathBase)
	code = _concatModules(modules)
	code = _minifyRequireStatements(code, modules)
	return code
}

var _minifyRequireStatements = function(code, modules) {
	for (var i=0, modulePath; modulePath = modules[i]; i++) {
		var escapedPath = modulePath.replace(/\//g, '\\/').replace('(','\\(').replace(')','\\)'),
			regex = new RegExp('require\\["'+ escapedPath +'"\\]', 'g')
		code = code.replace(regex, 'require["_'+ i +'"]')
	}
	return code
}

var _globalRequireRegex = /require\s*\(['"][\w\/\.-]*['"]\)/g,
	_pathnameGroupingRegex = /require\s*\(['"]([\w\/\.-]*)['"]\)/

var _replaceRequireStatements = function(modulePath, code, modules, pathBase) {
	var requireStatements = code.match(_globalRequireRegex)

	if (!requireStatements) {
		modules[modulePath] = code
		return
	}

	for (var i=0, requireStatement; requireStatement = requireStatements[i]; i++) {
		var rawModulePath = requireStatement.match(_pathnameGroupingRegex)[1],
			subModulePath = util.resolve(rawModulePath, pathBase).replace(/\.js$/, '')

		if (!subModulePath) {
			throw new Error("Require Compiler Error: Cannot find module '"+ rawModulePath +"' (in '"+ modulePath +"')")
		}

		code = code.replace(requireStatement, 'require["' + subModulePath + '"].exports')

		if (!modules[subModulePath]) {
			modules[subModulePath] = true
			var newPathBase = path.dirname(subModulePath),
				newModuleCode = fs.readFileSync(subModulePath + '.js').toString()
			_replaceRequireStatements(subModulePath, newModuleCode, modules, newPathBase)
			modules.push(subModulePath)
		}
	}

	modules[modulePath] = code
}

var _concatModules = function(modules) {
	var code = function(modulePath) {
		return [
			';(function() {',
			'	// ' + modulePath,
			'	var module = require["'+modulePath+'"] = {exports:{}}, exports = module.exports;',
				modules[modulePath],
			'})()'
		].join('\n')
	}

	var moduleDefinitions = []
	for (var i=1, modulePath; modulePath = modules[i]; i++) {
		moduleDefinitions.push(code(modulePath))
	}
	moduleDefinitions.push(code(modules[0])) // __main__

	return moduleDefinitions.join('\n\n')
}

var _repeat = function(str, times) {
	if (times < 0) { return '' }
	return new Array(times + 1).join(str)
}
