module.exports = {
	bind: bind,
	curry: curry,
	blockCallback: blockCallback,
	each: each,
	map: map,
	pick: pick,
	copyArray: copyArray,
	defineGetter: defineGetter
}

function curry(fn /* arg1, arg2, ... */) {
	var curryArgs = Array.prototype.slice.call(arguments, 1)
	return function() {
		var args = curryArgs.concat(Array.prototype.slice.call(arguments, 0))
		fn.apply(this, args)
	}
}

function bind(context, method/*, args... */) {
	if (!context || !method || (typeof method == 'string' && !context[method])) { console.log("bad bind arguments"); }
	var curryArgs = Array.prototype.slice.call(arguments, 2)
	return function() {
		fn = (typeof method == 'string' ? context[method] : method)
		return fn.apply(context, curryArgs.concat(Array.prototype.slice.call(arguments, 0)))
	}
}

function each(items, ctx, fn) {
	if (!items) { return }
	if (!fn) { fn = ctx, ctx = this }
	if (isArray(items)) {
		for (var i=0; i < items.length; i++) { fn.call(ctx, items[i], i) }
	} else {
		for (var key in items) { fn.call(ctx, items[key], key) }
	}
}

function map(items, fn) {
	var results = []
	each(items, function(item, key) { results.push(fn(item, key)) })
	return results
}

function pick(arr, fn) {
	var result = []
	for (var i=0, value; i < arr.length; i++) {
		value = fn(arr[i])
		if (value) { result.push(value) }
	}
	return result
}

// var stripRegexp = /^\s*(.*?)\s*$/
// exports.strip = function(str) {
// 	return str.match(stripRegexp)[1]
// }
// 
// exports.capitalize = function(str) {
// 	if (!str) { return '' }
// 	return str[0].toUpperCase() + str.substring(1)
// }
// 
function isArray(obj) {
	return Object.prototype.toString.call(obj) === '[object Array]'
}

function blockCallback(callback, opts) {
	opts = opts || {}
	opts.fireOnce = (typeof opts.fireOnce != 'undefined' ? opts.fireOnce : true)
	var blocks = 0,
		fired = false,
		result = {
		addBlock: function() { 
			blocks++ 
			var blockReleased = false
			return function(err) {
				if (err && opts.throwErr) {
					throw new Error(err)
				}
				if (blockReleased) {
					result.tryNow()
					return
				}
				blockReleased = true
				blocks--
				setTimeout(result.tryNow)
			}
		},
		tryNow: function() {
			if (fired && opts.fireOnce) { return }
			if (blocks == 0) {
				fired = true
				callback()
			}
		}
	}
	return result
}

function copyArray(array) {
	return Array.prototype.slice.call(array, 0)
}

function defineGetter(object, propertyName, getter) {
	var fn = object.defineGetter ? _w3cDefineGetter
		: object.__defineGetter__ ? _interimDefineGetter
		: Object.defineProperty ? _ie8DefineGetter
		: function() { throw 'defineGetter not supported' }
	
	module.exports.defineGetter = fn
	fn.apply(this, arguments)
}

var _w3cDefineGetter = function(object, propertyName, getter) {
	object.defineGetter(propertyName, getter)
}

var _interimDefineGetter = function(object, propertyName, getter) {
	object.__defineGetter__(propertyName, getter)
}

var _ie8DefineGetter = function(object, propertyName, getter) {
	Object.defineProperty(object, propertyName, { value:getter, enumerable:true, configurable:true })
}


// 
// exports.getDependable = function() {
// 	var dependants = [],
// 		dependable = {}
// 	
// 	dependable.depend = function(onFulfilled) {
// 		dependants.push(onFulfilled)
// 		if (dependable.fulfillment) {
// 			onFulfilled.apply(this, dependable.fulfillment)
// 		}
// 	}
// 	dependable.fulfill = function() {
// 		dependable.fulfillment = arguments
// 		for (var i=0; i < dependants.length; i++) {
// 			dependants[i].apply(this, dependable.fulfillment)
// 		}
// 	}
// 	return dependable
// }
// 
// exports.assert = function(shouldBeTrue, msg, values) {
// 	if (shouldBeTrue) { return }
// 	var moreInfo = values ? (' : ' + JSON.stringify(values)) : ''
// 	throw new Error(msg + moreInfo)
// }
