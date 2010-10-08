var sys = require('sys'),
	util = exports

util.q = function(obj) {
	return JSON.stringify(obj)
}

util.log = function() {
	sys.puts(Array.prototype.slice.call(arguments, 0).map(function(arg) {
		return JSON.stringify(arg)
	}).join("\n"))
}

util.join = function(args, glue) {
	return Array.prototype.join.call(args, glue || '')
}

var _uniqueId = 0
util.unique = function(name) { return '_u' + (_uniqueId++) + (name ? '_' + name : '') }

util.getCachedValue = function(reference) {
	var type = reference.type,
		name = reference.value
	
	if (type == 'REFERENCE') {
		return 'fun.getCachedValue('+util.q(reference.referenceType)+','+util.q(name)+')'
	} else if (type == 'STRING') {
		return util.q(name)
	} else if (type == 'NUMBER') {
		return name
	} else {
		throw util.error('Unknown reference type for getFinCached', {reference: reference})
	}
}

util.error = function(msg, values) {
	var moreInfo = values ? (' : ' + JSON.stringify(values)) : ''
	return new Error(msg + moreInfo)
}

util.assert = function(shouldBeTrue, msg, values) {
	if (shouldBeTrue) { return }
	throw util.error(msg, values)
}

util.getHookID = function() { return util.q(util.unique('hookID')) }
util.getName = function(isDynamic) { return util.unique('name') }
util.getHookCode = function(parentHookName, hookName, tagName, attrs) {
	util.assert(parentHookName && hookName, 'parentHookName and hookName must be defined')
	attrs = attrs || []
	var attrKVPs = {}
	
	return 'fun.getDOMHook('
		+ parentHookName + ', '
		+ hookName + ', '
		+ util.q(tagName||'span') + ', '
		+ JSON.stringify(attrs) + ')'
}

util.setReference = function(context, name, reference) {
	var referenceTable = context.referenceTable
	util.assert(!referenceTable[name], 'Repeat Declaration', {name:name})
	referenceTable[name] = reference
}
util.getReference = function(context, name) {
	var referenceTable = context.referenceTable
	util.assert(referenceTable[name], 'Undeclared Referene', {name: name, table: referenceTable})
	return referenceTable[name]
}

util.copy = function(obj, mergeIn) {
	var newObj = {}
	for (var key in obj) { newObj[key] = obj[key] }
	if (mergeIn) {
		for (var key in mergeIn) { newObj[key] = mergeIn[key] }
	}
	return newObj
}

util.CodeGenerator = Class(function() {
	
	this.init = function() {
		this._code = ["\n"]
		this._indentation = ['']
		this._variables = {}
	}
	
	this.code = function(code) { return this._add(util.join(arguments)) }
	
	this.log = function() {
		var args = Array.prototype.slice.call(arguments, 0)
		args = args.map(function(arg) {
			return typeof arg == 'string' ? arg : JSON.stringify(arg)
		})
		return this._add('window.console&&console.log('+util.join(args,',')+')')
	}
	
	this.newline = function(number) {
		return this._add(this._repeat("\n", number || 1))
	}
	
	this.boxComment = function(msg) {
		var len = msg.length + 2
		return this._add('/*' + this._repeat('*', len) + "**\n"
			+ ' * ' + msg + " *\n"
			+ ' *' + this._repeat('*', len) + "**/\n")
	}
	
	this._repeat = function(str, times) {
		var arr = []
		arr.length = times
		return arr.join(str)
	}
	
	this.closureStart = function() {
		return this._add(';(function(' + util.join(arguments, ',') + '){').indent(1);
	}
	this.closureEnd = function() {
		return this.indent(-1)._add('})(' + util.join(arguments, ',') + ')')
	}

	this.functionStart = function(name) {
		var args = Array.prototype.slice.call(arguments, 1)
		return this._add('function ' + name + '(' + args.join(',') + '){').indent(1)
	}
	this.functionEnd = function() {
		return this.indent(-1)._add('}')
	}
	this.callFunction = function(name) {
		var args = Array.prototype.slice.call(arguments, 1)
		return this._add(name + '(' + args.join(', ') + ')')
	}
	
	this.withHookStart = function(hook, argName) {
		return this.code('fun.withHook(', hook, ', function('+argName+') {\n').indent(1)
	}
	this.withHookEnd = function() { return this.indent(-1).code('})') }
	
	this.assign = function(name, value) {
		this._add((this._variables[name] || name.match(/[\[\.]/) ? '' : 'var ') + name + ' = ' + value)
		this._variables[name] = true
		return this
	}
	
	this.returnIfEqual = function(var1, var2) {
		return this._add ('if ('+var1+' == '+var2+') { return; }')
	}
	
	this.ifElse = function(condExpr, ifCode, elseCode) {
		return this
			._add('if ('+condExpr+') {', 1)
			._add(ifCode, -1)
			._add('} else {', 1)
			._add(elseCode, -1)
			._add('}')
	}
	
	this.observe = function(reference, callbackCode) {
		var type = reference.type,
			name = reference.value

		switch(type) {
			case 'REFERENCE':
				return this._add('fun.observe('+util.q(reference.referenceType)+', '+util.q(name)+', '+callbackCode+')')
			case 'NUMBER':
				return this
			default:
				throw new util.error('Unknown reference type for CodeGenerator#observe', {reference: reference, callbackCode: callbackCode})
		}
	}
	
	this.createHook = function(parentHook, hookName, tagName, attrs) {
		return this._add(util.getHookCode(parentHook, hookName, tagName, attrs))
	}
	this.declareName = function(name, value) {
		return this._add('var '+name+' = '+value)
	}
	this.declareHook = function(hookName) {
		return this.declareName(hookName, 'fun.getHookID()')
	}
	
	this.reflectInput = function(hook, reference) {
		return this.callFunction('fun.reflectInput', hook, util.q(reference.referenceType), util.q(reference.value))
	}
	
	this.bindStyle = function(hook, cssKey, reference) {
		return this.observe(reference, 'fun.getStyleHandler('+hook+','+util.q(cssKey)+')')
	}
	
	this.bindAttribute = function(hook, attrName, reference) {
		return this.observe(reference, 'fun.getAttributeHandler('+hook+','+util.q(attrName)+')')
	}
	
	this.mutate = function(mutationType, target, source) {
		return this.callFunction('fun.mutate', 
				util.q(mutationType),
				util.q(target.referenceType),
				util.q(target.value),
				util.getCachedValue(source))
	}
	
	this._add = function(code) {
		this._code.push(this._indentation.join("\t") + code)
		return this
	}
	this.indent = function(delta) {
		this._indentation.length += delta
		return this
	}
	
	this.toString = function() { return this._code.join("\n") }
})

function Class (parent, proto) {
	if(!proto) { proto = parent }
	proto.prototype = parent.prototype
	
	var cls = function() { if(this.init) { this.init.apply(this, arguments) }}
	cls.prototype = new proto(function(context, method, args) {
		var target = parent
		while(target = target.prototype) {
			if(target[method]) {
				return target[method].apply(context, args || [])
			}
		}
		throw new Error('supr: parent method ' + method + ' does not exist')
	})
	
	// Sometimes you want a method that renders UI to only execute once if it's called 
	// multiple times within a short time period. Delayed methods do just that
	cls.prototype.createDelayedMethod = function(methodName, fn) {
		// "this" is the class
		this[methodName] = function() {
			// now "this" is the instance. Each instance gets its own function
			var executionTimeout
			this[methodName] = bind(this, function() {
				clearTimeout(executionTimeout)
				executionTimeout = setTimeout(bind(fn, 'apply', this, arguments), 10)
			})
			this[methodName].apply(this, arguments)
		}
	}
	
	cls.prototype.constructor = cls
	return cls
}
