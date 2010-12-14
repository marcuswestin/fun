/* Mouse.x and Mouse.y
 *********************/
fun.on(document, 'mousemove', function(e) {
	fun.mutate('SET', 'LOCAL', '__mouseX__', [e.clientX])
	fun.mutate('SET', 'LOCAL', '__mouseY__', [e.clientY])
})
fun.mutate('SET', 'LOCAL', '__mouseX__', [0])
fun.mutate('SET', 'LOCAL', '__mouseY__', [0])

/* Mouse.isDown
 **************/
fun.on(document, 'mousedown', function() {
	fun.mutate('SET', 'LOCAL', '__mouseIsDown__', [true])
})
fun.on(document, 'mouseup', function() {
	fun.mutate('SET', 'LOCAL', '__mouseIsDown__', [false])
})
fun.mutate('SET', 'LOCAL', '__mouseIsDown__', [false])
