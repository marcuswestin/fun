#!/usr/bin/env node

var fs = require('fs'),
	http = require('http')

/* Commandline options
 *********************/
var argv = require('./lib/node-optimist')
	.usage('Usage: $0 app.fun [--host=127.0.0.1 --port=]')
	.demandCount(1)
	.argv

var sourceFile = argv._[0],
	port = argv.port || 1764, // sum('fun', function(letter) { return letter.charCodeAt(0) - 'a'.charCodeAt(0) + 1 }
	host = argv.host || '127.0.0.1'

fs.writeFileSync('index.html', '<script>document.location="//'+host+':'+port+'"</script>')

/* HTTP server
 *************/
void(function() {
	var funJS = fs.readFileSync(__dirname + '/language/lib.js')
	http.createServer(function(req, res) {
		var match
		if (match = req.url.match(/\/fin\/(.*)/)) {
			res.writeHead(200, {'Content-Type':'application/javascript'})
			fs.readFile(__dirname + '/lib/fin/' + match[1], function(err, text) {
				res.end(text)
			})
		} else if (req.url == '/fun/fun.js') {
			res.writeHead(200, {'Content-Type':'application/javascript'})
			res.end(funJS)
		} else if (match = req.url.match(/(.*\.css)$/)) {
			res.writeHead(200, {})
			fs.readFile(__dirname + match[1], function(err, text) {
				res.end(text)
			})
		} else {
			res.writeHead(200, {'Content-Type':'text/html'})
			res.end(htmlOutput)
		}
	}).listen(port, host)
})();

/* Fin/js.io server
 ******************/
void(function() {
	require('./lib/fin/lib/js.io/packages/jsio')
	
	jsio.addPath('lib/fin/js', 'shared')
	jsio.addPath('lib/fin/js', 'server')
	
	jsio('import server.Server')
	jsio('import server.Connection')
	
	var redis = require('./lib/fin/lib/redis-node-client/lib/redis-client')
	var finServer = new server.Server(server.Connection, redis)
	
	// for browser clients
	console.log("Starting fin server - make sure redis-server is running")
	finServer.listen('csp', { port: 5555 }) 
	
	// // for robots
	// finServer.listen('tcp', { port: 5556, timeout: 0 }) 
})();

/* Compilation
 *************/
var tokenizer = require('./language/tokenizer'),
	parser = require('./language/parser'),
	resolver = require('./language/resolver'),
	compiler = require('./language/compiler')

var compiledJS, htmlOutput
function compile() {
	var tokens = tokenizer.tokenize(sourceFile),
		ast = parser.parse(tokens),
		resolved = resolver.resolve(ast)
	
	compiledJS = compiler.compile(resolved.ast, resolved.modules, resolved.declarations)
	htmlOutput = [
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

fs.watchFile(sourceFile, function(currStat, prevStat) {
	if (currStat.mtime.getTime() == prevStat.mtime.getTime()) { return }
	console.log('detected change to ' + sourceFile + ' - recompiling')
	compile()
	console.log('done recompiling')
})

compile()
