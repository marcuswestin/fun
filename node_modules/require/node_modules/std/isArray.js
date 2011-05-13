// thanks @kangax http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
module.exports = function(obj) {
	return Object.prototype.toString.call(obj) == '[object Array]'
}
