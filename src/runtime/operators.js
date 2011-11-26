var values = require('./values')

module.exports = {
	'+': add
}

function add(left, right) {
	if (left.type == 'number' && right.type == 'number') {
		return values.number(left.content + right.content)
	}
	return values.text(left.toString() + right.toString())
}