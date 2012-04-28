mouse = {
	x: 0,
	y: 0,
	isDown: false
}

<script mouse=mouse>
var on = require('dom/on')

mouse = mouse.evaluate()

// mouse.x, mouse.y
on(document, 'mousemove', function(e) {
	fun.dictSet(mouse, 'x', fun.expressions.Number(e.x))
	fun.dictSet(mouse, 'y', fun.expressions.Number(e.y))
})
// mouse.isDown
on(document, 'mousedown', function() {
	fun.dictSet(mouse, 'isDown', fun.expressions.Logic(true))
})
on(document, 'mouseup', function() {
	fun.dictSet(mouse, 'isDown', fun.expressions.Logic(false))
})
</script>
