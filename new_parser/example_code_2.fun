import Global
import Mouse

let classAlias = 'classValue'

<div class=classAlias style={ position:'absolute', top:Mouse.y, left:Mouse.x }>
	<br />"Mouse.x: " Mouse.x " Mouse.y: " Mouse.y
	<br />"Mouse.isDown: " Mouse.isDown
</div>
// <span>
// 	<br />"Global.foo: " Global.foo
// </span>

// let world = { name: 'world', age: 4.6e9 }
// "hello " world.name ", you're " world.age " years old!"
// let age = 4.6e9e for tokenizer error
// let age 4.6e9 for parser error
// "hello " name.foo for compiler error
