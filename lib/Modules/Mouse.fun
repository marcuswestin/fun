let Mouse = {
	x: 0,
	y: 0,
	isDown: false
}

<script>
/* Mouse.x and Mouse.y
 *********************/
fun.on(document, 'mousemove', function(e) {
	fun.set('Mouse.x', e.clientX)
	fun.set('Mouse.y', e.clientY)
})

/* Mouse.isDown
 **************/
fun.on(document, 'mousedown', function() {
	fun.set('Mouse.isDown', true)
})
fun.on(document, 'mouseup', function() {
	fun.set('Mouse.isDown', false)
})
</script>