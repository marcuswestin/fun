var expressions = require('./expressions')

module.exports = {
	'+': add
}

function add(left, right) {
	if (left.type == 'number' && right.type == 'number') {
		return expressions.number(left.content + right.content)
	}
	return expressions.text(left.toString() + right.toString())
}