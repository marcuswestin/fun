var mocks = require('./ast-mocks')

module.exports = Object.create(mocks)

module.exports.object = function(kvps) {
	return { type:'OBJECT_LITERAL', content:kvps }
}
