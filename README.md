fun
===
A declarative programming language for realtime web applications

A work in progress
==================
I recently resumed work on Fun. It's a work in progress

Getting started
----------------------
	sudo npm install -g fun
	echo '"Hello world!"' > hello.fun
	fun --file hello.fun
	# Open your browser to localhost:8080

Examples
--------
Hello World

	"Hello world!"

facebook Connect

	import facebook
	
	let name = facebook.user.name,
		fbAppID = '177253448965438'
	if (facebook.connected) {
		if (name) { <div>"Welcome " name</div> }
		<div>"Your ID is " facebook.user.id</div>
	} else {
		<button>"Connect"</button onclick=handler() {
			facebook.connect(fbAppID)
		}>
	}

Drag and Drop

	import mouse
	
	let dragStyle = {
		width:      100,
		height:     100,
		background: red,
		position:   'absolute',
		top:        mouse.y + 50,
		left:       mouse.x + 50
	}
	<div style=dragStyle />

Getting involved
----------------
The best way to get involved is to start writing fun apps and using them. There are bugs and inefficiencies waiting to be discovered!

	git clone https://marcuswestin@github.com/marcuswestin/fun.git
	cd fun
	sudo npm link
	make test

See roadmap.md for plans that are anywhere from near to distant future.

If you want to dig into the internals of fun, here are some good places to start:
- language/parser.js takes a stream of tokens and convert them into an abstract syntax tree
- language/compiler.js takes an abstract syntax tree and converts it into javascript that gets served to the client
- lib/fin/js/client/api.js is the API the clients use for realtime state synchronization
- lib/fin/js/server/Client.js is the code that represents a client on the server
- lib/fin/js/server/Server.js is the code that persists data and publishes state changes
- lib/fin/engines/*.js - these are the persistence and pubsub engines that drive the realtime data synchronization
