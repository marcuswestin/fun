var proto = require('std/proto'),
	create = require('std/create'),
	map = require('std/map'),
	isArray = require('std/isArray'),
	bind = require('std/bind')

/* Value bases
 *************/
var base = module.exports.base = {
	observe:function(callback) {
		var id = this._onChange(callback)
		callback()
		return id
	},
	_onChange:function(callback) {},
	toJSON:function() { return this.asLiteral() },
	isTruthy:function() { return true },
	isNull:function() { return false },
	iterate:function() {},
	render:function(hookName) {
		fun.hooks[hookName].innerHTML = ''
		fun.hooks[hookName].appendChild(document.createTextNode(this.toString()))
	},
	mutate:function() { throw new Error("Called mutate on non-mutable value "+this.asLiteral() )},
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
	toString:function() { return this._content.toString() },
	equals:function(that) { return (this.getType() == that.getType() && this.getContent() == that.getContent()) ? Yes : No },
	getContent:function() { return this._content },
	hasVariableContent:function() { return false },
	dismiss:function(id) { /* This function intentionally left blank */  }
})

var variableValueBase = create(base, {
	isAtomic:function() { return this.evaluate().isAtomic() },
	getType:function() { return this.evaluate().getType() },
	toString:function() { return this.evaluate().toString() },
	asLiteral:function() { return this.evaluate().asLiteral() },
	equals:function(that) { return this.evaluate().equals(that) },
	getContent:function() { return this.evaluate().getContent() },
	isTruthy:function() { return this.evaluate().isTruthy() },
	hasVariableContent:function() { return true },
	invoke:function(args) { return this.evaluate().invoke(args) },
	render:function(hookName, args) {
		this.observe(bind(this, function() {
			this.evaluate().render(hookName, args)
		}))
	}
})

var mutableBase = create(variableValueBase, {
	notifyObservers:function() {
		for (var key in this.observers) {
			this.observers[key]()
		}
	},
	_onChange:function(callback) {
		var uniqueID = 'u'+_unique++
		this.observers[uniqueID] = callback
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
	isTruthy:function() { return true }
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
		toString:function() { return this._content ? 'yes' : 'no' },
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
		toString:function() { return '' },
		equals:function(that) { return that.getType() == 'Null' ? Yes : No },
		asLiteral:function() { return 'null' },
		isTruthy:function() { return false },
		isNull:function() { return true }
	}
))();

module.exports.Null = function() { return NullValue }

module.exports.Function = proto(constantAtomicBase,
	function(block) {
		if (typeof block != 'function') { TypeMismatch }
		this._content = block
	}, {
		_type:'Function',
		invoke:function(args) {
			var result = variable(NullValue)
			var yieldValue = function(value) { result.mutate('set', [fromJsValue(value)]) }
			var isFirstExecution = true

			args = _cleanArgs([yieldValue, isFirstExecution].concat(args), this._content)
			
			this._content.apply(this, args)
			return result
		},
		render:function(hookName, args) {
			var yieldValue = function(value) { fromJsValue(value).render(hookName) }
			
			var executeBlock = bind(this, function() {
				this._content.apply(this, args)
				args[1] = false // hack: isFirstExecution
			})
			
			for (var i=0; i<args.length; i++) {
				var arg = args[i]
				if (arg) { arg._onChange(executeBlock) }
			}

			var isFirstExecution = true
			args = _cleanArgs([yieldValue, isFirstExecution].concat(args), this._content)
			executeBlock()
		}
	}
)

function _cleanArgs(args, fn) {
	var diffArgs = fn.length - args.length
	while (diffArgs-- > 0) { args.push(NullValue) }
	return args
}

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

module.exports.Handler = proto(constantAtomicBase,
	function(block) {
		if (typeof block != 'function') { TypeMismatch }
		this._content = block
	}, {
		_type:'Handler',
		invoke:function(args) {
			this._content.apply(this, args)
		}
	}
)

module.exports.Template = proto(constantAtomicBase,
	function(block) {
		if (typeof block != 'function') { TypeMismatch }
		this._content = block
	}, {
		_type:'Template',
		render:function(hookName, args) {
			args = _cleanArgs([hookName].concat(args), this._content)
			this._content.apply(this, args)
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
		_onChange:function(callback) {
			this._leftId = this.left._onChange(callback)
			this._rightId = this.right._onChange(callback)
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
		_onChange:function(callback) {
			this._conditionId = this.condition._onChange(callback)
			this._ifValueId = this.ifValue._onChange(callback)
			this._elseValueId = this.elseValue._onChange(callback)
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
		_onChange:function(callback) { this._valueId = this.value._onChange(callback) },
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
	return Text(left.toString() + right.toString())
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
		this.mutate('set', [content])
	}, {
		_type:'variable',
		evaluate:function() { return this._content.evaluate() },
		inspect:function() { return '<variable '+this._content.inspect()+'>' },
		toString:function() { return this._content.toString() },
		asLiteral:function() { return this._content.asLiteral() },
		equals:function(that) { return this._content.equals(that) },
		lookup:function(key) { return this._content.lookup(key) },
		mutate: function(operator, args) {
			if (operator != 'set' || args.length == 2) {
				return this._content.mutate(operator, args)
			}
			_checkArgs(args, 1)
			var value = args[0],
				oldValue = this._content
			this._content = value
			this._observationID = this.onNewValue(oldValue, this._observationID, value)
		}
	}
)

var _checkArgs = function(args, num) {
	if (!isArray(args) || args.length != num) { BAD_ARGS }
}

var dereference = module.exports.dereference = proto(variableValueBase,
	function(value, key) {
		if (!value || !key) { TYPE_MISMATCH }
		this._value = value
		this._key = key
	}, {
		_type:'dereference',
		getType:function() { return this.evaluate().getType() },
		inspect:function() { return '<dereference '+this._value.inspect()+'['+this._key.inspect()+']>' },
		_onChange:function(callback) {
			this._keyId = this._key._onChange(callback)
			this._valueId = this._value._onChange(callback)
		},
		equals:function(that) { return this.evaluate().equals(that) },
		dismiss:function(observationId) {
			// TODO Lookup the keyId/valueId for this observationId
			this._key.dismiss(this._keyId)
			this._value.dismiss(this._valueId)
		},
		lookup:function(key) { return this._getCurrentValue().lookup(key) },
		evaluate:function() { return this._getCurrentValue().evaluate() },
		mutate:function(operator, args) { this._getCurrentValue().mutate(operator, args) },
		_getCurrentValue:function() {
			var key = this._key.evaluate(),
				value = this._value
			
			var getterValue = value.evaluate(),
				getter = key.getType() == 'Text' && getterValue.getters[key.toString()]
			
			if (getter) { return getter.call(getterValue) }
			
			if (value.isAtomic()) { return NullValue }
			
			return value.lookup(key) || NullValue
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
			this.mutate('set', [Text(key), content[key]])
		}
	}, {
		_type:'Dictionary',
		asLiteral:function() { return '{ '+map(this._content, function(val, key) { return fromLiteral(key).asLiteral()+':'+val.asLiteral() }).join(', ')+' }' },
		toString:function() { return this.asLiteral() },
		inspect:function() { return '<Dictionary { '+map(this._content, function(val, key) { return fromLiteral(key).inspect()+':'+val.inspect() }).join(', ')+' }>' },
		lookup:function(key) {
			var value = this._content[key.asLiteral()]
			return value
		},
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
		},
		mutate:function(operator, args) {
			switch(operator) {
				case 'set':
					_checkArgs(args, 2)
					var key = args[0],
						value = args[1]
					if (!key || key.isNull() || !value) { BAD_ARGS }
					var prop = key.asLiteral(),
						oldValue = this._content[prop]
					this._content[prop] = value
					this._observationIDs[prop] = this.onNewValue(oldValue, this._observationIDs[prop], value)
					break
				default:
					throw new Error('Bad Dictionary operator "'+operator+'"')
			}
		}
	}
)

var List = module.exports.List = proto(collectionBase,
	function(content) {
		if (!isArray(content)) { TypeMismatch }
		this.observers = {}
		this._observationIDs = {}
		this._content = []
		if (!content) { return }
		for (var i=0; i<content.length; i++) {
			this.mutate('push', [content[i]])
		}
	}, {
		_type:'List',
		asLiteral:function() { return '[ '+map(this._content, function(val) { return val.asLiteral() }).join(', ')+' ]' },
		toString:function() { return this.asLiteral() },
		inspect:function() { return '<List [ '+map(this._content, function(val) { return val.inspect() }).join(', ')+' ]>' },
		lookup:function(index) {
			if (index.getType() == 'Number') { TypeMismatch }
			var value = this._content[index.getContent()]
			return value
		},
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
					variableLength.mutate('set', [Number(this._content.length)])
				}))
				return variableLength
			},
			last:function() {
				var last = variable(NullValue)
				this.observe(bind(this, function() {
					last.mutate('set', [this._content[this._content.length - 1] || NullValue])
				}))
				return last
			},
			first:function() {
				var first = variable(NullValue)
				this.observe(bind(this, function() {
					first.mutate('set', [this._content[0] || NullValue])
				}))
				return first
			}
		}),
		mutate:function(operator, args) {
			switch(operator) {
				case 'push':
					_checkArgs(args, 1)
					return this._set(Number(this._content.length), args[0])
				case 'set':
					_checkArgs(args, 2)
					return this._set(args[0], args[1])
				default:
					throw new Error('Bad Dictionary operator "'+operator+'"')
			}
		},
		_set: function(index, value) {
			if (index.getType() != 'Number') { TypeMismatch }
			index = index.getContent()
			var oldValue = this._content[index]
			this._content[index] = value
			this._observationIDs[index] = this.onNewValue(oldValue, this._observationIDs[index], value)
		}
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

var fromLiteral = module.exports.fromLiteral = module.exports.fromJSON = function(json) {
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