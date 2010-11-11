exports.name = 'List'

exports.mutations = {
	push: { signature: ['_'] },
	pop: { signature: [] },
	unshift: { signature: ['_'] },
	shift: { signature: [] },
	set: { signature: ['Number', '_'] },
	trim: { signature: ['Number', 'Number'] }
}

