var proto = require('std/proto')

var number = proto(
	function(value) {
		this.value = value
	}, {
		'+':function(that) {
			var value = this.value + that.value,
				type = typeof value
			switch(type) {
				case 'number': return number(value)
				default: throw new Error("Bad number type", this, that)
			}
		}
	}
)


module.exports = {
	number: number
}
