var proto = require('std/proto'),
	create = require('std/create'),
	map = require('std/map'),
	isArray = require('std/isArray'),
	each = require('std/each'),
	bind = require('std/bind')

var base = {
	getType:function() {
		return this.getType()
	},
	inspect:function() {
		return '<'+this.getType()+' ' + this.asLiteral() + '>'
	},
	observe:function(callback) {
		callback()
	},
	evaluate:function() {
		return this
	},
	hasVariableContent:function() {
		return false
	}
}

/* Atomic expressions
 ********************/
var atomicBase = create(base, {
	isAtomic:function() {
		return true
	},
	asString:function() {
		return this.content.toString()
	},
	equals:function(that) {
		return Logic(this.getType() == that.getType() && this.content == that.content)
	}
})

// Number values
var Number = module.exports.Number = proto(atomicBase,
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

// Text values
var Text = module.exports.Text = proto(atomicBase,
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

// Logic values
var Logic = module.exports.Logic = function(content) {
	if (typeof content != 'boolean') { TypeMismatch }
	return content ? YesValue : NoValue
}

var LogicProto = proto(atomicBase,
	function(content) {
		this.content = content
	}, {
		type:'Logic',
		asString:function() {
			return this.content ? 'yes' : 'no'
		}
	}
)

var YesValue = LogicProto(true),
	NoValue = LogicProto(false)

// Null values
module.exports.Null = function() {
	return NullValue
}

var NullProto = proto(atomicBase,
	function() {
		if (arguments.length) { TypeMismatch }
	}, {
		type:'Null',
		inspect:function() { return '<Null>' },
		asString:function() { return '' },
		equals:function(that) { return falseValue }
	}
)

var NullValue = NullProto()

/* Collection expressions
 ************************/
var collectionBase = create(base, {
	isAtomic:function() {
		return false
	},
	equals:function(that) {
		console.log("TODO implement collection equality")
		return falseValue
	},
	observe:function(callback) {
		// TODO notify observers when items are added or removed
		return callback()
	}
})

var Dictionary = module.exports.Dictionary = proto(collectionBase,
	function(content) {
		// TODO content type check
		if (typeof content != 'object' || isArray(content) || content == null) { TypeMismatch }
		this.content = content
	}, {
		type:'Dictionary',
		asString:_dictionaryAsLiteral,
		asLiteral:_dictionaryAsLiteral,
		iterate:_iterateFunction
	}
)
function _dictionaryAsLiteral() {
	return '{ '+map(this.content, function(value, name) {
		return name+':'+value.asLiteral()
	}).join(', ')+' }'
}

var List = module.exports.List = proto(collectionBase,
	function(content) {
		if (!isArray(content)) { TypeMismatch }
		this.content = content
	}, {
		type:'List',
		asString:_listAsLiteral,
		asLiteral:_listAsLiteral,
		iterate:_iterateFunction
	}
)
function _listAsLiteral() {
	return '['+map(this.content, function(value) {
		return value.asLiteral()
	}).join(', ')+']'
}

function _iterateFunction(yieldFn) {
	each(this.content, yieldFn)
}

/* Function, handler & template expressions
 ******************************************/
var func = module.exports.Function = proto(atomicBase,
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

/* Variable-value expressions: composites, variables, references
 ***************************************************************/
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
	// TODO Typecheck?
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

/* Variable expressions
 **********************/
var _unique = 1
var variable = module.exports.variable = proto(variableValueBase,
	function(content) {
		this.set(null, content)
		this.observers = {}
	}, {
		type:'Variable',
		evaluate:function() {
			return this.content.evaluate()
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
		observe:function(callback) {
			var uniqueID = 'u'+_unique++
			this.observers[uniqueID] = callback
			callback()
			return uniqueID
		},
		unobserve:function() {
			delete this.observers[observationID]
		},
		set:function(chain, toValue) {
			if (!chain) {
				this.content = toValue
			} else {
				var value = this.evaluate()
				for (var i=0; i<chain.length-1; i++) {
					if (value.hasVariableContent()) {
						value.set(chain.slice(i), toValue)
						return
					}
					if (value.isAtomic()) {
						throw new Error('Attempted setting property of an atomic value')
					}
					value = value.content[chain[i]]
					if (!value) {
						throw new Error('Null dereference in set')
					}
				}
				// TODO unobserve old content. Unobserving a dictionary should probably go through all its values and unobserve them
				value.content[chain[chain.length-1]] = toValue
			}
			if (toValue.hasVariableContent()) {
				toValue.observe(bind(this, this._notifyObservers))
			} else {
				this._notifyObservers()
			}
		},
		_notifyObservers:function() {
			each(this.observers, function(observer, id) {
				observer()
			})
		}
	}
)

/* Reference expressions
 ***********************/
var reference = module.exports.reference = proto(variableValueBase,
	function(content, chain) {
		this.content = content
		this.chain = chain
	}, {
		type:'Reference',
		getType:function() {
			return this.evaluate().getType()
		},
		evaluate:function() {
			var value = this.content
			for (var i=0; i<this.chain.length; i++) {
				value = value.evaluate().content[this.chain[i]]
			}
			return value
		},
		observe:function(callback) {
			return this.content.observe(callback)
		},
		set:function(chain, toValue) {
			chain = (this.chain && chain) ? (this.chain.concat(chain)) : (this.chain || chain)
			return this.content.set(chain, toValue)
		}
	}
)


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
