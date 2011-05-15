var http = require('http'),
	fs = require('fs')
	requireServer = require('require/server'),
	fin = require('../api/server'),
	engine = require('../engines/development')

var server = http.createServer(function(req, res) {
	var demo = req.url.substr(1)
	if (!demo) { listDemos(res) }
	else { showDemo(demo, res) }
})

fin.mount(server, engine)
requireServer.mount(server, __dirname)
server.listen(1234)
console.log('listening on :1234')

function listDemos(res) {
	fs.readdir(__dirname, function(err, entries) {
		if (err) { return res.end(err.stack) }
		res.writeHead(200, { 'Content-Type':'text/html' })
		entries.forEach(function(entry) {
			if (!entry.match(/\.html$/)) { return }
			res.write('<br/><a href="'+entry+'">'+entry+'</a>')
		})
		res.end()
	})
}

function showDemo(demo, res) {
	fs.readFile(__dirname + '/' + demo, function(err, content) {
		if (err) { return res.end(err.stack) }
		res.end(content)
	})
}
