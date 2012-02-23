var Mouse = {
	x: 0,
	y: 0,
	isDown: false
}

<script Mouse=Mouse>
// Mouse.x, Mouse.y
fun.on(document, 'mousemove', function(e) {
	Mouse.set(['x'], fun.expressions.Number(e.clientX))
	Mouse.set(['y'], fun.expressions.Number(e.clientY))
})
// Mouse.isDown
fun.on(document, 'mousedown', function() {
	Mouse.set(['isDown'], fun.expressions.logic(true))
})
fun.on(document, 'mouseup', function() {
	Mouse.set(['isDown'], fun.expressions.logic(false))
})
</script>
