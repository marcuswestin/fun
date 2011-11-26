var fun = require('../../src/runtime-library'),
	slice = require('std/slice'),
	a = require('../runtime-mocks'),
	isArray = require('std/isArray'),
	each = require('std/each'),
	map = require('std/map'),
	deepEqual = require('std/assert/deepEqual')

test('sets and gets', function(assert) {
	var foo = a.variable(1),
		bar = a.variable({ cat:{ asd:2 } }),
		error
	assert.is(a.value(1), evaluate(foo))
	assert.is(a.value(null), evaluate(foo, 'cat'))
	assert.is(a.value(2), evaluate(bar, 'cat.asd'))
	assert.is(a.value({ asd:2 }), evaluate(bar, 'cat'))
	
	error = set(foo, 'chain', 'break')
	assert.is(typeof error, 'string')
	error = set(foo, 'deeper.chain', 'break')
	assert.is(typeof error, 'string')
	
	set(bar, 'cat', { asd:3 })
	assert.is(a.value(3), evaluate(bar, 'cat.asd'))
	assert.is(a.value({ asd:3 }), evaluate(bar, 'cat'))
	
	set(foo, { nested:{ deeper:{ yet:'qwe' } } })
	set(bar, "hi")
	assert.is(a.value({ nested:{ deeper:{ yet:'qwe' } } }), evaluate(foo))
	assert.is(a.value({ deeper:{ yet:'qwe' } }), evaluate(foo, 'nested'))
	assert.is(a.value({ yet:'qwe' }), evaluate(foo, 'nested.deeper'))
	assert.is(a.value('qwe'), evaluate(foo, 'nested.deeper.yet'))
	assert.is(a.value('hi'), evaluate(bar))
	assert.is(a.value(null), evaluate(bar, 'qweqweqwe'))
	assert.is(a.value(null), evaluate(bar, 'qweqweqwe.asdasd'))
	assert.is(undefined, evaluate(bar, 'qweqweqwe.asdasd', true))
})

test('observe value', function(assert) {
	var v1 = a.variable({ foo:null })
	observeExpect(v1, 'foo', assert, [null, 1, 2, { ned:'teq'}, 'qwe', null])
	// observeExpect(v1, null, assert, [{ foo:null }, { foo:1 }, { foo:2 }, { foo:{ ned:'teq'} }, { foo:'qwe' }, null])
	observeExpect(v1, 'foo.ned', assert, [null, 'teq', null])
	
	set(v1, { foo:null })
	set(v1, { foo:1 })
	set(v1, 'foo', 2)
	set(v1, 'blah', 'wab')
	set(v1, 'foo.blah', 'wab')
	set(v1, 'foo', { ned:'teq' })
	set(v1, 'foo', 'qwe')
	set(v1, null)
})

// test('observe subvalue', function(assert, blocks) {
// 	set('a', null)
// 	observeExpect('a.b.c', blocks, [null, 1, null, 2, null, 3])
// 	set('a', { b:{ c:1 } })
// 	set('a.b', 9)
// 	set('a.b', { c:2 })
// 	set('a.b.c', null)
// 	set('a.b.c', 3)
// })

var q = function(val) { return JSON.stringify(val) }

var set = function(variable, chain, value) {
	if (arguments.length == 2) {
		value = chain
		chain = null
	}
	return fun.set(variable, chain, a.value(value))
}
var evaluate = function(value, nameString, defaultToUndefined) { return fun.evaluate(value, nameString && nameString.split('.'), defaultToUndefined) }
var observeExpect = function(variable, nameString, assert, values) {
	assert.blocks.add(values.length)
	values = map(values, a.value)
	fun.observe(variable, nameString, function() {
		if (!deepEqual(evaluate(variable, nameString), values[0])) { return }
		values.shift()
		assert.blocks.subtract()
	})
}

function test(name, fn) {
	module.exports['test ' + name] = function(assert) {
		fun.reset()
		assert.blocks = {
			_count: 0,
			_done: false,
			add: function(num) { this._count += (typeof num == 'number' ? num : 1) },
			subtract: function(num) {
				this._count--
				this.tryNow()
			},
			tryNow: function() {
				if (this._count || this._done) { return }
				this._done = true
				assert.done()
			}
		}
		assert.is = function(val1, val2) {
			return this.deepEqual(val1, val2)
		}
		fn(assert)
		assert.blocks.tryNow()
	}
}
