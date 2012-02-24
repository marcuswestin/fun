var expressions = require('./expressions'),
	each = require('std/each'),
	curry = require('std/curry'),
	throttle = require('std/throttle')

;(function() {
	if (typeof fun == 'undefined') { fun = {} }
	var _unique,
		_hooks, _hookCallbacks, _observers
	
	var q = function(val) { return JSON.stringify(val) }
	
	fun.reset = function() {
		_unique = 0
		_hooks = {}
		_hookCallbacks = {}
		_observers = {}
	}
	
	fun.debugDump = function() {
		console.log({ _unique: 0, _hooks: {}, _hookCallbacks: {}, _observers: {} })
	}
	
	fun.name = function(readable) { return '_' + (readable || '') + '_' + (_unique++) }

	fun.expressions = expressions
	
/* Values
 ********/
	fun.emit = function(parentHookName, value) {
		var hookName = fun.hook(fun.name(), parentHookName)
		value.observe(function() {
			_hooks[hookName].innerHTML = ''
			_hooks[hookName].appendChild(document.createTextNode(value.asString()))
		})
	}
	
	var _deepObserve = function(value, callback) {
		value.observe(function() {
			callback()
			var evaluated = value.evaluate()
			if (evaluated.isAtomic()) { return }
			evaluated.observe(function() {
				each(evaluated.content, function(subValue) {
					_deepObserve(subValue, callback)
				})
			})
		})
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
		var container = variable,
			oldValue
		if (!chain) {
			oldValue = container.content
			container.content = toValue
		} else {
			chain = chain.split('.')
			var lastName = chain.pop(),
				container = variable.evaluate(chain, false)
			if (container === undefined) { return 'Null dereference in fun.set:evaluate' }
			if (container.type != 'Dictionary') { return 'Attempted setting property of non-dictionary value' }
			oldValue = container.content[lastName]
			container.content[lastName] = toValue
			
			chain.push(lastName)
		}
		
		// If a == { b:{ c:1, d:2 } } and we're setting a = 1, then we need to notify a, a.b, a.b.c and a.b.d that those values changed
		notifyProperties(variable, chain, oldValue)

		// If a == 1 and we're setting a = { b:{ c:1, d:2 } }, then we need to notify a, a.b, a.b.c, a.b.d that those values changed
		notifyProperties(variable, chain, toValue)
		
		if (chain) { notify(variable, chain.join('.')) }
		notify(variable, '')
	}
	var notifyProperties = function(variable, chain, value) {
		if (!value || value.type != 'Dictionary') { return }
		for (var property in value.content) {
			var chainWithProperty = (chain || []).concat(property)
			notify(variable, chainWithProperty.join('.'))
			notifyProperties(variable, chainWithProperty, value.content[property])
		}
	}
	var notify = function(variable, namespace) {
		var observers = variable.observers[namespace]
		for (var id in observers) { observers[id]() }
	}
	
	fun.observe = function(variable, callback) { return variable.observe(callback) }
	fun.unobserve = function(observationID) { return variable.unobserve(observationID) }
/* DOM
 *****/
	fun.attr = function(name, key, value) {
		var match
		if (match = key.match(/^style\.(\w+)$/)) { fun.setStyle(name, match[1], value) }
		else { _hooks[name].setAttribute(key, value) }
	}
	
	// fun.style(hook, 'color', '#fff')
	fun.setStyle = function(hookName, key, value) {
		var rawValue = value.evaluate().asString()
		if (value.type == 'Number' || rawValue.match(/^\d+$/)) { rawValue = rawValue + 'px' }
		if (key == 'float') { key = 'cssFloat' }
		_hooks[hookName].style[key] = rawValue
	}
	
	fun.reflectStyles = function(hookName, values) {
		if (values.type != 'reference')
		// TODO detect when the dictionary mutates (values added and removed)
		each(values.content, function(val, key) {
			val.observe(function() {
				fun.setStyle(hookName, key, val)
			})
		})
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
	
	fun.reflectInput = function(hookName, property, dataType) {
		var input = _hooks[hookName]
		property.observe(function() {
			input.value = property.evaluate().asString()
		})
		fun.on(input, 'keypress', function(e) {
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
					property.set(null, fun.expressions.Number(value))
				} else {
					property.set(null, fun.expressions.Text(value))
				}
				input.value = value
			}, 0)
		})
	}

/* init & export
 ***************/
	fun.reset()
	if (typeof module != 'undefined') { module.exports = fun }
})()
