// from lib.js
fun = {}
jsio('from shared.javascript import bind, blockCallback');
;(function() {
	
	var doc = document
	
	var _unique = 0
	fun.name = function(readable) { return '_' + (readable || '') + '$' + (_unique++) }

/* Hooks
 *******/
	var _hooks = {},
		_hookCallbacks = {}
	fun.setHook = function(name, dom) { _hooks[name] = dom }
	fun.getHook = function(name) { return _hooks[name] }
	fun.hook = function(parentName, name, tag, attrs) {
		if (_hooks[name]) { return _hooks[name] }
		var parent = _hooks[parentName],
			hook = _hooks[name] = parent.appendChild(doc.createElement(tag || 'fun'))
		
		for (var key in attrs) { fun.attr(name, key, attrs[key]) }
		
		if (_hookCallbacks[name]) {
			for (var i=0, callback; callback = _hookCallbacks[name][i]; i++) {
				callback(hook)
			}
		}
		return hook
	}
	fun.destroyHook = function(hookName) {
		if (!_hooks[hookName]) { return }
		_hooks[hookName].innerHTML = ''
	}
	fun.withHook = function(hookName, callback) {
		if (_hooks[hookName]) { return callback(_hooks[hookName]) }
		else if (_hookCallbacks[hookName]) { _hookCallbacks[hookName].push(callback) }
		else { _hookCallbacks[hookName] = [callback] }
	}

/* Mutations
 ***********/
	fun.mutate = function(op, id, propName, arg) {
		var doMutate = bind(fin, op.toLowerCase(), id, propName, arg)
		if (id == 'LOCAL') { doMutate() }
		else { fin.connect(doMutate) }
	}
	fun.cachedValue = function(id, propName) {
		var mutation = fin.getCachedMutation(id, propName)
		return mutation && mutation.value
	}
	
/* Observations
 **************/
	fun.observe = function(type, id, propName, callback) {
		var methodName = (type == 'BYTES' ? 'observe' : type == 'LIST' ? 'observeList' : null),
			doObserve = bind(fin, methodName, id, propName, callback)
		if (id == 'LOCAL') { doObserve() }
		else { fin.connect(doObserve) }
	}
	fun.splitListMutation = function(callback, mutation) {
		var args = mutation.args
		for (var i=0, arg; arg = args[i]; i++) {
			callback(arg)
		}
	}
	
/* DOM
 *****/
	fun.attr = function(name, key, value) {
		var match
		if (match = key.match(/^style\.(\w+)$/)) {
			fun.style(name, match[1], value)
		} else {
			_hooks[name].setAttribute(key, value)
		}
	}
	
	// fun.style(hook, 'color', '#fff') or fun.style(hook, { color:'#fff', width:100 })
	fun.style = function(name, key, value) {
		if (typeof key == 'object') {
			for (var styleKey in key) { fun.style(name, styleKey, key[styleKey]) }
		} else {
			if (typeof value == 'number') { value = value + 'px' }
			if (key == 'float') { key = 'cssFloat' }
			_hooks[name].style[key] = value
		}
	}
	
	fun.on = function(element, eventName, handler) {
		if (element.addEventListener) {
			element.addEventListener(eventName, handler, false)
		} else if (element.attachEvent){
			element.attachEvent("on"+eventName, handler)
		}
	}

/* Utility functions
 *******************/
	fun.block = blockCallback
})()
