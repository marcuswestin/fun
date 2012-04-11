mouse = {
	x: 0,
	y: 0,
	isDown: false
}

<script mouse=mouse>
// mouse.x, mouse.y
fun.on(document, 'mousemove', function(e) {
	mouse.set(['x'], fun.expressions.Number(e.clientX))
	mouse.set(['y'], fun.expressions.Number(e.clientY))
})
// mouse.isDown
fun.on(document, 'mousedown', function() {
	mouse.set(['isDown'], fun.expressions.Logic(true))
})
fun.on(document, 'mouseup', function() {
	mouse.set(['isDown'], fun.expressions.Logic(false))
})
</script>
