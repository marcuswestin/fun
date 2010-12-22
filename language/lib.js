// from lib.js
fun = {}
jsio('from shared.javascript import bind, blockCallback, getPromise');
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
	fun.hook = function(name, parentName, opts) {
		if (_hooks[name]) { return _hooks[name] }
		opts = opts || {}
		var parent = _hooks[parentName],
			hook = _hooks[name] = doc.createElement(opts.tagName || 'fun')
		
		for (var key in opts.attrs) { fun.attr(name, key, opts.attrs[key]) }
		
		if (_hookCallbacks[name]) {
			for (var i=0, callback; callback = _hookCallbacks[name][i]; i++) {
				callback(hook)
			}
		}
		
		if (!parent.childNodes.length || !opts.prepend) { parent.appendChild(hook) }
		else { parent.insertBefore(hook, parent.childNodes[0]) }
		
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

/* Mutations/Creations
 *********************/
	fun.mutate = function(op, id, propName, args) {
		var doMutate = bind(fin, 'mutate', op.toLowerCase(), id, propName, args)
		if (id == 'LOCAL') { doMutate() }
		else { fin.connect(doMutate) }
	}
	fun.cachedValue = function(id, propName) {
		var mutation = fin.getCachedMutation(id, propName)
		return mutation && mutation.value
	}
	fun.create = function(properties) {
		var promise = getPromise()
		fin.connect(bind(fin, 'create', properties, function() {
			promise.fulfill.apply(this, arguments)
		}))
		return promise
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
			callback(arg, mutation.op)
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
	
	fun.text = function(name, text) {
		_hooks[name].appendChild(document.createTextNode(text))
	}

/* Utility functions
 *******************/
	fun.block = blockCallback
	
	// wait until each item in items has received a mutation before calling callback;
	//  then call callback each time there is a mutation
	fun.dependOn = function(items, callback) {
		if (items.length == 0) { return callback() }
		var seen = {},
			waitingOn = items.length
		
		var onMutation = function(mutation) {
			if (waitingOn && !seen[mutation.id+':'+mutation.property]) {
				seen[mutation.id+':'+mutation.property] = true
				waitingOn--
			}
			if (!waitingOn) { callback() }
		}
		
		for (var i=0, item; item = items[i]; i++) {
			fun.observe('BYTES', item.id, item.property, onMutation)
		}
	}
	
	fun.waitForPromises = function(promises, callback) {
		if (promises.length == 0) { callback() }
		else {
			var block = blockCallback(callback)
			for (var i=0; i<promises.length; i++) {
				promises[i](block.addBlock())
			}
		}
	}
})()
