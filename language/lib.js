(function() {
	jsio('from shared.javascript import bind, blockCallback')
	
	var fun = window.fun = {},
		doc = document,
		hooks = window.hooks = {}
	
	fun.getDOMHook = function(parentHookID, hookID, tag, attrs) {
		if (hooks[hookID]) { return hooks[hookID] }
		var parent = hooks[parentHookID]
		var hook = hooks[hookID] = parent.appendChild(doc.createElement(tag||'span'))
		for (var key in attrs) {
			hook.setAttribute(key, attrs[key])
		}
		return hook;
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
	
	fun.set = function(id, propName, callback) {
		if (id == 'LOCAL') { fin.setLocal(propName, callback) }
		else if (id == 'GLOBAL') { fin.connect(bind(fin, 'setGlobal', propName, callback)) }
		else { fin.connect(bind(fin, 'set', id, propName, callback)) }
	}
	
	fun.observe = function(id, propName, callback) {
		if (id == 'LOCAL') { fin.observeLocal(propName, callback) }
		else if (id == 'GLOBAL') { fin.connect(bind(fin, 'observeGlobal', propName, callback)) }
		else { fin.connect(bind(fin, 'observe', id, propName, callback)) }
	}
	
	fun.getCallbackBlock = blockCallback
	
	fun.on(document, 'mousemove', function(e) {
		fun.set('LOCAL', 'mouseX', e.clientX)
		fun.set('LOCAL', 'mouseY', e.clientY)
	})
	fun.set('LOCAL', 'mouseX', 0)
	fun.set('LOCAL', 'mouseY', 0)
})();
