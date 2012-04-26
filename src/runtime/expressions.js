var proto = require('std/proto'),
	create = require('std/create'),
	map = require('std/map'),
	isArray = require('std/isArray'),
	bind = require('std/bind')

// All values inherit from base
///////////////////////////////
var base = module.exports.base = {
	observe:function(callback) {
		var id = this._onMutate(callback)
		callback()
		return id
	},
	_onMutate:function(callback) {},
	toJSON:function() { return this.asLiteral() },
	isTruthy:function() { return true },
	isNull:function() { return false },
	iterate:function() {},
	getters:{
		copy:function() {
			return module.exports.Function(bind(this, function(yieldValue) {
				yieldValue(this.getContent())
			}))
		},
		type:function() {
			return Text(this.getType())
		}
	}
}

// Simple values
////////////////
var constantAtomicBase = create(base, {
	isAtomic:function() { return true },
	inspect:function() { return '<'+this._type+' ' + this.asLiteral() + '>' },
	getType:function() { return this._type },
	evaluate:function() { return this },
	toString:function() { return this._content.toString() },
	equals:function(that) { return (this._type == that.getType() && this._content == that.getContent()) ? Yes : No },
	getContent:function() { return this._content },
	mutate:function() { throw new Error("Called mutate on non-mutable value "+this.asLiteral() )},
	dismiss:function(id) {},
	render:function(hookName) {
		fun.hooks[hookName].innerHTML = ''
		fun.hooks[hookName].appendChild(document.createTextNode(this.toString()))
	}
})

var Number = module.exports.Number = proto(constantAtomicBase,
	function Number(content) {
		if (typeof content != 'number') { typeMismatch() }
		this._content = content
	}, {
		_type:'Number',
		asLiteral:function() { return this._content },
		isTruthy: function() { return this._content != 0 }
	}
)

var Text = module.exports.Text = proto(constantAtomicBase,
	function Text(content) {
		if (typeof content != 'string') { typeMismatch() }
		this._content = content
	}, {
		_type:'Text',
		asLiteral:function() { return '"'+this._content+'"' }
	}
)

var Logic = module.exports.Logic = function(content) {
	if (typeof content != 'boolean') { typeMismatch() }
	return content ? Yes : No
}
var LogicProto = proto(constantAtomicBase,
	function Logic(content) {
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

module.exports.Null = function() { return Null }
var Null = (proto(constantAtomicBase,
	function Null() {
		if (arguments.length) { typeMismatch() }
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

// Invocable values
///////////////////
module.exports.Function = proto(constantAtomicBase,
	function Function(block) {
		if (typeof block != 'function') { typeMismatch() }
		this._content = block
	}, {
		_type:'Function',
		invoke:function(args) {
			var result = variable(Null)
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
				if (args[i]) { args[i]._onMutate(executeBlock) }
			}
			
			var isFirstExecution = true
			args = _cleanArgs([yieldValue, isFirstExecution].concat(args), this._content)
			executeBlock()
		}
	}
)

module.exports.Handler = proto(constantAtomicBase,
	function Handler(block) {
		if (typeof block != 'function') { typeMismatch() }
		this._content = block
	}, {
		_type:'Handler',
		invoke:function(args) {
			this._content.apply(this, args)
		}
	}
)

module.exports.Template = proto(constantAtomicBase,
	function Template(block) {
		if (typeof block != 'function') { typeMismatch() }
		this._content = block
	}, {
		_type:'Template',
		render:function(hookName, args) {
			args = _cleanArgs([hookName].concat(args), this._content)
			this._content.apply(this, args)
		}
	}
)

// Variable expressions
///////////////////////
var variableValueBase = create(base, {
	isAtomic:function() { return this.evaluate().isAtomic() },
	getType:function() { return this.evaluate().getType() },
	toString:function() { return this.evaluate().toString() },
	asLiteral:function() { return this.evaluate().asLiteral() },
	equals:function(that) { return this.evaluate().equals(that) },
	getContent:function() { return this.evaluate().getContent() },
	isTruthy:function() { return this.evaluate().isTruthy() },
	invoke:function(args) { return this.evaluate().invoke(args) },
	render:function(hookName, args) {
		this.observe(bind(this, function() {
			this.evaluate().render(hookName, args)
		}))
	}
})

var variableCompositeBase = create(variableValueBase, {
	_initComposite:function(components) {
		this.ids = {}
		this.components = components
	},
	_onMutate:function(callback) {
		var id = unique(),
			ids = this.ids[id] = {}
		for (var key in this.components) {
			ids[key] = this.components[key]._onMutate(callback)
		}
		return id
	},
	dismiss:function(id) {
		var ids = this.ids[id]
		delete this.ids[id]
		for (var key in ids) {
			this.components[key].dismiss(ids[key])
		}
	}
})

module.exports.unaryOp = proto(variableCompositeBase,
	function unaryOp(operator, value) {
		this.operator = operator
		this._initComposite({ value:value })
	}, {
		_type:'unaryOp',
		evaluate:function() {
			return unaryOperators[this.operator](this.components.value.evaluate())
		}
	}
)

module.exports.binaryOp = proto(variableCompositeBase,
	function binaryOp(left, operator, right) {
		this.operator = operator
		this._initComposite({ left:left, right:right })
	}, {
		_type:'binaryOp',
		evaluate:function() { return operators[this.operator](this.components.left, this.components.right) }
	}
)

module.exports.ternaryOp = proto(variableCompositeBase,
	function ternaryOp(condition, ifValue, elseValue) {
		this._initComposite.call(this, { condition:condition, ifValue:ifValue, elseValue:elseValue })
	}, {
		_type:'ternaryOp',
		evaluate:function() {
			return this.components.condition.isTruthy()
				? this.components.ifValue.evaluate()
				: this.components.elseValue.evaluate()
		}
	}
)

var dereference = module.exports.dereference = proto(variableCompositeBase,
	function dereference(value, key) {
		this._initComposite({ value:value, key:key })
	}, {
		_onMutate:function(callback) {
			return variableCompositeBase._onMutate.call(this, bind(this, function(mutation) {
				var affectedProperty = mutation.affectedProperty
				var propertyKey = this.components.key.asLiteral()
				if (affectedProperty && (affectedProperty[0] != propertyKey)) { return }
				mutation = { affectedProperty:null }
				callback(mutation)
			}))
		},
		_type:'dereference',
		inspect:function() { return '<dereference '+this.components.value.inspect()+'['+this.components.key.inspect()+']>' },
		equals:function(that) { return this.evaluate().equals(that) },
		lookup:function(key) { return this._getCurrentValue().lookup(key) },
		evaluate:function() { return this._getCurrentValue().evaluate() },
		mutate:function(operator, args) { this._getCurrentValue().mutate(operator, args) },
		_getCurrentValue:function() {
			var key = this.components.key.evaluate(),
				value = this.components.value,
				getterValue = value.evaluate(),
				getter = (key.getType() == 'Text' && getterValue.getters[key.toString()])
			
			if (getter) {
				return getter.call(getterValue)
			} else if (value.isAtomic()) {
				return Null
			} else {
				return value.lookup(key) || Null
			}
		}
	}
)

// Mutable values - variables and collections
/////////////////////////////////////////////
var mutableBase = create(variableValueBase, {
	_initMutable:function() {
		this.observers = {}
		this.notify = bind(this, this._notifyObservers)
	},
	dismiss:function(id) {
		if (!this.observers[id]) { throw new Error("Tried to dismiss an observer by incorrect ID") }
		delete this.observers[id]
	},
	_notifyObservers:function(mutation) {
		for (var id in this.observers) {
			this.observers[id](mutation)
		}
	},
	_onMutate:function(callback) {
		var id = unique()
		this.observers[id] = callback
		return id
	}
})

var variable = module.exports.variable = proto(mutableBase,
	function variable(content) {
		this._initMutable()
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
			if (operator != 'set' || args.length == 2) { // Hmm, hacky, should methods with multiple arguments have different method names like in ObjC?
				return this._content.mutate(operator, args)
			}
			_checkArgs(args, 1)
			var newContent = args[0]
			
			if (this._observationID) {
				this._content.dismiss(this._observationID)
			}
			this._content = newContent
			this._observationID = newContent._onMutate(this.notify)
			
			var mutation = { affectedProperty:null }
			this.notify(mutation)
		}
	}
)

var collectionBase = create(mutableBase, {
	_initCollection: function() {
		this._initMutable()
		this.propObservations = {}
	},
	isAtomic:function() { return false },
	getType:function() { return this._type },
	evaluate:function() { return this },
	getContent:function() { return this._content },
	isTruthy:function() { return true },
	
	_setProperty: function(propertyKey, newProperty) {
		var oldId = this.propObservations[propertyKey],
			oldProperty = this._content[propertyKey]
		if (oldId) { oldProperty.dismiss(oldId) }
		
		this._content[propertyKey] = newProperty
		
		this.propObservations[propertyKey] = newProperty._onMutate(bind(this, function(mutation) {
			var mutation = { affectedProperty:[propertyKey].concat(mutation.affectedProperty) }
			this.notify(mutation)
		}))
		
		var mutation = { affectedProperty:[propertyKey] }
		this.notify(mutation)
	}
})

var Dictionary = module.exports.Dictionary = proto(collectionBase,
	function Dictionary(content) {
		if (typeof content != 'object' || isArray(content) || content == null) { typeMismatch() }
		this._initCollection()
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
			if (operator != 'set') { throw new Error('Bad Dictionary operator "'+operator+'"') }
			_checkArgs(args, 2)
			var key = args[0],
				value = args[1]
			if (!key || key.isNull() || !value) { BAD_ARGS }
			this._setProperty(key.asLiteral(), value)
		}
	}
)

var List = module.exports.List = proto(collectionBase,
	function List(content) {
		if (!isArray(content)) { typeMismatch() }
		this._initCollection()
		this._content = []
		for (var i=0; i<content.length; i++) {
			this.mutate('push', [content[i]])
		}
	}, {
		_type:'List',
		asLiteral:function() { return '[ '+map(this._content, function(val) { return val.asLiteral() }).join(', ')+' ]' },
		toString:function() { return this.asLiteral() },
		inspect:function() { return '<List [ '+map(this._content, function(val) { return val.inspect() }).join(', ')+' ]>' },
		lookup:function(index) {
			if (index.getType() == 'Number') { typeMismatch() }
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
				var variableLength = variable(Null)
				this.observe(bind(this, function() {
					variableLength.mutate('set', [Number(this._content.length)])
				}))
				return variableLength
			},
			last:function() {
				var last = variable(Null)
				this.observe(bind(this, function() {
					last.mutate('set', [this._content[this._content.length - 1] || Null])
				}))
				return last
			},
			first:function() {
				var first = variable(Null)
				this.observe(bind(this, function() {
					first.mutate('set', [this._content[0] || Null])
				}))
				return first
			}
		}),
		mutate:function(operator, args) {
			switch(operator) {
				case 'push':
					_checkArgs(args, 1)
					return this._setProperty(this._content.length, args[0])
				case 'set':
					_checkArgs(args, 2)
					if (args[0].getType() != 'Number') { typeMismatch() }
					return this._setProperty(args[0].getContent(), args[1])
				default:
					throw new Error('Bad Dictionary operator "'+operator+'"')
			}
		}
	}
)

// Operators
////////////
var unaryOperators = {
	'!': not,
	'-': negative
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

function negative(value) {
	if (value.getType() != 'Number') { return Null }
	return Number(-value.getContent())
}

function not(value) {
	return Logic(!value.isTruthy())
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
		return Null
	}
}

function divide(left, right) {
	if (left.getType() == 'Number' && right.getType() == 'Number') {
		return Number(left.getContent() / right.getContent())
	} else {
		return Null
	}
}

function multiply(left, right) {
	if (left.getType() == 'Number' && right.getType() == 'Number') {
		return Number(left.getContent() * right.getContent())
	} else {
		return Null
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

// Util
///////
var _unique = 1
function unique() { return 'u'+_unique++ }

var fromJsValue = module.exports.fromJsValue = module.exports.value = function(val) {
	switch (typeof val) {
		case 'string': return Text(val)
		case 'number': return Number(val)
		case 'boolean': return Logic(val)
		case 'undefined': return Null
		case 'object':
			if (base.isPrototypeOf(val)) { return val }
			if (val == null) {
				return Null
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
	catch(e) { return Null }
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

function _cleanArgs(args, fn) {
	var diffArgs = fn.length - args.length
	while (diffArgs-- > 0) { args.push(Null) }
	return args
}

var _checkArgs = function(args, num) {
	if (!isArray(args) || args.length != num) { BAD_ARGS }
}

function typeMismatch() { throw new Error('Type mismatch') }
