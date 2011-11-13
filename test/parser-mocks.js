var mocks = require('./ast-mocks')

module.exports = Object.create(mocks)

module.exports.object = function(kvps) {
	var content = []
	for (var key in kvps) { content.push({ name:key, value:kvps[key] }) }
	return { type:'OBJECT', content:content }
}
