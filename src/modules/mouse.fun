mouse = {
	x: 0,
	y: 0,
	isDown: false
}

<script mouse=mouse>
var on = require('fun/node_modules/dom/on')

// mouse.x, mouse.y
on(document, 'mousemove', function(e) {
	fun.set(mouse, 'x', fun.expressions.Number(e.x))
	fun.set(mouse, 'y', fun.expressions.Number(e.y))
})
// mouse.isDown
on(document, 'mousedown', function() {
	fun.set(mouse, 'isDown', fun.expressions.Logic(true))
})
on(document, 'mouseup', function() {
	fun.set(mouse, 'isDown', fun.expressions.Logic(false))
})
</script>
