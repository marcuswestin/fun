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
	
	<div style={
		position:   'absolute',
		top:        mouse.y + 50,
		left:       mouse.x + 50,
		width:      100,
		height:     100,
		background: 'red'
	}/>

Getting involved
----------------
The best way to get involved is to start writing fun apps and using them. There are bugs and inefficiencies waiting to be discovered!

If you want to hack on the source:

	git clone https://marcuswestin@github.com/marcuswestin/fun.git
	cd fun
	sudo npm install
	sudo npm link
	make
