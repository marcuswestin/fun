var redis = require('redis-client'),
	util = require('../util')

module.exports = {
	getStore: getStore
}

function getStore() {
	var store = util.create(storeAPI)
	store.redisClient = redis.createClient()
	store.redisClient.stream.setTimeout(0)
	return store
}

/* The store's API
 *****************/
var storeAPI = {
	getBytes: getBytes,
	getListItems: getListItems,
	getMembers: getMembers,
	set: handleSet,
	handleMutation: handleMutation,
	transact: handleTransaction,
	increment: handleIncrement,
	close: close
}

/* Getters
 *********/
// Returns a list of items, or an empty list if value at listKey is not set
function getListItems(listKey, from, to, callback) {
	this.redisClient.lrange(listKey, from, to, function(err, itemBytesArray) {
		if (err) { return callback(err, null) }
		if (!itemBytesArray) { return callback(null, []) }
		for (var items=[], i=0; i<itemBytesArray.length; i++) {
			items.push(itemBytesArray[i].toString())
		}
		callback(null, items)
	})
}

// Returns a string
function getBytes(key, callback) {
	this.redisClient.get(key, function(err, valueBytes) {
		if (err) { return callback(err) }
		if (!valueBytes) { return callback(null, null) }
		callback(null, valueBytes.toString())
	})
}

function getMembers(key, callback) {
	this.redisClient.smembers(key, function(err, membersBytes) {
		if (err) { return callback(err) }
		if (!membersBytes) { return callback(null, []) }
		for (var members=[], i=0; i<memberBytes.length; i++) {
			members.push(memberBytes[i].toString())
		}
		callback(null, members)
	})
}

function close() {
	this.redisClient.close()
}

var finToRedisOperationMap = {
	'set': 'set',
	'push': 'rpush',
	'unshift': 'lpush',
	'sadd': 'sadd',
	'srem': 'srem',
	'increment': 'incr',
	'decrement': 'decr',
	'add': 'incrby',
	'subtract': 'decrby'
}

function handleMutation(operation, key, args, callback) {
	var redisOp = finToRedisOperationMap[operation],
		operationArgs = [key].concat(args)
	if (callback) { operationArgs.push(callback) }
	this.redisClient[redisOp].apply(this.redisClient, operationArgs)
}

function handleTransaction(transactionFn) {
	this.redisClient.transact(transactionFn)
}

function handleIncrement(key, callback) {
	this.redisClient.incr(key, callback)
}

function handleSet(key, value) {
	this.redisClient.set(key, value)
}
