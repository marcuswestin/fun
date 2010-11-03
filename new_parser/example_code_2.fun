import Global
import Mouse

import "example_import"

let classAlias = 'classValue'
let followMouseStyle = { position:'absolute', top:Mouse.y, left:Mouse.x }

<div class=classAlias style=followMouseStyle>
	<br />"Mouse.x: " Mouse.x " Mouse.y: " Mouse.y
	<br />"Mouse.isDown: " Mouse.isDown
</div>

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
