require brings `require` to the browser
=======================================

Node implements a simple module management system with the `require` function
and the `npm` command line module manager. This library brings those
functionalities to the browser, as well as advanced compilation functionality
for production deployment.

Installation
============
From npm repo

	sudo npm install -g require

or from source

	git clone git://github.com/marcuswestin/require.git
	sudo npm install -g ./require

Commandline usage
=================
Start the dev server.

	require serve ./example --port 1234 --host localhost

In your HTML, import a javascript module and all of its dependencies
with a script include.

	<script src="//localhost:1234/require/client"></script>

This will effectively resolve to calling require('client') with ./example in
require.paths - i.e. it will try ./example/client.js, ./example/client/index.js,
or read the "main" field from ./example/client/package.json.
[Read more on node's require path resolution](http://nodejs.org/docs/latest/api/all.html#modules)

For production you want to bundle all your dependencies into a single static
file, and compress them.

	require compile ./example/client.js

Use programmatically
====================
You can start the require server programmatically alongside another node server:

	require('require/server').listen(1234, __dirname + '/example')

or, you can mount it on an http server you're already running:

	var http = require('http'),
		requireServer = require('require/server')
	
	var server = http.createServer(function(req, res) { })
	requireServer.mount(server, __dirname + '/example')
	server.listen(8080, 'localhost')

or, as connect middleware

	var connect = require('connect'),
		requireServer = require('require/server')
	
	connect.createServer(
		connect.static(__dirname + '/example'),
		requireServer.connect(__dirname + '/example')
	)

There's also a programmatic API for the compiler.

	var compiler = require('require/compiler')
	console.log(compiler.compile('./example/client.js'))
	console.log(compiler.compileCode('require("./example/client")'))

The compiler supports all the options of https://github.com/mishoo/UglifyJS, e.g.

	compiler.compile('./example/client.js', { beautify:true, ascii_only:true })

npm packages in the browser
===========================
require can import npm packages in the browser. Try installing e.g. raphael,
the SVG library.

	sudo npm install raphael

And then require it client-side

	var raphael = require('raphael'),
		canvas = document.body.appendChild(document.createElement('div')),
		paper = raphael(canvas)
	
	paper.circle(50, 50, 40)

You can see the result if you have the source checked out:

	git clone git://github.com/marcuswestin/require.git
	cd require/example/
	node server.js
	# Open browser to http://localhost:8080/raphael_circle.html
