var http = require('http'),
	fs = require('fs'),
	path = require('path'),
	extend = require('std/extend'),
	curry = require('std/curry'),
	each = require('std/each'),
	util = require('./lib/util')

module.exports = {
	listen: listen,
	mount: mount,
	connect: connect,
	isRequireRequest: isRequireRequest
}

function listen(port, _opts) {
	_setOpts(_opts)
	port = opts.port = (port || 1234)
	opts.handleAllRequests = true
	var server = http.createServer()
	mount(server)
	server.listen(port, opts.host)
}

function mount(server, _opts, handleAllRequests) {
	_setOpts(_opts)
	server.on('request', function(req, res) {
		if (isRequireRequest(req) || opts.handleAllRequests) {
			_handleRequest(req, res)
		}
	})
	return server
}

function connect(opts) {
	_setOpts(opts)
	return function require(req, res, next) {
		if (!isRequireRequest(req)) { return next() }
		_handleRequest(req, res)
	}
}

function isRequireRequest(req) {
	return req.url.substr(1, opts.root.length) == opts.root
}

/* options
 *********/
var opts = {
	path: process.cwd(),
	root: 'require',
	port: null,
	host: null
}

function _setOpts(_opts) {
	if (typeof _opts == 'string') {
		opts = extend({ path:_opts }, opts)
	} else {
		opts = extend(_opts, opts)
	}
}

/* request handlers
 ******************/
function _handleRequest(req, res) {
	var reqPath = req.url.substr(opts.root.length + 2)
	if (!reqPath.match(/\.js$/)) {
		_handleMainModuleRequest(reqPath, res)
	} else {
		_handleModuleRequest(reqPath, res)
	}
}

function _handleMainModuleRequest(reqPath, res) {
	var modulePath = util.resolve('./' + reqPath, opts.path)
	if (!modulePath) { return _sendError(res, 'Could not find module "'+reqPath+'" from "'+opts.path+'"') }

	try { var deps = util.getDependencyList(modulePath) }
	catch(err) { return _sendError(res, err) }

	res.write('var require = {}\n')
	each(deps, function(dependency) {
		res.write('document.write(\'<script src="'+ _getBase() + '/' + dependency +'"></script>\')\n')
	})
	res.end()
}

var _closureStart = '(function() {',
	_moduleDef = 'var module = {exports:{}}; var exports = module.exports;',
	_closureEnd = '})()'
function _handleModuleRequest(reqPath, res) {
	fs.readFile(reqPath, function(err, content) {
		if (err) { return _sendError(res, err.stack) }
		var code = content.toString(),
			requireStatements = util.getRequireStatements(code)

		each(requireStatements, function(requireStmnt) {
			var depPath = util.resolveRequireStatement(requireStmnt, reqPath)
			if (!depPath) { return _sendError }
			
			code = code.replace(requireStmnt, 'require["'+depPath+'"]')
		})

		res.write(_closureStart + _moduleDef)
		res.write(code)
		res.write('\nrequire["'+reqPath+'"]=module.exports')
		res.end(_closureEnd)
	})
}

/* util
 ******/
function _sendError(res, msg) {
	msg = msg.replace(/\n/g, '\\n').replace(/"/g, '\\"')
	res.writeHead(200)
	res.end('alert("error: ' + msg + '")')
}

function _getBase() {
	if (opts.host && opts.port) {
		return '//' + opts.host + ':' + opts.port + '/' + opts.root
	} else {
		return '/' + opts.root
	}
}
