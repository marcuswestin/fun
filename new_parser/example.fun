import Global
import Mouse

import "example_import"

let classAlias = 'classValue'
let followMouseStyle = { position:'absolute', top:Mouse.y, left:Mouse.x }

let incr = handler(){ Global.counter.increment() }
'Counter: ' Global.counter
<button>"+"</button onclick=incr>
<button>"-"</button onclick=handler(){ Global.counter.decrement() }>
<button>"+5"</button onclick=handler(){ Global.counter.add(5) }>
<button>"-3"</button onclick=handler(){ Global.counter.subtract(3) }>


let aTemplate = template() {
	<div>"Hello from a template!"</div>
}

// TODO Implement if (Mouse.x > 0 && Mouse.y > 0) { ... }
// if (Mouse.x > 0) {
// 	if (Mouse.y > 0) {
// 		<div class=classAlias style=followMouseStyle>
// 			<br />"Mouse.x: " Mouse.x " Mouse.y: " Mouse.y
// 			<br />"Mouse.isDown: " Mouse.isDown
// 		</div>
// 	}
// }

aTemplate()

if (Mouse.y < 100) {
	if (50 < Mouse.y) {
		"50 < Mouse.y < 100"
	} else {
		"Mouse.y < 50"
	}
} else {
	"Mouse.y >= 100"
}

for (item in Global.items) {
	if (item != "And let's do it again") {
		<div> "Item: " item </div>
	}
}

// <span>
// 	<br />"Global.foo: " Global.foo
// </span>

// let world = { name: 'world', age: 4.6e9 }
// "hello " world.name ", you're " world.age " years old!"
// let age = 4.6e9e for tokenizer error
// let age 4.6e9 for parser error
// "hello " name.foo for compiler error
