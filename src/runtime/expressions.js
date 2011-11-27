var proto = require('std/proto'),
	extend = require('std/extend'),
	operators = require('./operators')

/* Atomic expressions
 ********************/
var atomicBase = {
	asRawString:function() { return this.content.toString() },
	// asText:function() { return text(this.toString()) },
	atomic:true,
	evaluate:function(chain, defaultToUndefined) {
		if (chain && chain.length) { // tried to dereference a non-collection
			return defaultToUndefined ? undefined : nullValue
		}
		return this
	},
	equals:function(that) { return logic(this.type == that.type && this.content == that.content) }
}

var number = module.exports.number = proto(function(content) { this.content = content }, extend(atomicBase, {
	type:'number'
}))

var text = module.exports.text = proto(function(content) { this.content = content }, extend(atomicBase, {
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
	asRawString:function() { return '<Bool True>'}
}))

var trueValue = logicProto(true),
	falseValue = logicProto(false)

var nullValue = {
	type:'null',
	atomic:true,
	asRawString:function() { return '<Null>' },
	evaluate:function() { return this },
	equals:function(that) { return falseValue }
}


// don't like these...
module.exports.string = module.exports.text
module.exports.boolean = module.exports.logic

/* Collection expressions
 ************************/
var collectionBase = {
	atomic:false,
	asRawString:function() { throw new Error("Implement collections' asRawString") },
	evaluate:function(chain, defaultToUndefined) {
		var value = this
		if (chain) {
			for (var i=0; i<chain.length; i++) {
				if (!value || !value.content) { return defaultToUndefined ? undefined : nullValue }
				value = value.content[chain[i]]
			}
		}
		if (!value) { return nullValue }
		return value
	},
	equals:function(that) { return falseValue }
}

var dictionary = module.exports.dictionary = proto(function(content) { this.content = content }, extend(collectionBase, {
	type:'dictionary'
}))

/* Composite and variable expressions
 ************************************/
var composite = module.exports.composite = proto(function(left, operator, right) { this.left = left, this.operator = operator, this.right = right }, {
	type:'composite',
	evaluate:function(chain, defaultToUndefined) {
		return operators[this.operator](this.left.evaluate(), this.right.evaluate()).evaluate(chain, defaultToUndefined)
	},
	equals:function(that) { return this.evaluate().equals(that) }
})

var variable = module.exports.variable = proto(function(content) { if (!content.evaluate) { asdasd }; this.content = content, this.observers = {} }, {
	type:'variable',
	evaluate:function(chain, defaultToUndefined) {
		return this.content.evaluate(chain, defaultToUndefined)
	},
	equals:function(that) { return this.content.equals(that) }
})
