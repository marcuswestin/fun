exports.name = 'List'

exports.mutations = {
	push: { signature: ['_'] },
	pop: { signature: [] },
	unshift: { signature: ['_'] },
	shift: { signature: [] },
	set: { signature: ['Number', '_'] },
	trim: { signature: ['Number', 'Number'] }
}

// TODO Infer list type, i.e. differentate between List of Strings [String] and List of Numbers [Number]
exports.of = function() {}