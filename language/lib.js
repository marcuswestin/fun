(function() {
	jsio('from shared.javascript import blockCallback')
	
	var fun = window.fun = {},
		doc = document,
		hooks = window.hooks = {}
	
	fun.getDOMHook = function(parentHookID, hookID) {
		if (hooks[hookID]) { return hooks[hookID] }
		var parent = hooks[parentHookID]
		return hooks[hookID] = parent.appendChild(doc.createElement('span'))
	}
	
	fun.setDOMHook = function(hookID, domNode) {
		hooks[hookID] = domNode
	}
	
	fun.on = function(element, eventName, handler) {
		if (element.addEventListener) {
			element.addEventListener(eventName, handler, false)
		} else if (element.attachEvent){
			element.attachEvent("on"+eventName, handler)
		}
	}
	
	fun.getCallbackBlock = blockCallback
	
	fun.on(document, 'mousemove', function(e) {
		fin.setLocal('mouseX', e.clientX)
		fin.setLocal('mouseY', e.clientY)
	})
})();
