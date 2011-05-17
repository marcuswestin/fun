var events = require('events'),
	http = require('http'),
	fs = require('fs'),
	io = require('socket.io-server'),
	data = require('./server/data'),
	requestHandlers = require('./server/requestHandlers'),
	util = require('./shared/util')

module.exports = {
	mount: mount,
	handleRequest: handleRequest,
	on: on
}

/* State
 *******/
var	_handlers = {},
	_emitter = new events.EventEmitter(),
	_engine

var clientJS = fs.readFileSync(__dirname + '/../build/client-api.js'),
	ormJS = fs.readFileSync(__dirname + '/../build/orm-api.js')
		
/* Exported API
 **************/
function mount(server, engine) {
	_engine = engine
	data.setEngine(engine)

	server.on('request', function(req, res) {
		if (req.url == '/fin/client.js') { res.end(clientJS) }
		else if (req.url == '/fin/orm.js') { res.end(ormJS) }
	})

	var socket = io.listen(server)
	socket.on('connection', _handleConnection)

	module.exports
		.handleRequest('observe', requestHandlers.observeHandler)
		.handleRequest('unsubscribe', requestHandlers.unsubscribeHandler)
		.handleRequest('create', requestHandlers.createHandler)
		.handleRequest('mutate', requestHandlers.mutateHandler)
		.handleRequest('extend_list', requestHandlers.extendListHandler)
		.handleRequest('transact', requestHandlers.transactionHandler)
}

function handleRequest(messageType, handler) {
	_handlers[messageType] = handler
	return module.exports
}

function on(event, handler) {
	_emitter.on(event, handler)
	return module.exports
}

/* Handler functions
 *******************/
function _handleConnection(client) {
	console.log('new connection', client.sessionId)
	client.on('message', util.curry(_handleMessage, client))
	client.on('disconnect', util.curry(_handleDisconnect, client))
	client.pubsub = _engine.getPubSub()
	_emitter.emit('client_connect', client)
}

function _handleMessage(client, message) {
	if (!_handlers[message.request]) {
		console.log('unknown request type', message.request)
		return
	}
	_handlers[message.request](client, message)
}

function _handleDisconnect(client) {
	_emitter.emit('client_disconnect', client)
}
