var path = require('path'),
	fs = require('fs')

module.exports = {
	getDependencyList: getDependencyList,
	getRequireStatements: getRequireStatements,
	resolve: resolve,
	resolveRequireStatement: resolveRequireStatement
}

var _globalRequireRegex = /require\s*\(['"][\w\/\.-]*['"]\)/g
function getRequireStatements(code) {
	return code.match(_globalRequireRegex) || []
}

function resolve(searchPath, pathBase) {
	if (searchPath[0] == '.') {
		// relative path, e.g. require("./foo")
		return _findModuleMain(path.resolve(pathBase, searchPath))
	}
	// npm-style path, e.g. require("npm").
	// Climb parent directories in search for "node_modules"
	var modulePath = _findModuleMain(path.resolve(pathBase, 'node_modules', searchPath))
	if (modulePath) { return modulePath }

	if (pathBase != '/') {
		// not yet at the root - keep climbing!
		return resolve(searchPath, path.resolve(pathBase, '..'))
	}
	return ''
}

function _findModuleMain(absModulePath) {
	var foundPath = ''
	function attempt(aPath) {
		if (foundPath) { return }
		if (path.existsSync(aPath)) { foundPath = aPath }
	}
	attempt(absModulePath + '.js')
	try {
		var package = JSON.parse(fs.readFileSync(absModulePath + '/package.json').toString())
		attempt(path.resolve(absModulePath, package.main+'.js'))
		attempt(path.resolve(absModulePath, package.main))
	} catch(e) {}
	attempt(absModulePath + '/index.js')
	return foundPath
}

var _pathnameGroupingRegex = /require\s*\(['"]([\w\/\.-]*)['"]\)/
function resolveRequireStatement(requireStmnt, currentPath) {
	var rawPath = requireStmnt.match(_pathnameGroupingRegex)[1],
		resolvedPath = resolve(rawPath, path.dirname(currentPath))
	if (!resolvedPath) { throw 'Could not resolve "'+rawPath+'" in "'+currentPath+'"' }
	return resolvedPath
}

function getDependencyList(path) {
	return _findRequiredModules(path).concat(path)
}

var _findRequiredModules = function(absolutePath, _requiredModules) {
	if (!_requiredModules) { _requiredModules = [] }
	_requiredModules[absolutePath] = true
	var code = _readFile(absolutePath),
		requireStatements = getRequireStatements(code)
	
	for (var i=0, requireStmnt; requireStmnt = requireStatements[i]; i++) {
		var absPath = resolveRequireStatement(requireStmnt, absolutePath)
		if (_requiredModules[absPath]) { continue }
		_findRequiredModules(absPath, _requiredModules)
		_requiredModules.push(absPath)
	}
	return _requiredModules
}

var _readFile = function(path) {
	return fs.readFileSync(path).toString()
}

