var mocks = require('./ast-mocks')

module.exports = Object.create(mocks)

var oldReference = module.exports.reference
module.exports.reference = function(value, chain) {
	if (typeof chain == 'string') { chain = chain.split('.')}
	var ref = oldReference('')
	delete ref.name
	ref.value = value
	ref.chain = chain || []
	return ref
}

module.exports.object = function(kvps) {
	return { type:'OBJECT_LITERAL', content:kvps }
}
