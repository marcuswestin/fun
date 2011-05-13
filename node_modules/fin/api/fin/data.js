var keys = require('./keys'),
	util = require('./util')

module.exports = {
	setEngine: setEngine,
	getListItems: getListItems,
	retrieveStateMutation: retrieveStateMutation,
	createItem: createItem,
	mutateItem: mutateItem,
	transact: transact
}

/* State
 *******/
var store, pubsub

/* Exposed functions
 *******************/
function setEngine(theEngine) {
	engine = theEngine
	store = engine.getStore()
	pubsub = engine.getPubSub()
}

function getListItems(listKey, from, to, callback) {
	if (!to) { to = -1 } // grab the entire list if no end index is specified
	store.getListItems(listKey, from, to, function(err, items) {
		if (err) { throw 'could not retrieve list range: '+[listKey,from,to,err].join(' ')  }
		callback(items)
	})
}

function retrieveStateMutation(key, type, callback) {
	switch(type) {
		case 'BYTES':
			_retrieveBytes(key, function(json) {
				callback({ op: 'set', args: [json] })
			})
			break
		
		case 'SET':
			_retrieveSet(key, function(members) {
				callback({ op: 'sadd', args: members })
			})
			break
			
		default:
			throw 'could not retrieve state mutation of unknown type: '+[type+key].join(' ')
	}
}

function _retrieveSet(key, callback) {
	store.getMembers(key, function(err, members) {
		if (err) { throw 'could not retrieve members of set: '+[key,err].join(' ') }
		callback(members)
	})
}

function createItem(itemProperties, origClient, callback) {
	store.increment(keys.uniqueIdKey, function(err, newItemID) {
		if (err) { throw 'could not increment unique item id counter: '+err }
		
		var doCallback = util.blockCallback(
				util.curry(callback, newItemID), { throwErr: true, fireOnce: true })
		
		for (var propName in itemProperties) {
			var value = itemProperties[propName]
				mutation = { id: newItemID, property: propName, op: 'set', args: [value] }
			
			mutateItem(mutation, origClient, doCallback.addBlock())
		}
		
		doCallback.tryNow()
	})
}

function mutateItem(mutation, origClient, callback) {
	_mutateItem(mutation, callback)
	_publishMutation(mutation, origClient)
}

function transact(mutations, origClient) {
	store.transact(function() {
		for (var i=0; i < mutations.length; i++) {
			_mutateItem(mutations[i])
		}
	})
	for (var i=0, mutation; mutation = mutations[i]; i++) {
		_publishMutation(mutation, origClient)
	}
}

function _mutateItem(mutation, callback) {
	var key = keys.getItemPropertyKey(mutation.id, mutation.property)
	store.handleMutation(mutation.op, key, mutation.args, callback)
}

/* Util functions
 ****************/
var _retrieveBytes = function(key, callback) {
	store.getBytes(key, function(err, value) {
		if (err) { throw 'could not retrieve BYTES for key: '+[key, err].join(' ') }
		callback(value)
	})
}

console.log("storage TODO: Fix the 9 digit limit on connId")
var _publishMutation = function(mutation, origClient) {
	var key = keys.getItemPropertyKey(mutation.id, mutation.property),
		connId = origClient ? origClient.sessionId : ''
	
	if (connId.length > 9) {
		// TODO Right now we parse the connection ID out of the mutation bytes, and the first digit says how many bytes the ID is.
		// Really, we should use the byte value of the first byte to signify how long the ID is, and panic if it's longer than 255 characters
		connId = connId.substr(0, 9)
	}
	// TODO clients should subscribe against pattern channels, 
	//	e.g. for item props *:1@type:* and for prop channels *:#type:*
	//	mutations then come with a single publication channel, 
	//	e.g. :1@type:#type: for a mutation that changes the type of item 1
	// var propChannel = keys.getPropertyChannel(propName)
	
	var mutationBuffer = connId.length + connId + JSON.stringify(mutation)
	pubsub.publish(key, mutationBuffer)
	// pubsub.publish(propChannel, mutationBuffer)
}
