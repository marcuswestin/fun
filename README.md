[![build status](https://secure.travis-ci.org/marcuswestin/fun.png)](http://travis-ci.org/marcuswestin/fun)
fun
===
A declarative programming language for realtime web applications

Getting started
----------------------
Try this:

	sudo npm install -g fun
	echo '"Hello world!"' > hello.fun
	fun hello.fun
	# Open your browser to localhost:8080

Also try

	curl https://raw.github.com/marcuswestin/fun/master/apps/todo-mvc/todo-mvc.fun > todo-mvc.fun
	curl https://raw.github.com/marcuswestin/fun/master/apps/todo-mvc/todo-mvc.css > todo-mvc.css
	fun todo-mvc.fun

Examples
--------
Hello World

	"Hello world!"

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
	make setup
	make test
