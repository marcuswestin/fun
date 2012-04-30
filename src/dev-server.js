require('colors')

var socketIo = require('socket.io'),
	curry = require('std/curry'),
	fs = require('fs'),
	path = require('path'),
	time = require('std/time'),
	http = require('http')

module.exports = {
	compileFile: compileFile,
	listen: listen,
	mountAndWatchFile: mountAndWatchFile,
	serveDevClient: serveDevClient,
	respond: respond
}

function compileFile(filename, opts, callback) {
	loadCompiler().compileFile(_resolveFilename(filename), opts, callback)
}

function listen(port, filenameRaw, opts) {
	if (!port) { port = 8080 }

	var filename = _resolveFilename(filenameRaw)

	try {
		var stat = fs.statSync(filename)
	} catch(e) {
		console.error('Error:', e.message ? e.message : e.toString())
		return process.exit(-1)
	}

	if (!stat.isFile()) {
		console.error('Error:', filename, 'is not a file.')
		return process.exit(-1)
	}

	var server = http.createServer(function(req, res) {
		if (req.url == '/favicon.ico') {
			return send404(res)
		} else {
			serveDevClient(req, res)
		}
	})

	function send404(res) {
		res.writeHead(404)
		res.end()
	}
	
	mountAndWatchFile(server, filename, opts)
	server.listen(port)
	console.log('Fun!'.magenta, 'Serving', filenameRaw.green, 'on', ('localhost:'+port).cyan, 'with these options:\n', opts)
}

function _resolveFilename(filename) {
	return filename[0] == '/' ? filename : path.join(process.cwd(), filename)
}

function serveDevClient(req, res) {
	fs.readFile(path.join(__dirname, './dev-client.html'), curry(respond, res))
}

function mountAndWatchFile(server, filename, opts) {
	var serverIo = socketIo.listen(server)
	serverIo.set('log level', 0)

	serverIo.sockets.on('connection', function(socket) {
		console.log("Dev client connected")
		loadCompiler().compileFile(filename, opts, function broadcast(err, appHtml) {
			socket.emit('change', { error:err, html:appHtml })
		})
	})

	var lastChange = time.now()
	fs.watch(filename, function(event, changedFilename) {
		if (time.now() - lastChange < 1000) { return } // Node bug calls twice per change, see https://github.com/joyent/node/issues/2126
		lastChange = time.now()
		console.log(filename, "changed.", "Compiling and sending.")
		loadCompiler().compileFile(filename, opts, function broadcast(err, appHtml) {
			serverIo.sockets.emit('change', { error:err, html:appHtml })
		})
	})
}

function loadCompiler() {
	for (var key in require.cache) {
		delete require.cache[key]
	}
	return require('../src/compiler')
}

function respond(res, e, content) {
	if (e) {
		res.writeHead(500)
		res.end(errorHtmlResponse(e))
	} else {
		res.writeHead(200)
		res.end(content.toString())
	}
}

function errorHtmlResponse(e) {
	return ['<!doctype html>','<body>',
		'<button ontouchstart="location.reload();" onclick="location.reload()">Reload</button>',
		'<pre>',
		e.stack ? e.stack : e.message ? e.message : e.toString ? e.toString() : e || 'Error',
		'</pre>'
	].join('\n')
}
