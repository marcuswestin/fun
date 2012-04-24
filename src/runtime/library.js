var expressions = require('./expressions'),
	each = require('fun/node_modules/std/each'),
	curry = require('fun/node_modules/std/curry'),
	throttle = require('fun/node_modules/std/throttle'),
	addClass = require('fun/node_modules/dom/addClass'),
	removeClass = require('fun/node_modules/dom/removeClass'),
	on = require('fun/node_modules/dom/on'),
	off = require('fun/node_modules/dom/off'),
	arrayToObject = require('fun/node_modules/std/arrayToObject')

;(function() {
	if (typeof fun == 'undefined') { fun = {} }
	var _unique, _hooks, _hookCallbacks
	
	fun.reset = function() {
		_unique = 0
		fun.expressions = expressions
		_hooks = fun.hooks = {}
		_hookCallbacks = {}
	}
	
	fun.name = function(readable) { return '_' + (readable || '') + '_' + (_unique++) }

/* Values
 ********/
	fun.emit = function(parentHookName, value) {
		if (!value) { return }
		var hookName = fun.hook(fun.name(), parentHookName)
		value.observe(function() {
			_hooks[hookName].innerHTML = ''
			_hooks[hookName].appendChild(document.createTextNode(value.asString()))
		})
	}
	
/* Hooks
 *******/
	fun.setHook = function(name, dom) { _hooks[name] = dom }
	fun.hook = function(name, parentName, opts) {
		if (_hooks[name]) { return name }
		opts = opts || {}
		var parent = _hooks[parentName],
			hook = _hooks[name] = document.createElement(opts.tagName || 'hook')
		
		each(opts.attrs, function(attr) {
			if (attr.expand) { fun.attrExpand(name, attr.expand) }
			else { fun.attr(name, attr.name, attr.value) }
		})
		
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

	fun.attr = function(hookName, key, value) {
		if (key == 'data') {
			fun.reflectInput(hookName, value)
			return
		}
		var hook = _hooks[hookName],
			lastValue
		value.observe(function() {
			if (match = key.match(/^on(\w+)$/)) {
				if (lastValue) { off(hook, eventName, lastValue) }
				
				var eventName = match[1].toLowerCase()
				if (value.getType() != 'Handler') {
					console.warn('Event attribute', eventName, 'value is not a Handler')
					return
				}
				on(hook, eventName, lastValue = function(e) {
					e.hook = hook
					value.evaluate().handle([expressions.Event(e)])
				})
			} else if (key == 'style') {
				// TODO remove old styles
				each(value.getContent(), function(val, key) {
					fun.setStyle(hook, key, val)
				})
			} else if (key == 'class' || key == 'className') {
				if (lastValue) { removeClass(hook, lastValue) }
				addClass(hook, lastValue = value.getContent())
			} else {
				hook.setAttribute(key, value.getContent())
			}
		})
	}
	
	fun.attrExpand = function(hookName, expandValue) {
		// TODO Observe the expandValue, and detect keys getting added/removed properly
		each(expandValue.getContent(), function(value, name) {
			fun.attr(hookName, name, value)
		})
	}

	var skipPx = arrayToObject(['zIndex', 'z-index'])
	fun.setStyle = function(hook, key, value) {
		var rawValue = value.evaluate().asString()
		if ((value.getType() == 'Number' || rawValue.match(/^\d+$/)) && !skipPx[key]) {
			rawValue = rawValue + 'px'
		}
		if (key == 'float') { key = 'cssFloat' }
		hook.style[key] = rawValue
	}
	
	fun.reflectInput = function(hookName, property) {
		var input = _hooks[hookName]
		if (input.type == 'checkbox') {
			property.observe(function() {
				input.checked = property.getContent() ? true : false
			})
			on(input, 'change', function() {
				setTimeout(function() {
					property.set(null, input.checked ? fun.expressions.Yes : fun.expressions.No)
				})
			})
		} else {
			property.observe(function() {
				input.value = property.evaluate().asString()
			})
			
			function update(e) {
				setTimeout(function() {
					var value = input.value
					if (property.getContent() === value) { return }
					property.set(null, fun.expressions.Text(input.value))
					input.value = value
				}, 0)
			}
			
			on(input, 'keypress', update)
			on(input, 'keyup', update)
			on(input, 'keydown', function(e) {
				if (e.keyCode == 86) { update(e) } // catch paste events
			})
		}
	}

/* init & export
 ***************/
	fun.reset()
	if (typeof module != 'undefined') { module.exports = fun }
})()
