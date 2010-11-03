// from lib.js
fun = {}
jsio('from shared.javascript import bind, blockCallback');
;(function() {
	
	var doc = document
	
	var _unique = 0
	fun.name = function(readable) { return '_' + (readable || '') + '$' + (_unique++) }

/* Hooks
 *******/
	var _hooks = {}
	fun.setHook = function(name, dom) { _hooks[name] = dom }
	fun.getHook = function(name) { return _hooks[name] }
	fun.hook = function(parentName, name, tag, attrs) {
		if (_hooks[name]) { return _hooks[name] }
		var parent = _hooks[parentName],
			hook = _hooks[name] = parent.appendChild(doc.createElement(tag || 'fun'))
		for (var key in attrs) {
			if (key == 'style') { fun.style(name, attrs[key]) }
			else { hook.setAttribute(key, attrs[key]) }
		}
		return hook
	}
	fun.destroyHook = function(hookName) {
		if (!_hooks[hookName]) { return }
		_hooks[hookName].innerHTML = ''
	}

/* Mutations
 ***********/
	fun.mutate = function(op, id, propName, arg) {
		var doMutate = bind(fin, op.toLowerCase(), id, propName, arg)
		if (id == 'LOCAL') { doMutate() }
		else { fin.connect(doMutate) }
	}

	
/* Observations
 **************/
	fun.observe = function(type, id, propName, callback) {
		var methodName = (type == 'BYTES' ? 'observe' : type == 'LIST' ? 'observeList' : null),
			doObserve = bind(fin, methodName, id, propName, callback)
		if (id == 'LOCAL') { doObserve() }
		else { fin.connect(doObserve) }
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
