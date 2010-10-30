fun.on(document, 'mousemove', function(e) {
	fun.mutate('SET', 'LOCAL', '__mouseX__', e.clientX)
	fun.mutate('SET', 'LOCAL', '__mouseY__', e.clientY)
})
fun.mutate('SET', 'LOCAL', '__mouseX__', 0)
fun.mutate('SET', 'LOCAL', '__mouseY__', 0)
