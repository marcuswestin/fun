var Mouse = {
	x: 0,
	y: 0,
	isDown: false
}

<script>
/* Mouse.x and Mouse.y
 *********************/
fun.on(document, 'mousemove', function(e) {
	_variableName_Mouse.set(['x'], fun.expressions.number(e.clientX))
	_variableName_Mouse.set(['y'], fun.expressions.number(e.clientY))
})

/* Mouse.isDown
 **************/
fun.on(document, 'mousedown', function() {
	_variableName_Mouse.set(['isDown'], fun.expressions.logic(true))
})
fun.on(document, 'mouseup', function() {
	_variableName_Mouse.set(['isDown'], fun.expressions.logic(false))
})
</script>
