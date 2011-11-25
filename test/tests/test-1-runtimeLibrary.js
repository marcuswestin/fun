var fun = require('../../src/runtimeUtil'),
	slice = require('std/slice'),
	a = require('../resolver-mocks'),
	isArray = require('std/isArray'),
	each = require('std/each')

test('sets and gets', function(assert) {
	set('foo', 1)
	set('bar', { asd:2 })
	assert.encEquals(1, get('foo'))
	assert.encEquals(undefined, get('foo.asd'))
	assert.encEquals(2, get('bar.asd'))
	assert.encEquals({ asd:2 }, get('bar'))
	set('bar.asd', { cat:3 })
	assert.encEquals(3, get('bar.asd.cat'))
	set('bar', { asd:{ cat:3 } })
	assert.encEquals(3, get('bar.asd.cat'))
})

test('observe value', function(assert, blocks) {
	set('v1', { foo:null })
	observeExpect('v1.foo', blocks, [null, 1, 2, 'qwe'])
	set('v1', { foo:1 })
	set('v1.foo', 2)
	set('v1.foo', 'qwe')
})

test('observe subvalue', function(assert, blocks) {
	set('a', null)
	observeExpect('a.b.c', blocks, [null, 1, null, 2, null, 3])
	set('a', { b:{ c:1 } })
	set('a.b', 9)
	set('a.b', { c:2 })
	set('a.b.c', null)
	set('a.b.c', 3)
})

var get = function(nameString) { return fun.get(nameString, true) }
var set = function(nameString, value) { return fun.set(nameString, encode(value)) }
var encode = function(value) {
	if (isArray(value)) { throw "Implement encode#isArray" }
	if (value == null) { return value }
	if (typeof value == 'object') {
		var content = {}
		each(value, function(val, key) { content[key] = encode(val) })
		return a.object(content)
	}
	return value
}
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
		assert.encEquals = function(val1, val2) { return this.deepEqual(encode(val1), val2) }
		fn(assert, blocks)
		blocks.tryNow()
	}
}
