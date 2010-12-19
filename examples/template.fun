import Global

let renderHello = template(name) {
	<em> "Hello dude" </em>
	<div> "Hello" name </div>
}

for (item in Global.items) {
	<div> renderHello(item) " - " item </div> 
}
