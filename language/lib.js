(function() {
	jsio('from shared.javascript import bind, blockCallback')
	
	var fun = window.fun = {},
		doc = document,
		hooks = fun.hooks = {},
		hookCallbacks = {}
	
	fun.getDOMHook = function(parentHookID, hookID, tag, attrs) {
		if (hooks[hookID]) { return hooks[hookID] }
		var parent = hooks[parentHookID]
		var hook = hooks[hookID] = parent.appendChild(doc.createElement(tag||'span'))
		for (var key in attrs) {
			hook.setAttribute(key, attrs[key])
		}
		var callbacks = hookCallbacks[hookID]
		if (callbacks) {
			for (var i=0, callback; callback = callbacks[i]; i++) { callback(hook) }
			delete hookCallbacks[hookID]
		}
		return hook
	}
	
	fun.hook = function(hookID) { return hooks[hookID] }
	
	fun.value = function(hookID, value) {
		hooks[hookID].value = value
	}
	
	fun.setDOMHook = function(hookID, domNode) {
		hooks[hookID] = domNode
	}
	
	fun.set = function(id, propName, callback) {
		if (id == 'LOCAL') {
			fin.setLocal(propName, callback)
		} else if (id == 'GLOBAL') {
			fin.connect(bind(fin, 'setGlobal', propName, callback))
		} else {
			fin.connect(bind(fin, 'set', id, propName, callback))
		}
	}
	
	fun.observe = function(id, propName, callback) {
		if (id == 'LOCAL') {
			fin.observeLocal(propName, callback)
		} else if (id == 'GLOBAL') {
			fin.connect(bind(fin, 'observeGlobal', propName, callback))
		} else {
			fin.connect(bind(fin, 'observe', id, propName, callback))
		}
	}
	
	fun.getCachedValue = function(type, prop) {
		if (type == 'LOCAL') {
			return fin.getLocalCachedMutation(prop).value
		} else if (type == 'GLOBAL') {
			return fin.getGlobalCachedMutation(prop).value
		}
	}
	
	fun.withHook = function(hookID, callback) {
		var hook = hooks[hookID]
		if (hook) {
			callback(hook)
		} else if (hookCallbacks[hookID]) {
			hookCallbacks[hookID].push(callback)
		} else {
			hookCallbacks[hookID] = [callback]
		}
	}
	
	fun.reflectInput = function(hook, id, prop) {
		fun.withHook(hook, function(input) {
			fun.observe(id, prop, function(mutation, value){ input.value = value })
			input.onkeypress = function() { setTimeout(function() {
				fun.set(id, prop, input.value)
			}, 0)}
		})
	}
	
	fun.getStyleHandler = function(hook, styleProp) {
		return function(mutation, value) {
			if (!hooks[hook]) { return }
			hooks[hook].style[styleProp] = (typeof value == 'number' ? value + 'px' : value);
		}
	}

	fun.getAttributeHandler = function(hook, attrName) {
		return function(mutation, value) {
			if (!hooks[hook]) { return }
			hooks[hook][attrName] = value;
		}
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
		fun.set('LOCAL', 'mouseX', e.clientX)
		fun.set('LOCAL', 'mouseY', e.clientY)
	})
	fun.set('LOCAL', 'mouseX', 0)
	fun.set('LOCAL', 'mouseY', 0)
})();
