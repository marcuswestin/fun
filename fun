#!/usr/bin/env node

var // system modules
	fs = require('fs'),
	sys = require('sys'),
	http = require('http'),
	path = require('path'),
	comment = require('util').debug,
	// lib modules
	browserRequireCompiler = require('./lib/fin/lib/browser-require/compiler'),
	// fun parser modules
	tokenizer = require('./language/tokenizer'),
	parser = require('./language/parser'),
	resolver = require('./language/resolver'),
	compiler = require('./language/compiler'),
	util = require('./language/util')

/* Commandline options
 *********************/
var argv = require('./lib/node-optimist')
	.usage('Usage: $0 app.fun [--help --host=127.0.0.1 --port=1764 --engine=[development,redis]]')
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
	output(fs.readFileSync('./help.txt'))
} else if (argv.s || argv['static']) {
	comment('compiling fun code...')
	var funApp = compileFunCode(sourceFile),
		funAppJS = browserRequireCompiler.compileJS(funApp.js, __dirname)
	comment('done!')
	
	function printStaticFunApp(jsCode) {
		var staticFunApp = funApp.html.replace(
			'<script src="./lib/fin/lib/browser-require/require.js" main="app" id="browser-require"></script>',
			'<script>\n' + jsCode + '\n</script>')

		output(staticFunApp)
	}
	
	if (argv.compress) {
		comment('compressing output with google closure compiler...')
		browserRequireCompiler.compressJS(funAppJS, printStaticFunApp)
		comment('done!')
	} else {
		printStaticFunApp(funAppJS)
	}
} else {
	var funApp = compileFunCode(sourceFile)
	var httpServer = startHTTPServer(funApp)
	startFinServer(engine, httpServer)
	comment('\nFun! '+sourceFile+' is running using the "'+engine+'" engine on '+host+':'+port)
}

/* These are the functions that actually do something,
 * based on what you passed in as arguments to fun
 *****************************************************/
function startHTTPServer(application) {
	var contentTypes = {
		'.js':   'application/javascript',
		'.css':  'text/css',
		'.html': 'text/html'
	}
	
	var httpServer = http.createServer(function(req, res) {
		var requestPath = req.url.replace(/\.\./g, '') // don't want visitors to climb the path
		if (requestPath == '/') {
			res.writeHead(200)
			res.end(application.html)
		} else if (requestPath == '/app.js') {
			res.writeHead(200)
			res.end(application.js)
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

function startFinServer(engineName, httpServer) {	
	var engines = {
		development: './lib/fin/engines/development',
		redis: './lib/fin/engines/redis'
	}
	if (!engines[engineName]) { throw new Error('Unkown engine "'+engineName+'"') }
	var finServer = require('./lib/fin/js/server/SocketServer'),
		engine = require(engines[engineName])
	
	return finServer.start(httpServer, engine)
}

function compileFunCode(sourceFile) {
	var tokens = tokenizer.tokenize(sourceFile),
		ast = parser.parse(tokens),
		resolved = resolver.resolve(ast),
		compiledJS = compiler.compile(resolved.ast, resolved.modules, resolved.declarations)
	
	var appJS = [
		'window.fun=require("./language/lib")',
		'window.fin=require("./lib/fin/fin")',
		browserRequireCompiler.indentJS(compiledJS)
	].join('\n')
	
	var appHTML = [
		'<!doctype html>',
		'<html>',
		'<head></head>',
		'<body>',
		'	<script src="./lib/fin/lib/browser-require/require.js" main="app" id="browser-require"></script>',
		'</body>',
		'</html>'
	].join('\n')
	
	var result = {
		js: appJS,
		html: appHTML
	}
	
	return result
}

/* Utility functions
 *******************/
function output() {
	sys.puts.apply(this, arguments)
}

function comment() {
	sys.debug.apply(this, arguments)
}