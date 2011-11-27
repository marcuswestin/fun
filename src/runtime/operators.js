var expressions = require('./expressions')

module.exports = {
	'+': add,
	'==': equals // I wonder if we should make this just =...
}

function add(left, right) {
	if (left.type == 'number' && right.type == 'number') {
		return expressions.number(left.content + right.content)
	}
	return expressions.text(left.asRawString() + right.asRawString())
}

function equals(left, right) { return left.evaluate().equals(right.evaluate()) }
