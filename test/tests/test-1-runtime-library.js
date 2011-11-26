var fun = require('../../src/runtime-library'),
	slice = require('std/slice'),
	a = require('../runtime-mocks'),
	isArray = require('std/isArray'),
	each = require('std/each')

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
	assert.is(undefined, evaluate(bar, 'qweqweqwe.asdasd'))
})
// 
// test('observe value', function(assert, blocks) {
// 	set('v1', { foo:null })
// 	observeExpect('v1.foo', blocks, [null, 1, 2, 'qwe'])
// 	set('v1', { foo:1 })
// 	set('v1.foo', 2)
// 	set('v1.foo', 'qwe')
// })
// 
// test('observe subvalue', function(assert, blocks) {
// 	set('a', null)
// 	observeExpect('a.b.c', blocks, [null, 1, null, 2, null, 3])
// 	set('a', { b:{ c:1 } })
// 	set('a.b', 9)
// 	set('a.b', { c:2 })
// 	set('a.b.c', null)
// 	set('a.b.c', 3)
// })

var get = function(nameString) { return fun.get(nameString, true) }
var set = function(variable, chain, value) {
	if (arguments.length == 2) {
		value = chain
		chain = null
	}
	return fun.set(variable, chain, a.value(value))
}
var evaluate = function(value, chain) { return fun.evaluate(value, chain && chain.split('.')) }
var observeExpect = function(nameString, blocks, values) {
	blocks.add(values.length)
	fun.observe(nameString, function() {
		if (get(nameString) != values[0]) { return }
		values.shift()
		blocks.subtract()
	})
}

function test(name, fn) {
	module.exports['test ' + name] = function(assert) {
		fun.reset()
		var blocks = {
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
		fn(assert, blocks)
		blocks.tryNow()
	}
}
