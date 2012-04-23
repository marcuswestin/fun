var proto = require('std/proto'),
	create = require('std/create'),
	map = require('std/map'),
	isArray = require('std/isArray'),
	bind = require('std/bind')

/* Value bases
 *************/
var base = module.exports.base = {
	observe:function(callback) { callback() },
	asJSON:function() { return this.asLiteral() },
	asJSONObject:function() { return JSON.parse(this.asJSON()) }, // HACK
	isTruthy:function() { return true },
	isNull:function() { return false },
	iterate:function() {},
	getters:{
		copy:function() {
			var self = this
			return module.exports.Function(function(yieldValue) {
				yieldValue(self.getContent())
			})
		},
		type:function() {
			return Text(this.getType())
		}
	}
}

var constantAtomicBase = create(base, {
	inspect:function() { return '<'+this._type+' ' + this.asLiteral() + '>' },
	getType:function() { return this._type },
	evaluate:function() { return this },
	isAtomic:function() { return true },
	isMutable:function() { return false },
	asString:function() { return this._content.toString() },
	equals:function(that) { return (this.getType() == that.getType() && this.getContent() == that.getContent()) ? Yes : No },
	getContent:function() { return this._content },
	hasVariableContent:function() { return false },
	dismiss:function(id) { /* This function intentionally left blank */  }
})

var invocableBase = create(constantAtomicBase, {
	asLiteral:function() { return '<block>' }
})

var variableValueBase = create(base, {
	isAtomic:function() { return this.evaluate().isAtomic() },
	getType:function() { return this.evaluate().getType() },
	asString:function() { return this.evaluate().asString() },
	asLiteral:function() { return this.evaluate().asLiteral() },
	equals:function(that) { return this.evaluate().equals(that) },
	getContent:function() { return this.evaluate().getContent() },
	isTruthy:function() { return this.evaluate().isTruthy() },
	hasVariableContent:function() { return true }
})

var mutableBase = create(variableValueBase, {
	isMutable:function() { return true },
	notifyObservers:function() {
		for (var key in this.observers) {
			this.observers[key]()
		}
	},
	observe:function(callback) {
		var uniqueID = 'u'+_unique++
		this.observers[uniqueID] = callback
		callback()
		return uniqueID
	},
	dismiss:function(uniqueID) {
		if (!this.observers[uniqueID]) {
			throw new Error("Tried to dismiss an observer by incorrect ID")
		}
		delete this.observers[uniqueID]
	},
	onNewValue:function(oldValue, observationId, newValue) {
		if (oldValue && oldValue.hasVariableContent()) {
			oldValue.dismiss(observationId)
		}
		if (newValue.hasVariableContent()) {
			return newValue.observe(bind(this, this.notifyObservers))
		} else {
			this.notifyObservers()
		}
	}
})

var collectionBase = create(mutableBase, {
	isAtomic:function() { return false },
	getType:function() { return this._type },
	evaluate:function() { return this },
	getContent:function() { return this._content },
	isTruthy:function() { return true },
	set:function(chain, value) {
		if (!chain || !chain.length) {
			throw new Error("Attempted setting collection property without a chain")
		}
		var prop = chain[0]
		if (chain.length == 1) {
			var oldValue = this._content[prop]
			this._content[prop] = value
			this._observationIDs[prop] = this.onNewValue(oldValue, this._observationIDs[prop], value)
		} else if (!this._content[prop]) {
			throw new Error('Attempted to set the value of a null property')
		} else if (!this._content[prop].isMutable()) {
			throw new Error("Attempted to set the value of a non-mutable property")
		} else {
			this._content[prop].set(chain.slice(1), value)
		}
	}
})

/* Atomic, immutable expressions
 *******************************/
var Number = module.exports.Number = proto(constantAtomicBase,
	function(content) {
		if (typeof content != 'number') { TypeMismatch }
		this._content = content
	}, {
		_type:'Number',
		asLiteral:function() { return this._content },
		isTruthy: function() { return this._content != 0 }
	}
)

var Text = module.exports.Text = proto(constantAtomicBase,
	function(content) {
		if (typeof content != 'string') { TypeMismatch }
		this._content = content
	}, {
		_type:'Text',
		asLiteral:function() { return '"'+this._content+'"' }
	}
)

var Logic = module.exports.Logic = function(content) {
	if (typeof content != 'boolean') { TypeMismatch }
	return content ? Yes : No
}

var LogicProto = proto(constantAtomicBase,
	function(content) {
		this._content = content
	}, {
		_type:'Logic',
		asString:function() { return this._content ? 'yes' : 'no' },
		asLiteral:function() { return this._content ? 'true' : 'false' },
		isTruthy:function() { return this._content }
	}
)

var Yes = module.exports.Yes = LogicProto(true),
	No = module.exports.No = LogicProto(false)

var NullValue = (proto(constantAtomicBase,
	function() {
		if (arguments.length) { TypeMismatch }
	}, {
		_type:'Null',
		inspect:function() { return '<Null>' },
		asString:function() { return '' },
		equals:function(that) { return that.getType() == 'Null' ? Yes : No },
		asLiteral:function() { return 'null' },
		isTruthy:function() { return false },
		isNull:function() { return true }
	}
))();

module.exports.Null = function() { return NullValue }

module.exports.Function = proto(invocableBase,
	function(block) {
		if (typeof block != 'function') { TypeMismatch }
		this._content = block
	}, {
		_type:'Function',
		invoke:function(args) {
			var invocationValue = variable(NullValue)
			var yieldValue = function(value) { invocationValue.set(null, fromJsValue(value)) }
			var __hackFirstExecution = true
			var executeBlock = bind(this, function() {
				if (waitForSetup) { return }
				var isFirstExecution = __hackFirstExecution
				__hackFirstExecution = false
				this._content.apply(this, [yieldValue, isFirstExecution].concat(args))
			})
			
			var waitForSetup = true
			for (var i=0; i<args.length; i++) {
				var arg = args[i]
				if (arg) { arg.observe(executeBlock) }
			}
			waitForSetup = false
			executeBlock()
			
			return invocationValue
		}
	}
)

function waitFor(fn) {
	var waitingFor = 0
	return {
		addWaiter:function() {
			var responded = false
			waitingFor++
			return function() {
				if (!responded) {
					responded = true
					waitingFor--
				}
				if (!waitingFor) { fn() }
			}
		},
		tryNow:function() {
			if (!waitingFor) { fn() }
		}
	}
}

module.exports.Handler = proto(invocableBase,
	function(block) {
		if (typeof block != 'function') { TypeMismatch }
		this._content = block
	}, {
		_type:'Handler',
		invoke:function(element, event) {
			this._content.call(element, event)
		}
	}
)

module.exports.Template = proto(invocableBase,
	function(block) {
		if (typeof block != 'function') { TypeMismatch }
		this._content = block
	}, {
		_type:'Template',
		render:function(hookName, args) {
			this._content.apply(this, [hookName].concat(args))
			return NullValue // This is a bit ghetto - allows template invocations to render nothing. I'm thinking more and more that template invocations may want their own syntax (<templateName foo=foo, bar=bar, gee=gee> </templateName>)
		}
	}
)

/* Variable value expressions
 ****************************/
var composite = module.exports.composite = proto(variableValueBase,
	function(left, operator, right) {
		if (typeof operator != 'string') { TypeMismatch }
		// TODO typecheck left and right
		this.left = left
		this.right = right
		this.operator = operator
	}, {
		_type:'composite',
		evaluate:function() { return operators[this.operator](this.left, this.right) },
		observe:function(callback) {
			this._leftId = this.left.observe(callback)
			this._rightId = this.right.observe(callback)
		},
		dismiss:function() {
			this.left.dismiss(this._leftId)
			this.right.dismiss(this._rightId)
		}
	}
)

module.exports.ternary = proto(variableValueBase,
	function(condition, ifValue, elseValue) {
		this.condition = condition
		this.ifValue = ifValue
		this.elseValue = elseValue
	}, {
		_type:'ternary',
		evaluate:function() { return this.condition.getContent() ? this.ifValue.evaluate() : this.elseValue.evaluate() },
		observe:function(callback) {
			this._conditionId = this.condition.observe(callback)
			this._ifValueId = this.ifValue.observe(callback)
			this._elseValueId = this.elseValue.observe(callback)
		},
		dismiss:function() {
			this.condition.dismiss(this._conditionID)
			this.ifValue.dismiss(this._ifValueId)
			this.elseValue.dismiss(this._elseValueId)
		}
	})

module.exports.unary = proto(variableValueBase,
	function(operator, value) {
		this.operator = operator
		this.value = value
	}, {
		_type:'unary',
		evaluate:function() { return unaryOperators[this.operator](this.value.evaluate()) },
		observe:function(callback) { this._valueId = this.value.observe(callback) },
		dismiss:function() { this.value.dismiss(this._valueId) }
	})

var unaryOperators = {
	'!': function not(value) { return Logic(!value.isTruthy()) },
	'-': function negative(value) { return value.getType() == 'Number' ? Number(-value.getContent()) : NullValue }
}

var operators = {
	'+': add,
	'-': subtract,
	'/': divide,
	'*': multiply,
	'=': equals,
	'==': equals, // I wonder if we should make this just = in the fun source, since we don't allow for assignment in mutating statements...
	'!': notEquals,
	'!=': notEquals, // We may want to just use ! since it's `foo is ! 'hi'` now
	'>=': greaterThanOrEquals,
	'<=': lessThanOrEquals,
	'<': lessThan,
	'>': greaterThan
}

function add(left, right) {
	if (left.getType() == 'Number' && right.getType() == 'Number') {
		return Number(left.getContent() + right.getContent())
	}
	return Text(left.asString() + right.asString())
}

function subtract(left, right) {
	if (left.getType() == 'Number' && right.getType() == 'Number') {
		return Number(left.getContent() - right.getContent())
	} else {
		return NullValue
	}
}

function divide(left, right) {
	if (left.getType() == 'Number' && right.getType() == 'Number') {
		return Number(left.getContent() / right.getContent())
	} else {
		return NullValue
	}
}

function multiply(left, right) {
	if (left.getType() == 'Number' && right.getType() == 'Number') {
		return Number(left.getContent() * right.getContent())
	} else {
		return NullValue
	}
}


function equals(left, right) {
	return left.equals(right)
}

function notEquals(left, right) {
	return Logic(!left.equals(right).getContent())
}

function greaterThanOrEquals(left, right) {
	// TODO Typecheck?
	return Logic(left.getContent() >= right.getContent())
}

function lessThanOrEquals(left, right) {
	// TODO Typecheck?
	return Logic(left.getContent() <= right.getContent())
}

function lessThan(left, right) {
	// TODO Typecheck?
	return Logic(left.getContent() < right.getContent())
}

function greaterThan(left, right) {
	// TODO Typecheck?
	return Logic(left.getContent() > right.getContent())
}

/* Variable and mutable value expressions
 ****************************************/
var _unique = 1
var variable = module.exports.variable = proto(mutableBase,
	function(content) {
		this.observers = {}
		this.set(null, content)
	}, {
		_type:'variable',
		evaluate:function() { return this._content.evaluate() },
		inspect:function() { return '<variable '+this._content.inspect()+'>' },
		asString:function() { return this._content.asString() },
		asLiteral:function() { return this._content.asLiteral() },
		equals:function(that) { return this._content.equals(that) },
		push:function(chain, value) { this._content.push(chain, value) },
		set:function(chain, value) {
			if (!chain || !chain.length) {
				var oldValue = this._content
				this._content = value
				this._observationID = this.onNewValue(oldValue, this._observationID, value)
			} else if (!this._content.isMutable()) {
				throw new Error("Attempted to set the value of a non-mutable property")
			} else {
				this._content.set(chain, value)
			}
		}
	}
)

var reference = module.exports.reference = proto(variableValueBase,
	function(content, chain) {
		this._content = content
		this._chain = chain
	}, {
		_type:'reference',
		getType:function() { return this.evaluate().getType() },
		inspect:function() { return '<Reference '+this._chain.join('.')+' '+this._content.inspect()+'>' },
		observe:function(callback) { return this._content.observe(callback) },
		equals:function(that) { return this.evaluate().equals(that) },
		dismiss:function(observationId) { this._content.dismiss(observationId) },
		set:function(chain, toValue) {
			chain = (this._chain && chain) ? (this._chain.concat(chain)) : (this._chain || chain)
			return this._content.set(chain, toValue)
		},
		evaluate:function() {
			var value = this._content.evaluate()
			for (var i=0; i<this._chain.length; i++) {
				var prop = this._chain[i]
				if (value.getters[prop]) {
					value = value.getters[prop].call(value)
				} else if (value.isAtomic()) {
					return NullValue
				} else if (!value._content[prop]) {
					return NullValue
				} else {
					value = value._content[prop].evaluate()
				}
			}
			return value
		}
	}
)

var Dictionary = module.exports.Dictionary = proto(collectionBase,
	function(content) {
		if (typeof content != 'object' || isArray(content) || content == null) { TypeMismatch }
		this.observers = {}
		this._observationIDs = {}
		this._content = {}
		for (var key in content) {
			this.set([key], content[key])
		}
	}, {
		_type:'Dictionary',
		asLiteral:function() { return '{ '+map(this._content, function(val, key) { return '"'+key+'":'+val.asLiteral() }).join(', ')+' }' },
		asString:function() { return this.asLiteral() },
		inspect:function() { return '<Dictionary { '+map(this._content, function(val, key) { return '"'+key+'":'+val.inspect() }).join(', ')+' }>' },
		iterate:function(yieldFn) {
			var content = this._content
			for (var key in content) {
				yieldFn(content[key])
			}
		},
		equals:function(that) {
			that = that.evaluate()
			if (that._type != this._type) {
				return No
			}
			for (var key in this._content) {
				if (that._content[key] && that._content[key].equals(this._content[key])) { continue }
				return No
			}
			for (var key in that._content) {
				if (this._content[key] && this._content[key].equals(that._content[key])) { continue }
				return No
			}
			return Yes
		}
	}
)

var List = module.exports.List = proto(collectionBase,
	function(content) {
		if (!isArray(content)) { TypeMismatch }
		this.observers = {}
		this._observationIDs = {}
		this._content = []
		for (var key in content) {
			this.set([key], content[key])
		}
	}, {
		_type:'List',
		asLiteral:function() { return '[ '+map(this._content, function(val) { return val.asLiteral() }).join(', ')+' ]' },
		asString:function() { return this.asLiteral() },
		inspect:function() { return '<List [ '+map(this._content, function(val) { return val.inspect() }).join(', ')+' ]>' },
		push:function(chain, value) { this.set([this._content.length], value) },
		iterate:function(yieldFn) {
			var content = this._content
			for (var i=0; i<content.length; i++) {
				yieldFn(content[i])
			}
		},
		equals:function(that) {
			that = that.evaluate()
			if (that._type != this._type) {
				return No
			}
			if (that._content.length != this._content.length) {
				return No
			}
			for (var i=0; i<this._content.length; i++) {
				if (that._content[i].equals(this._content[i])) { continue }
				return No
			}
			return Yes
		},
		getters:create(base.getters, {
			length:function() {
				var variableLength = variable(NullValue)
				this.observe(bind(this, function() {
					variableLength.set(null, Number(this._content.length))
				}))
				return variableLength
			}
		}),
	}
)

/* Util
 ******/
var fromJsValue = module.exports.fromJsValue = module.exports.value = function(val) {
	switch (typeof val) {
		case 'string': return Text(val)
		case 'number': return Number(val)
		case 'boolean': return Logic(val)
		case 'undefined': return NullValue
		case 'object':
			if (base.isPrototypeOf(val)) { return val }
			if (val == null) {
				return NullValue
			}
			if (isArray(val)) {
				var content = map(val, fromJsValue)
				return List(content)
			}
			var content = {}
			for (var key in val) {
				content[key] = fromJsValue(val[key])
			}
			return Dictionary(content)
	}
}

module.exports.fromJSON = function(json) {
	try { var jsValue = JSON.parse(json) }
	catch(e) { return NullValue }
	return fromJsValue(jsValue)
}

var Event = module.exports.Event = function(jsEvent) {
	var funEvent = fromJsValue({
		keyCode:jsEvent.keyCode,
		type:jsEvent.type,
		cancel:fun.expressions.Function(function() {
			if (jsEvent.preventDefault) { jsEvent.preventDefault() }
			else { jsEvent.returnValue = false }
		})
	})
	funEvent.jsEvent = jsEvent // For JS API
	return funEvent
}