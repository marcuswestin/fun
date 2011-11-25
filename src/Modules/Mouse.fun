var Mouse = {
	x: 0,
	y: 0,
	isDown: false
}

<script>
/* Mouse.x and Mouse.y
 *********************/
fun.on(document, 'mousemove', function(e) {
	fun.set('Mouse.x', { type:'VALUE_LITERAL', value:e.clientX })
	fun.set('Mouse.y', { type:'VALUE_LITERAL', value:e.clientY })
})

/* Mouse.isDown
 **************/
fun.on(document, 'mousedown', function() {
	fun.set('Mouse.isDown', { type:'VALUE_LITERAL', value:true })
})
fun.on(document, 'mouseup', function() {
	fun.set('Mouse.isDown', { type:'VALUE_LITERAL', value:false })
})
</script>