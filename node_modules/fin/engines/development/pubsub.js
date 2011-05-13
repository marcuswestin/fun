var pubsub = {}

module.exports = {
	/* Setup/teardown
	 ****************/
	initialize: function() {
		this._subscriptions = []
	},
	
	close: function() {
		for (var i=0, signal; signal = this._subscriptions[i]; i++) {
			var subscribers = pubsub[signal]
			for (var j=0, subscriber; subscriber = subscribers[j]; j++) {
				if (subscriber[1] != this) { continue }
				subscribers.splice(j, 1)
				break
			}
		}
		delete this._subscriptions
	},

	subscribe: function(channel, callback) {
		if (!pubsub[channel]) { pubsub[channel] = [] }
		pubsub[channel].push(callback)
		this._subscriptions.push(this)
	},
	
	publish: function(channel, message) {
		if (!pubsub[channel]) { return }
		var messageBuffer = new Buffer(message),
			subscribers = pubsub[channel]
		for (var i=0, subscriber; subscriber = subscribers[i]; i++) {
			subscriber(channel, messageBuffer)
		}
	},
	
	unsubscribe: function(channel, callback) {
		var subscribers = pubsub[channel]
		for (var i=0, subscriber; subscriber = subscribers[i]; i++) {
			if (subscriber != callback) { continue }
			subscribers.splice(i, 1)
			break
		}
	}
}

