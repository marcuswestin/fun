var storeAPI = require('./storage'),
	pubsubAPI = require('./pubsub'),
	util = require('../util')

module.exports = {
	getStore: function() { return util.create(storeAPI) },
	getPubSub: function() { return util.create(pubsubAPI) }
}

process.on('SIGINT', function() {
	console.log('\nnode engine caught SIGINT - shutting down cleanly')
	process.exit()
})

