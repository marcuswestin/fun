var http = require('http'),
	fs = require('fs'),
	dependency = require('./shared/dependency'),
	requireServer = require('require/server')

var base = __dirname + '/',
	root = 'require'
var server = http.createServer(function(req, res) {
	if (requireServer.isRequireRequest(req)) { return }
	fs.readFile(base + (req.url.substr(1) || 'index.html'), function(err, content) {
		if (err) { return res.end(err.stack) }
		res.end(content)
	})
})

requireServer.mount(server, __dirname)

server.listen(8080)

console.log('shared dependency:', dependency)
