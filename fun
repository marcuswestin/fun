#!/usr/bin/env node

var fs = require('fs'),
	sys = require('sys'),
	http = require('http'),
	path = require('path')

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
	var clientAppCode = compileFunCode(),
		httpServer = startHTTPServer(clientAppCode)
	
	startFinServer(httpServer)
	
	comment('\nFun! '+sourceFile+' is running using the "'+engine+'" engine on '+host+':'+port)
}

/* These are the functions that actually do something,
 * based on what you passed in as arguments to fun
 *****************************************************/

function printHelp() {
	output(fs.readFileSync('./help.txt'))
}

function startHTTPServer(clientAppCode) {
	var contentTypes = {
		'.js':   'application/javascript',
		'.css':  'text/css',
		'.html': 'text/html'
	}
	
	var httpServer = http.createServer(function(req, res) {
		var requestPath = req.url.replace(/\.\./g, '') // don't want visitors to climb the path
		if (requestPath == '/') {
			res.writeHead(200)
			res.end(clientAppCode)
		} else {
			fs.readFile(__dirname + requestPath, function(err, text) {
				var extension = path.extname(requestPath)
				res.writeHead(err ? 404 : 200, {
					'Content-Type':contentTypes[extension]
				})
				res.end(text || '')
			})
		}
	})
	httpServer.listen(port, host)
	return httpServer
}

function startFinServer(httpServer) {	
	var finServer = require('./lib/fin/js/server/SocketServer'),
		storageEngine
	
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
	
	finServer.start(httpServer, storageEngine)
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
		'	<script src="/lib/fin/lib/browser-require/require.js"></script>',
		'</head>',
		'<body>',
		'	<script>',
		'		var fun = require("/language/lib")',
		'		var fin = require("/lib/fin/fin")',
				compiledJS,
		'	</script>',
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