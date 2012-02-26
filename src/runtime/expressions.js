var proto = require('std/proto'),
	create = require('std/create'),
	map = require('std/map'),
	isArray = require('std/isArray'),
	each = require('std/each'),
	bind = require('std/bind')

/* Value bases
 *************/
var base = module.exports.base = {
	observe:function(callback) {
		callback()
	}
}

var constantAtomicBase = create(base, {
	inspect:function() {
		return '<'+this.type+' ' + this.asLiteral() + '>'
	},
	getType:function() {
		return this.type
	},
	evaluate:function() {
		return this
	},
	isAtomic:function() {
		return true
	},
	isMutable:function() {
		return false
	},
	asString:function() {
		return this.content.toString()
	},
	equals:function(that) {
		that = that.evaluate()
		return this.getType() == that.getType() && this.content == that.content ? Yes : No
	},
	hasVariableContent:function() {
		return false
	},
	
})

var variableValueBase = create(base, {
	isAtomic:function() {
		return this.evaluate().isAtomic()
	},
	hasVariableContent:function() {
		return true
	},
	getType:function() {
		return this.evaluate().getType()
	},
	asString:function() {
		return this.evaluate().asString()
	},
	asLiteral:function() {
		return this.evaluate().asLiteral()
	},
	equals:function(that) {
		return this.evaluate().equals(that)
	}
})

var mutableBase = create(variableValueBase, {
	isMutable:function() {
		return true
	},
	observe:function(callback) {
		var uniqueID = 'u'+_unique++
		this.observers[uniqueID] = callback
		callback()
		return uniqueID
	},
	_onNewValue:function(newValue) {
		if (newValue.hasVariableContent()) {
			newValue.observe(bind(this, this._notifyObservers))
		} else {
			this._notifyObservers()
		}
	},
	_notifyObservers:function() {
		each(this.observers, function(observer) {
			observer()
		})
	}
})

var collectionBase = create(mutableBase, {
	isAtomic:function() {
		return false
	},
	getType:function() {
		return this.type
	},
	evaluate:function() {
		return this
	},
	set:function(chain, value) {
		if (!chain || !chain.length) {
			throw new Error("Attempted setting collection property without a chain")
		}
		var prop = chain[0]
		if (chain.length == 1) {
			// TODO unobserve old value.
			this.content[prop] = value
			this._onNewValue(value)
		} else if (!this.content[prop]) {
			throw new Error('Attempted to set the value of a null property')
		} else if (!this.content[prop].isMutable()) {
			throw new Error("Attempted to set the value of a non-mutable property")
		} else {
			this.content[prop].set(chain.slice(1), value)
		}
	}
})

/* Atomic, immutable expressions
 *******************************/
var Number = module.exports.Number = proto(constantAtomicBase,
	function(content) {
		if (typeof content != 'number') { TypeMismatch }
		this.content = content
	}, {
		type:'Number',
		asLiteral:function() {
			return this.content
		}
	}
)

var Text = module.exports.Text = proto(constantAtomicBase,
	function(content) {
		if (typeof content != 'string') { TypeMismatch }
		this.content = content
	}, {
		type:'Text',
		asLiteral:function() {
			return '"'+this.content+'"'
		}
	}
)

var Logic = module.exports.Logic = function(content) {
	if (typeof content != 'boolean') { TypeMismatch }
	return content ? Yes : No
}

var LogicProto = proto(constantAtomicBase,
	function(content) {
		this.content = content
	}, {
		type:'Logic',
		asString:function() {
			return this.content ? 'yes' : 'no'
		}
	}
)

var Yes = module.exports.Yes = LogicProto(true),
	No = module.exports.No = LogicProto(false)

module.exports.Null = function() {
	return NullValue
}

var NullProto = proto(constantAtomicBase,
	function() {
		if (arguments.length) { TypeMismatch }
	}, {
		type:'Null',
		inspect:function() { return '<Null>' },
		asString:function() { return '' },
		equals:function(that) { return that.getType() == 'Null' ? Yes : No },
		asLiteral:function() { return 'null' }
	}
)

var NullValue = NullProto()

var func = module.exports.Function = proto(constantAtomicBase,
	function(content) {
		if (typeof content != 'function') { TypeMismatch }
		this.content = content
	}, {
		type:'Function',
		invoke:function(hookName, args) {
			return this.content.apply(this, args)
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
		type:'Composite',
		evaluate:function() {
			return operators[this.operator](this.left.evaluate(), this.right.evaluate())
		},
		observe:function(callback) {
			// TODO store observation IDs
			this.left.observe(callback)
			this.right.observe(callback)
		}
	}
)

var operators = {
	'+': add,
	'==': equals, // I wonder if we should make this just = in the fun source, since we don't allow for assignment in mutating statements...
	'>=': greaterThanOrEquals,
	'<=': lessThanOrEquals
}

function add(left, right) {
	if (left.type == 'Number' && right.type == 'Number') {
		return Number(left.content + right.content)
	}
	return Text(left.asString() + right.asString())
}

function equals(left, right) {
	return left.equals(right)
}

function greaterThanOrEquals(left, right) {
	// TODO Typecheck?
	return Logic(left.content >= right.content)
}

function lessThanOrEquals(left, right) {
	// TODO Typecheck?
	return Logic(left.content <= left.content)
}

/* Variable and mutable value expressions
 ****************************************/
var _unique = 1
var variable = module.exports.variable = proto(mutableBase,
	function(content) {
		this.observers = {}
		this.set(null, content)
	}, {
		type:'variable',
		evaluate:function() {
			return this.content.evaluate()
		},
		inspect:function() {
			return '<Variable '+this.content.inspect()+'>'
		},
		asString:function() {
			return this.content.asString()
		},
		asLiteral:function() {
			return this.content.asLiteral()
		},
		equals:function(that) {
			return this.content.equals(that)
		},
		unobserve:function() {
			delete this.observers[observationID]
		},
		set:function(chain, value) {
			if (!chain || !chain.length) {
				this.content = value
			} else if (!this.content.isMutable()) {
				throw new Error("Attempted to set the value of a non-mutable property")
			} else {
				this.content.set(chain, value)
			}
			this._onNewValue(value)
		},
		_notifyObservers:function() {
			each(this.observers, function(observer, id) {
				observer()
			})
		}
	}
)

var reference = module.exports.reference = proto(variableValueBase,
	function(content, chain) {
		this.content = content
		this.chain = chain
	}, {
		type:'reference',
		getType:function() {
			return this.evaluate().getType()
		},
		inspect:function() {
			return '<Reference '+this.chain.join('.')+' '+this.content.inspect()+'>'
		},
		evaluate:function() {
			var value = this.content.evaluate()
			for (var i=0; i<this.chain.length; i++) {
				var prop = this.chain[i]
				if (value.isAtomic()) {
					return NullValue
				}
				if (!value.content[prop]) {
					return NullValue
				}
				value = value.content[prop].evaluate()
			}
			return value
		},
		observe:function(callback) {
			return this.content.observe(callback)
		},
		set:function(chain, toValue) {
			chain = (this.chain && chain) ? (this.chain.concat(chain)) : (this.chain || chain)
			return this.content.set(chain, toValue)
		},
		equals:function(that) {
			return this.evaluate().equals(that)
		}
	}
)

var Dictionary = module.exports.Dictionary = proto(collectionBase,
	function(content) {
		if (typeof content != 'object' || isArray(content) || content == null) { TypeMismatch }
		this.observers = {}
		this.content = {}
		each(content, bind(this, function(val, key) {
			 this.set([key], val)
		}))
	}, {
		type:'Dictionary',
		asLiteral:function() {
			return '{ '+map(this.content, function(val, key) { return key+':'+val.asLiteral() }).join(', ')+' }'
		},
		asString:function() {
			return this.asLiteral()
		},
		inspect:function() {
			return '<Dictionary { '+map(this.content, function(val, key) { return key+':'+val.inspect() }).join(', ')+' }>'
		},
		equals:function(that) {
			that = that.evaluate()
			if (that.type != this.type) {
				return No
			}
			for (var key in this.content) {
				if (that.content[key] && that.content[key].equals(this.content[key])) { continue }
				return No
			}
			for (var key in that.content) {
				if (this.content[key] && this.content[key].equals(that.content[key])) { continue }
				return No
			}
			return Yes
		},
		iterate:__interimIterationFunction
	}
)

var List = module.exports.List = proto(collectionBase,
	function(content) {
		if (!isArray(content)) { TypeMismatch }
		this.observers = {}
		this.content = []
		each(content, bind(this, function(val, key) {
			 this.set([key], val)
		}))
	}, {
		type:'List',
		asLiteral:function() {
			return '[ '+map(this.content, function(val) { return val.asLiteral() }).join(' ')+' ]'
		},
		asString:function() {
			return this.asLiteral()
		},
		inspect:function() {
			return '<List [ '+map(this.content, function(val) { return val.inspect() }).join(' ')+' ]>'
		},
		equals:function(that) {
			that = that.evaluate()
			if (that.type != this.type) {
				return No
			}
			if (that.content.length != this.content.length) {
				return No
			}
			for (var i=0; i<this.content.length; i++) {
				if (that.content[i].equals(this.content[key])) { continue }
				return No
			}
			return Yes
		},
		iterate:__interimIterationFunction
	}
)

function __interimIterationFunction(yieldFn) {
	console.log("Figure out how to do iteration properly")
	each(this.content, yieldFn)
}

/* Util
 ******/
var fromJsValue = module.exports.fromJsValue = function(val) {
	switch (typeof val) {
		case 'string': return Text(val)
		case 'number': return Number(val)
		case 'boolean': return Logic(val)
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
			each(val, function(contentVal, contentName) {
				content[contentName] = fromJsValue(contentVal)
			})
			return Dictionary(content)
	}
}
