#!/usr/bin/env node

var fs = require('fs'),
	sys = require('sys'),
	http = require('http')

var tokenizer = require('./language/tokenizer'),
	parser = require('./language/parser'),
	resolver = require('./language/resolver'),
	compiler = require('./language/compiler'),
	util = require('./language/util')

/* Commandline options
 *********************/
var argv = require('./lib/node-optimist')
	.usage('Usage: $0 app.fun [--host=127.0.0.1 --port=1764 --engine=[development,redis]]')
	.argv

// Variables
var sourceFile = argv._[0],
	port = argv.port || 1764,
	host = argv.host || '127.0.0.1',
	engine = argv.engine || 'development'

/* Ladies and gentlemen, START YOUR ENGINES!
 * Look at the command line arguments and act
 * accordingly.
 ********************************************/
if (argv.h || argv.help) {
	printHelp()
} else if (argv.s || argv['static']) {
	output(compileFunCode())
} else {
	var clientAppCode = compileFunCode()
	startHTTPServer(clientAppCode)
	startFinServer()

	comment('\nFun! '+sourceFile+' is running using the "'+engine+'" engine on '+host+':'+port)
}

/* These are the functions that actually do something,
 * based on what you passed in as arguments to fun
 *****************************************************/

function printHelp() {
	output(fs.readFileSync('./help.txt'))
}

function startHTTPServer(clientAppCode) {
	var funJS = fs.readFileSync(__dirname + '/language/lib.js')
	http.createServer(function(req, res) {
		var url = req.url, match
		if (match = url.match(/\/fin\/(.*)/)) {
			fs.readFile(__dirname + '/lib/fin/' + match[1], function(err, text) {
				res.writeHead(err ? 404 : 200, {'Content-Type':'application/javascript'})
				res.end(text || '')
			})
		} else if (url == '/fun/fun.js') {
			res.writeHead(200, {'Content-Type':'application/javascript'})
			res.end(funJS)
		} else if (match = url.match(/(.*\.css)$/)) {
			fs.readFile(__dirname + match[1], function(err, text) {
				res.writeHead(err ? 404 : 200, {})
				res.end(text || '')
			})
		} else {
			res.writeHead(200, {'Content-Type':'text/html'})
			res.end(clientAppCode)
		}
	}).listen(port, host)
}

function startFinServer() {
	require('./lib/fin/lib/js.io/packages/jsio')
	
	jsio.addPath('lib/fin/js', 'shared')
	jsio.addPath('lib/fin/js', 'server')
	
	jsio('import server.Server')
	jsio('import server.Connection')
	
	var storageEngine
	switch (engine) {
		case 'development':
			storageEngine = require('./lib/fin/engines/development')
			break
		case 'redis':
			storageEngine = require('./lib/fin/engines/redis')
			break
		default:
			throw new Error('Unkown store "'+store+'"')
	}
	var finServer = new server.Server(server.Connection, storageEngine)
	
	// for browser clients
	finServer.listen('csp', { port: 5555 }) 
	
	// // for robots
	// finServer.listen('tcp', { port: 5556, timeout: 0 }) 
}

function compileFunCode() {
	comment('tokenize...')
	var tokens = tokenizer.tokenize(sourceFile)
	comment('parse...')
	var ast = parser.parse(tokens)
	comment('resolve...')
	var resolved = resolver.resolve(ast)
	comment('compile...')
	
	compiledJS = compiler.compile(resolved.ast, resolved.modules, resolved.declarations)
	compiledJS = util.indent(compiledJS)
	return [
		'<!doctype html>',
		'<html>',
		'<head>',
		'	<script src="/fin/fin.js"></script>',
		'	<script src="/fun/fun.js"></script>',
		'</head>',
		'<body>',
		'	<script>' + compiledJS + '</script>',
		'</body>',
		'</html>'
	].join('\n')
}

/* Utility functions
 *******************/
function output() {
	sys.puts.apply(this, arguments)
}

function comment() {
	sys.debug.apply(this, arguments)
}