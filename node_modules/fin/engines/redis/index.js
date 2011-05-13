var storage = require('./storage'),
	pubsub = require('./pubsub')

module.exports = {
	getStore: storage.getStore,
	getPubSub: pubsub.getPubSub
	// getQuery: getQuery
}
