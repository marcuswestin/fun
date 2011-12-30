var proto = require('std/proto'),
	extend = require('std/extend'),
	map = require('std/map')

/* Atomic expressions
 ********************/
var atomicBase = {
	asString:function() { return this.content ? this.content.toString() : '' },
	inspect:function() { return '<Text ' + this.content + '>'},
	atomic:true,
	evaluate:function(chain, defaultToUndefined) {
		if (chain && chain.length) { // tried to dereference a non-collection
			return defaultToUndefined ? undefined : nullValue
		}
		return this
	},
	equals:function(that) { return logic(this.type == that.type && this.content == that.content) },
	observe:function(namespace, callback) { callback() }
}

var number = module.exports.number = proto(function(content) { (typeof content == 'number' || TypeMismatch), this.content = content }, extend(atomicBase, {
	type:'number'
}))

var text = module.exports.text = proto(function(content) { (typeof content == 'string' || TypeMismatch), this.content = content }, extend(atomicBase, {
	type:'text'
}))

var logic = module.exports.logic = function(content) {
	return content ? trueValue : falseValue
}

module.exports.null = function() {
	return nullValue
}

var logicProto = proto(function(content) { this.content = content }, extend(atomicBase, {
	type:'logic',
	inspect:function() { return '<Bool True>' },
	asString:function() { return 'true' }
}))

var trueValue = logicProto(true),
	falseValue = logicProto(false)

var nullValue = {
	type:'null',
	atomic:true,
	asString:function() { return '' },
	inspect:function() { return '<Null>' },
	evaluate:function() { return this },
	equals:function(that) { return falseValue },
	observe:function(namespace, callback) { return callback() }
}


// don't like these...
module.exports.string = module.exports.text
module.exports.boolean = module.exports.logic

/* Collection expressions
 ************************/
var collectionBase = {
	atomic:false,
	asString:function() {
		return '{ '+map(this.content, function(value, name) { return name+':'+value.asString() }).join(', ')+' }'
	},
	evaluate:function(chain, defaultToUndefined) {
		if (!chain || !chain.length) { return this }
		var value = this.content[chain[0]]
		if (!value) { return defaultToUndefined ? undefined : nullValue }
		return value.evaluate(chain.slice(1))
	},
	equals:function(that) { return falseValue },
	observe:function(namespace, callback) { return callback() }
}

var dictionary = module.exports.dictionary = proto(function(content) { this.content = content }, extend(collectionBase, {
	type:'dictionary'
}))

/* Composite, variable and reference expressions
 ***********************************************/
var composite = module.exports.composite = proto(function(left, operator, right) { this.left = left, this.operator = operator, this.right = right }, {
	type:'composite',
	evaluate:function(chain, defaultToUndefined) {
		return operators[this.operator](this.left.evaluate(), this.right.evaluate()).evaluate(chain, defaultToUndefined)
	},
	equals:function(that) { return this.evaluate().equals(that) },
	observe:function(namespace, callback) {
		// TODO store observation IDs
		this.left.observe(null, callback)
		this.right.observe(null, callback)
	}
})

var _unique = 1
var variable = module.exports.variable = proto(function(content) { if (!content.evaluate) { asdasd }; this.content = content, this.observers = {} }, {
	type:'variable',
	evaluate:function(chain, defaultToUndefined) {
		return this.content.evaluate(chain, defaultToUndefined)
	},
	asString:function() { return this.content.asString() },
	equals:function(that) { return this.content.equals(that) },
	observe:function(chain, callback) {
		var namespace = chain ? chain.join('.') : ''
		if (!this.observers[namespace]) { this.observers[namespace] = {} }
		var uniqueID = 'u'+_unique++
		this.observers[namespace][uniqueID] = callback
		callback()
		return uniqueID
	},
	unobserve:function() { delete this.observers[namespace.join('.')][observationID] },
	set:function(chain, toValue) {
		var container = this,
			oldValue
		if (!chain || !chain.length) {
			oldValue = container.content
			container.content = toValue
		} else {
			chain = chain.join('.').split('.') // this is silly - make a copy of the array or don't modify it instead
			var lastName = chain.pop(),
				container = this.evaluate(chain, false)
			if (container === undefined) { return 'Null dereference in fun.set:evaluate' }
			if (container.type != 'dictionary') { return 'Attempted setting property of non-dictionary value' }
			oldValue = container.content[lastName]
			container.content[lastName] = toValue

			chain.push(lastName)
			
			notify(this, chain.join('.'))
		}

		// If a == { b:{ c:1, d:2 } } and we're setting a = 1, then we need to notify a, a.b, a.b.c and a.b.d that those values changed
		notifyProperties(this, chain, oldValue)

		// If a == 1 and we're setting a = { b:{ c:1, d:2 } }, then we need to notify a, a.b, a.b.c, a.b.d that those values changed
		notifyProperties(this, chain, toValue)

		notify(this, '')
	}
})

var notifyProperties = function(variable, chain, value) {
	if (!value || value.type != 'dictionary') { return }
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


var reference = module.exports.reference = proto(function(content, chain) { this.content = content, this.chain = chain }, {
	type:'reference',
	evaluate:function(chain, defaultToUndefined) {
		return this.content.evaluate(chain ? this.chain.concat(chain) : this.chain, defaultToUndefined)
	},
	equals:function(that) {
		return this.content.evaluate(this.chain).equals(that)
	},
	observe:function(chain, callback) {
		return this.content.observe(chain ? this.chain.concat(chain) : this.chain, callback)
	},
	asString:function() {
		return this.evaluate().asString()
	},
	set:function(chain, toValue) {
		return this.content.set(chain ? this.chain.concat(chain) : this.chain, toValue)
	}
})


var operators = {
	'+': add,
	'==': equals // I wonder if we should make this just = in the fun source, since we don't allow for assignment in mutating statements...
}

function add(left, right) {
	if (left.type == 'number' && right.type == 'number') {
		return number(left.content + right.content)
	}
	return text(left.asString() + right.asString())
}

function equals(left, right) { return left.evaluate().equals(right.evaluate()) }
