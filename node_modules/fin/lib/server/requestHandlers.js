var data = require('./data'),
	keys = require('../shared/keys'),
	util = require('../shared/util')

module.exports = {
	observeHandler: handleObserveRequest,
	unsubscribeHandler: handleUnsubscribeRequest,
	createHandler: handleCreateRequest,
	mutateHandler: handleMutateRequest,
	transactionHandler: handleTransactionRequest,
	extendListHandler: handleExtendListRequest
}

function handleObserveRequest(client, request) {
	var type = request.type,
		key = keys.getItemPropertyKey(request.id, request.property)
	
	client.pubsub.subscribe(key, util.curry(_itemMutationChannelHandler, client))
	
	if (request.snapshot != false) {
		// fake an item mutation event
		data.retrieveStateMutation(key, type, function(mutation) {
			mutation.id = request.id
			mutation.property = request.property
			client.send({ event:'mutation', data:JSON.stringify(mutation) })
		})
	}
}

function handleUnsubscribeRequest(client, request) {
	var key = keys.getItemPropertyKey(request.id, request.property)
	client.pubsub.unsubscribe(key)
}

function handleCreateRequest(client, request) {
	data.createItem(request.data, client, function(itemData) {
		client.send({ response:request._requestId, data:itemData })
	})
}

function handleMutateRequest(client, request) {
	data.mutateItem(request.mutation, client)
}

function handleTransactionRequest(client, request) {
	var mutations = util.pick(request.actions, function(act) { return act.request == 'mutate' && act.mutation })
	data.transact(mutations, client)
}

function handleExtendListRequest(client, request) {
	var key = keys.getItemPropertyKey(request.id, request.property),
		from = request.from,
		to = request.to
	
	data.getListItems(key, from, to, function(items) {
		client.send({ response:request._requestId, data:items })
	})
}

/* Util
 ******/
console.log("requests TODO: Fix the 9 digit limit on connId")
var _itemMutationChannelHandler = function(client, key, mutationBytes) {
	var mutationInfo = _parseMutationBytes(mutationBytes)
	if (mutationInfo.originId == client.sessionId.substr(0, 9)) { return }
	client.send({ event:'mutation', data:mutationInfo.json })
}

var _parseMutationBytes = function(mutationBytes) {
	var mutationJSON, originId
	
	// The mutation bytes is a JSON string prepended by the ID of the connection that
	// originated the mutation. The first byte will be an integer which gives the number
	// of subsequent bytes taken up by the origin ID.
	
	var idLength = mutationBytes[0] - 48,
		mutationString = mutationBytes.toString()
	
	originId = mutationString.substr(1, idLength)
	mutationJSON = mutationString.substr(1 + idLength)
	
	return { json: mutationJSON, originId: originId }
}
