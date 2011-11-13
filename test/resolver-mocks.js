var mocks = require('./ast-mocks')

module.exports = Object.create(mocks)

module.exports.object = function(resolvedKVPs) {
	return { type:'OBJECT', resolved:resolvedKVPs }
}
