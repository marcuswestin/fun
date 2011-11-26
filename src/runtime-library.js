fun = {}
;(function() {
	var _unique,
		_hooks, _hookCallbacks,
		_values, _observers
	
	var q = function(val) { return JSON.stringify(val) }
	
	fun.reset = function() {
		_unique = 0
		_hooks = {}
		_hookCallbacks = {}
		_values = { type:'OBJECT_LITERAL', content:{} }
		_observers = {}
	}
	
	fun.debugDump = function() {
		console.log({ _unique: 0, _hooks: {}, _hookCallbacks: {}, _values: {}, _observers: {} })
	}
	
	fun.name = function(readable) { return '_' + (readable || '') + '_' + (_unique++) }
	
	var nullValue = { type:'VALUE_LITERAL', content:null }
	fun.evaluate = function(expression, chain) {
		var value = getCurrentValue(expression)
		if (chain) {
			for (var i=0; i<chain.length; i++) {
				if (!value) { return undefined }
				value = value.content[chain[i]]
			}
		}
		if (!value) { return nullValue }
		return value
	}

	function getCurrentValue(expression) {
		switch(expression.type) {
			case 'VALUE_LITERAL': return expression
			case 'VARIABLE': return expression.content
			default: ASDASD
		}
	}

/* Values
 ********/
	
	fun.emit = function(parentHookName, value) {
		if (!value) { return fun.text(parentHookName, "<NULL>") }
		if (typeof value == 'number' || typeof value == 'string' || typeof value == 'boolean') { return fun.text(parentHookName, value) } // This feels wrong
		switch(value.type) {
			case 'REFERENCE':
				var hookName = fun.hook(fun.name(), parentHookName)
				fun.observe(namespace(value), function() {
					_hooks[hookName].innerHTML = ''
					var val = fun.get(namespace(value))
					// This doesn't feel right
					if (val && val.type == 'OBJECT_LITERAL') { deepEmit(hookName, val.content, namespace(value).split('.')) }
					else { fun.emit(hookName, val) }
				})
				break
			case 'VALUE_LITERAL':
				fun.text(parentHookName, value.value)
				break
			case 'OBJECT_LITERAL':
				deepEmit(fun.hook(fun.name(), parentHookName), value.content, [])
				break
		}
	}
	
	var deepEmit = function(hookName, content, baseNamespace) {
		fun.text(hookName, '{ ')
		var keys = Object.keys(content)
		for (var i=0, key; key=keys[i]; i++) {
			var valueHookName = fun.hook(fun.name(), hookName),
				value = content[key]
			fun.text(valueHookName, key+':')
			if (value.type == 'OBJECT_LITERAL') {
				deepEmit(valueHookName, value.content, baseNamespace.concat(key))
			} else if (value.type == 'REFERENCE') {
				fun.emit(valueHookName, value)
			} else {
				// This doesn't feel right
				fun.emit(valueHookName, { type:'REFERENCE', chain:baseNamespace.concat(key) })
			}
			if (i+1 < keys.length) { fun.text(valueHookName, ', ') }
		}
		fun.text(hookName, ' }')
	}
	
	var namespace = function(reference) {
		if (reference.value) { return [reference.value.name].concat(reference.chain).join('.') }
		else { return reference.chain.join('.') }
	}

/* Hooks
 *******/
	fun.setHook = function(name, dom) { _hooks[name] = dom }
	fun.getHook = function(name) { return _hooks[name] }
	fun.hook = function(name, parentName, opts) {
		if (_hooks[name]) { return name }
		opts = opts || {}
		var parent = _hooks[parentName],
			hook = _hooks[name] = document.createElement(opts.tagName || 'fun')
		
		for (var key in opts.attrs) { fun.attr(name, key, opts.attrs[key]) }
		
		if (_hookCallbacks[name]) {
			for (var i=0, callback; callback = _hookCallbacks[name][i]; i++) {
				callback(hook)
			}
		}
		
		if (!parent.childNodes.length || !opts.prepend) { parent.appendChild(hook) }
		else { parent.insertBefore(hook, parent.childNodes[0]) }
		
		return name
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

/* Values
 ********/
	fun.set = function(variable, chain, toValue) {
		var container = variable
		if (!chain) {
			container.content = toValue
		} else {
			chain = chain.split('.')
			var lastName = chain.pop(),
				container = fun.evaluate(variable, chain)
			if (container === undefined) { return 'Null dereference in fun.set:fun.evaluate' }
			if (container.type != 'OBJECT_LITERAL') { return 'Attempted setting property of non-object value' }
			container.content[lastName] = toValue
		}
		// TODO Notifications
		// // If a == { b:{ c:1, d:2 } } and we're setting a = 1, then we need to notify a, a.b, a.b.c and a.b.d that those values changed
		// notifyProperties(namespace, oldValue)
		// 
		// // If a == 1 and we're setting a = { b:{ c:1, d:2 } }, then we need to notify a, a.b, a.b.c, a.b.d that those values changed
		// notifyProperties(namespace, toValue)
		// 
		// notify(namespace)
	}
	var notifyProperties = function(baseNamespace, value) {
		if (!value || value.type != 'OBJECT_LITERAL') { return }
		for (var key in value.content) {
			var namespace = baseNamespace.concat(key)
			notify(namespace)
			notifyProperties(namespace, value.content[key])
		}
	}
	var notify = function(namespace) {
		var notify = _observers[namespace.join('.')]
		for (var id in notify) { notify[id]() }
	}
	
	fun.get = function(name, dontThrow) {
		var namespace = name.split('.'),
			value = _values.content[namespace[0]]
		for (var i=1; i<namespace.length; i++) {
			if (!value) {
				if (dontThrow) { return undefined }
				throw new Error('Null dereference in get: ' + namespace.join('.'))
			}
			if (value.type != 'OBJECT_LITERAL') {
				if (dontThrow) { return undefined }
				throw new Error('Tried to dereference a non-object in get: ' + namespace.join('.'))
			}
			value = value.content[namespace[i]]
		}
		return value
	}
	fun.observe = function(name, callback) {
		if (!_observers[name]) { _observers[name] = {} }
		var uniqueID = 'u'+_unique++
		_observers[name][uniqueID] = callback
		callback()
		return uniqueID
	}
	fun.unobserve = function(namespace, observationID) {
		delete observers[namespace.join('.')][observationID]
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
	
	fun.reflectStyles = function(hookName, values) {
		for (var key in values) {
			var value = values[key]
			switch(value.type) {
				case 'VALUE_LITERAL':
					fun.style(hookName, key, value.value)
					break
				case 'REFERENCE':
					(function(value, key) {
						fun.observe(namespace(value), function() {
							fun.style(hookName, key, fun.get(namespace(value)).value)
						})
					})(value, key)
			}
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
	
	fun.reflectInput = function(hookName, itemID, property, dataType) {
		var input = _hooks[hookName]
		fun.observe('BYTES', itemID, property, function(mutation) {
			input.value = mutation.value
		})
		fun.on(input, "keypress", function(e) {
			var oldValue = input.value
			setTimeout(function() {
				var value = input.value
				if (dataType == 'number') {
					if (!value) {
						value = input.value = 0
					} else if (value.match(/\d+/)) {
						value = parseInt(value, 10)
					} else {
						input.value = oldValue
						return
					}
				}
				input.value = value
				if (value == fun.cachedValue(itemID, property)) { return }
				fun.mutate("set", itemID, property, [value])
			}, 0)
		})
	}

/* DOM events
 ************/
	fun.cancel = function(e) {
		e.cancelBubble = true;
		if(e.stopPropagation) e.stopPropagation();
		if(e.preventDefault) e.preventDefault();
	}
	
	fun.isNumberKeyPress = function(e) {
		return 48 <= e.charCode && e.charCode <= 57
	}
	
/* Utility functions
 *******************/
	// wait until each item in items has received a mutation before calling callback;
	//  then call callback each time there is a mutation
	fun.dependOn = function(items, callback) {
		if (items.length == 0) { return callback() }
		var seen = {},
			waitingOn = 0
		
		var onMutation = function(mutation) {
			if (waitingOn && !seen[mutation.id+':'+mutation.property]) {
				seen[mutation.id+':'+mutation.property] = true
				waitingOn--
			}
			if (!waitingOn) { callback() }
		}
		
		for (var i=0, item; item = items[i]; i++) {
			// If the same item property is passed in twice, only mark it as being waited on once
			if (typeof seen[item.id+':'+item.property] != 'undefined') { continue }
			seen[item.id+':'+item.property] = false
			waitingOn++
			fun.observe('BYTES', item.id, item.property, onMutation)
		}
	}
	
	fun.displayText = function(namespace) {
		var val = fun.get(namespace, true)
		return (typeof val == 'object' ? q(val) : val)
	}
	
/* init & export
 ***************/
	fun.reset()
	if (typeof module != 'undefined') { module.exports = fun }
})()
