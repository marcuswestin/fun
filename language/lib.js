(function() {
	jsio('from shared.javascript import blockCallback')
	
	var fun = window.fun = {},
		doc = document
	
	fun.getDomHook = function() {
		return doc.body.appendChild(doc.createElement('div'))
	}

	fun.on = function(element, eventName, handler) {
		if (element.addEventListener) {
			element.addEventListener(eventName, handler, false)
		} else if (element.attachEvent){
			element.attachEvent("on"+eventName, handler)
		}
	}
	
	fun.on(document, 'mousemove', function(e) {
		fin.setLocal('mouseX', e.clientX)
		fin.setLocal('mouseY', e.clientY)
	})
})();
