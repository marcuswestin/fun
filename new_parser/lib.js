// from lib.js
fun = {}

;(function() {
	var doc = document
	
	var _unique = 0
	fun.name = function(readable) { return '_' + (readable || '') + '$' + (_unique++) }
	
	var _hooks = {}
	fun.setHook = function(name, dom) { _hooks[name] = dom }
	fun.hook = function(parentName, name, tag, attrs) {
		if (_hooks[name]) { return _hooks[name] }
		var parent = _hooks[parentName],
			hook = _hooks[name] = parent.appendChild(doc.createElement(tag || 'span'))
		for (var key in attrs) {
			hook.setAttribute(key, attrs[key])
		}
		// var callbacks = hookCallbacks[hookID]
		// if (callbacks) { //
		// 	for (var i=0, callback; callback = callbacks[i]; i++) { callback(hook) }
		// 	delete hookCallbacks[hookID]
		// }
		return hook
	}
})()


initFunApp()
