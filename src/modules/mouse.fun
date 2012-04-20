mouse = {
	x: 0,
	y: 0,
	isDown: false
}

<script mouse=mouse>
var on = require('fun/node_modules/dom/on')

// mouse.x, mouse.y
on(document, 'mousemove', function(e) {
	mouse.set(['x'], fun.expressions.Number(e.x))
	mouse.set(['y'], fun.expressions.Number(e.y))
})
// mouse.isDown
on(document, 'mousedown', function() {
	mouse.set(['isDown'], fun.expressions.Logic(true))
})
on(document, 'mouseup', function() {
	mouse.set(['isDown'], fun.expressions.Logic(false))
})
</script>
