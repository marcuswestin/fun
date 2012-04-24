var fun = require('../../src/runtime/library'),
	slice = require('std/slice'),
	a = require('../runtime-mocks'),
	isArray = require('std/isArray'),
	each = require('std/each'),
	map = require('std/map'),
	deepEqual = require('std/assert/deepEqual')

test('sets and gets', function(assert) {
	var foo = a.declaration(1),
		bar = a.declaration({ cat:{ asd:2 } }),
		error
	assert.equals(a.value(1), foo)
	assert.equals(a.value(null), a.reference(foo, 'cat'))
	assert.equals(a.value(2), a.reference(bar, 'cat.asd'))
	assert.equals(a.value({ asd:2 }), a.reference(bar, 'cat'))
	
	assert.throws(function() { fun.set(foo, 'chain', a.value('break')) })
	assert.throws(function() { fun.set(foo, 'deeper.chain', a.value('break')) })
	
	fun.set(bar, 'cat', a.value({ asd:3 }))
	assert.equals(a.value(3), a.reference(bar, 'cat.asd'))
	assert.equals(a.value({ asd:3 }), a.reference(bar, 'cat'))
	
	fun.set(foo, null, a.value({ nested:{ deeper:{ yet:'qwe' } } }))
	fun.set(bar, null, a.value('hi'))

	assert.equals(a.value({ nested:{ deeper:{ yet:'qwe' } } }), foo)
	assert.equals(a.value({ deeper:{ yet:'qwe' } }), a.reference(foo, 'nested'))
	assert.equals(a.value({ yet:'qwe' }), a.reference(foo, 'nested.deeper'))
	assert.equals(a.value('qwe'), a.reference(foo, 'nested.deeper.yet'))
	assert.equals(a.value('hi'), bar)
	assert.equals(a.value(null), a.reference(bar, 'qweqweqwe'))
	assert.equals(a.value(null), a.reference(bar, 'qweqweqwe.asdasd'))
	
	assert.equals(a.reference(bar, 'qweqweqwe.asdasd').evaluate(true).getType(), 'Null')
})

test('observe value', function(assert) {
	var v1 = a.declaration({ foo:null })
	observeExpect(v1, 'foo', assert, [null, 1, 2, { ned:'teq'}, 'qwe', null])
	observeExpect(v1, null, assert, [{ foo:null }, { foo:1 }, { foo:2 }, { foo:{ ned:'teq'}, blah:'wab' }, { foo:'qwe', blah:'wab' }, null])
	observeExpect(v1, 'foo.ned', assert, [null, 'teq', null])
	
	fun.set(v1, null, a.value({ foo:null }))
	fun.set(v1, null, a.value({ foo:1 }))
	fun.set(v1, 'foo', a.value(2))
	fun.set(v1, 'blah', a.value('wab'))
	fun.set(v1, 'foo', a.value({ ned:'teq' }))
	fun.set(v1, 'foo', a.value('qwe'))
	fun.set(v1, null, a.value(null))
})

test('observe subvalue', function(assert) {
	var v = a.declaration(null)
	observeExpect(v, 'b.c', assert, [null, 1, null, 2, null, 3])
	fun.set(v, null, a.value({ b:{ c:1 } }))
	fun.set(v, 'b', a.value(9))
	fun.set(v, 'b', a.value({ c:2 }))
	fun.set(v, 'b.c', a.value(null))
	fun.set(v, 'b.c', a.value(3))
})

test('evaluate composite expressions', function(assert) {
	var v1 = a.declaration(1),
		v2 = a.declaration(2),
		v3 = a.declaration(3),
		v4 = a.declaration('4')
	assert.equals(a.composite(v1, '+', v2), a.value(3))
	assert.equals(a.composite(v1, '+', v2), v3)
	assert.equals(a.composite(v4, '+', v1), a.value('41'))
	assert.equals(v3, a.composite(v1, '+', v2))
	assert.equals(a.value(true), a.composite(a.value(4), '==', a.composite(v1, '+', v3)))
	assert.equals(a.value(false), v3.equals(a.composite(v1, '+', v1)))
})

test('observing and dismissing', function(assert) {
	var v1 = a.declaration(1)
	var observationID = observeExpect(v1, null, assert, [1,2], true)
	fun.set(v1, null, a.value(2))
	assert.throws(function() {
		// We expected exactly 2 observation callbacks
		fun.set(v1, null, a.value(3))
	})
	v1.dismiss(observationID)
	// Should no longer throw, since the observation was dismissed
	fun.set(v1, null, a.value(4))
	
	var v2 = a.declaration('a')
	var d2 = a.value({ v2:v2 })
	var expectedCalls = 3
	d2.observe(function() { if (!(expectedCalls--)) { throw new Error("Expected only three calls") } }) // Call 1
	fun.set(v2, null, a.value('b')) // Call 2
	fun.set(d2, 'v2', a.value('new value that should automatically dismiss v2 observation')) // Call 3
	fun.set(v2, null, a.value('c')) // Should not result in call 4
})

var q = function(val) { return JSON.stringify(val) }

var evaluate = function(value, nameString) {
	if (nameString) {
		return fun.expressions.reference(value, nameString.split('.')).evaluate()
	} else {
		return value.evaluate()
	}
}

var waitingFor = []
var observeExpect = function(variable, chain, assert, values, throwOnExtraMutations) {
	assert.blocks.add(values.length)
	values = map(values, a.value)
	waitingFor.push({ original:map(values, a.value), now:values })
	if (chain) { variable = a.reference(variable, chain) }
	return variable.observe(function() {
		if (!values[0]) {
			if (throwOnExtraMutations) { throw new Error("Received unexpected mutation") }
			return
		}
		var logic = variable.equals(values[0])
		if (!logic.getContent()) { return }
		values.shift()
		assert.blocks.subtract()
	})
}

function test(name, fn) {
	module.exports[name] = function(assert) {
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
		assert.equals = function(val1, val2) {
			if (fun.expressions.base.isPrototypeOf(val1) || fun.expressions.base.isPrototypeOf(val2)) {
				return this.ok(val1.equals(val2).getContent())
			} else {
				return this.deepEqual(val1, val2)
			}
		}
		assert.throws = function(fn) {
			var didThrow = false
			try { fn() }
			catch(e) { didThrow = true }
			this.ok(didThrow)
		}
		try { fn(assert) }
		catch(e) { console.log('ERROR', e.stack || e); assert.fail('Test threw: ' + e.message) }
		each(waitingFor, function(waitingFor) {
			if (!waitingFor.now.length) { return }
			console.log("Still waiting for:", waitingFor)
		})
		assert.blocks.tryNow()
	}
}
