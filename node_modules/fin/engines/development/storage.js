var fs = require('fs'),
	path = require('path')

var data = {},
	dataDumpFile = './_development-engine-dump.json'

if (path.existsSync(dataDumpFile)) {
	console.log('node engine found ' + dataDumpFile + ' - loading data...')
	data = JSON.parse(fs.readFileSync(dataDumpFile))
	console.log('done loading data')
}

process.on('exit', function() {
	console.log('node storage engine detected shutdown - dumping data...')
	fs.writeFileSync(dataDumpFile, JSON.stringify(data))
	console.log('done dumping data.')
})

function typeError(operation, type, key) {
	return '"'+operation+'" expected a '+type+' at key "'+key+'" but found a '+typeof data[key]
}

var storeAPI = module.exports = {
	/* Getters
	 *********/
	getBytes: function(key, callback) {
		if (typeof data[key] == 'undefined') {
			callback && callback(null, null)
		} else if (typeof data[key] == 'string' || typeof data[key] == 'number') {
			callback && callback(null, data[key])
		} else {
			callback && callback(typeError('getBytes', 'string or number', key))
		}
	},
	
	getListItems: function(key, from, to, callback) {
		if (typeof data[key] == 'undefined') {
			callback && callback(null, [])
		} else if (!(data[key] instanceof Array)) {
			callback && callback(typeError('getListItems', 'list', key))
		} else {
			if (to < 0) { to = data[key].length + to + 1 }
			from = Math.max(from, 0)
			to = Math.min(to, data[key].length)
			callback && callback(null, data[key].slice(from, to - from))
		}
	},
	
	getMembers: function(key, callback) {
		if (typeof data[key] == 'undefined') {
			callback && callback(null, [])
		} else if (typeof data[key] != 'object') {
			callback && callback(typeError('getMembers', 'set', key))
		} else {
			var response = []
			for (var value in data[key]) { response.push(JSON.parse(value)) }
			callback && callback(null, response)
		}
	},
	
	/* Mutation handlers
	 *******************/
	handleMutation: function(operation, key, args, callback) {
		var operationArgs = [key].concat(args)
		if (callback) { operationArgs.push(callback) }
		storeAPI[operation].apply(this, operationArgs)
	},
	
	transact: function(transactionFn) {
		// the development engine acts atomically. We assume node won't halt during an operation
		transactionFn()
	},
	
	set: function(key, value, callback) {
		if (typeof data[key] == 'undefined' || typeof data[key] == 'string' || typeof data[key] == 'number') {
			data[key] = value
			callback && callback(null, data[key])
		} else {
			callback && callback(typeError('set', 'string or number', key), null)
		}
	},
	
	push: function(key, values, callback) {
		if (typeof data[key] == 'undefined') {
			data[key] = [].concat(values)
			callback && callback(null, null)
		} else if (data[key] instanceof Array) {
			data[key] = data[key].concat(values)
			callback && callback(null, null)
		} else {
			callback && callback(typeError('push', 'list', key), null)
		}
	},
	
	unshift: function(key, values, callback) {
		var values = Array.prototype.slice.call(arguments, 1)
		if (typeof data[key] == 'undefined') {
			data[key] = [].concat(values)
			callback && callback(null, null)
		} else if (data[key] instanceof Array) {
			data[key] = values.concat(data[key])
			callback && callback(null, null)
		} else {
			callback && callback(typeError('push', 'list', key), null)
		}
	},
	
	increment: function(key, callback) {
		if (typeof data[key] == 'undefined') {
			data[key] = 1
			callback && callback(null, data[key])
		} else if (typeof data[key] == 'number') {
			data[key] += 1
			callback && callback(null, data[key])
		} else {
			callback && callback(typeError('increment', 'number', key), null)
		}
	},
	
	decrement: function(key, callback) {
		if (typeof data[key] == 'undefined') {
			data[key] = -1
			callback && callback(null, data[key])
		} else if (typeof data[key] == 'number') {
			data[key] -= 1
			callback && callback(null, data[key])
		} else {
			callback && callback(typeError('decrement', 'number', key), null)
		}
	},
	
	add: function(key, value, callback) {
		if (typeof data[key] == 'undefined') {
			data[key] = value
			callback && callback(null, data[key])
		} else if (typeof data[key] == 'number') {
			data[key] += value
			callback && callback(null, data[key])
		} else {
			callback && callback(typeError('add', 'number', key), null)
		}
	},
	
	subtract: function(key, value, callback) {
		if (typeof data[key] == 'undefined') {
			data[key] = -value
			callback && callback(null, data[key])
		} else if (typeof data[key] == 'number') {
			data[key] -= value
			callback && callback(null, data[key])
		} else {
			callback && callback(typeError('subtract', 'number', key), null)
		}
	},
	
	sadd: function(key, value, callback) {
		value = JSON.stringify(value)
		if (typeof data[key] == 'undefined') {
			data[key] = {}
			data[key][value] = true
			callback && callback(null, 1)
		} else if (typeof data[key] == 'object') {
			var response = data[key][value] ? 0 : 1
			data[key][value] = true
			callback && callback(null, response)
		} else {
			callback && callback(typeError('sadd', 'set', key), null)
		}
	},
	
	srem: function(key, value, callback) {
		value = JSON.stringify(value)
		if (typeof data[key] == 'undefined') {
			callback && callback(null, 0)
		} else if (typeof data[key] == 'object') {
			var response = data[key][value] ? 1 : 0
			delete data[key][value]
			callback && callback(null, response)
		} else {
			callback && callback(typeError('srem', 'set', key), null)
		}
	},
}

