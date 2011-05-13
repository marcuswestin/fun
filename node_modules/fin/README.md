Getting started
---------------
Install fin
	npm install fin

Run the server
	fin localhost 8080

Now fire up your browser to localhost/[path to fin]/demo, or try out the Key/Value API example below

Key/Value API
-------------
	<script src="http://localhost:8080/fin-api.js"></script>
	<script>
	fin.connect('localhost', 8080, function() {
		// Create items
		fin.create({ name: 'john' }, function(friendID) {
			fin.create({ name: 'marcus' }, function(marcusID) {
				fin.set(marcusID, 'friend', friendID)

				// Observe item properties
				fin.observe(marcusID, 'name', function(mutation) { console.log("Marcus' name is", mutation.value) })
				fin.observe(marcusID, 'friend.name', function(mutation) { console.log("Marcus' friend's name is", mutation.value) })
			})

			// Mutate item properties
			var names = ['john', 'david', 'lars', 'henrik', 'johannes', 'mark']
			setInterval(function() {
				fin.set(friendID, 'name', names[Math.floor(Math.random() * names.length)])
			}, 1000 + Math.ceil(Math.random() * 3000))
		})
	})
	</script>

ORM API
-------
	<script src="http://localhost:8080/fin-models-api.js"></script>
	<script>
	fin.connect('localhost', 8080, function() {
		// Declare schema
		fin.models.process({
			"Global": {
				"messages": { id:1, type:'List', of:'Message' }
			},
			"Message": {
				"text": { id:1, type:'Text' },
				"from": { id:2, type:'User' }
			},
			"User": {
				"name": { id:1, type:'Text' },
				"age":  { id:2, type:'Number' }
			}
		})

		// Instantiate models
		var user = new fin.models.User(1) // user with ID 1
		var message = new fin.models.Message({ text:'Hi!', from:user })
		fin.models.global.messages.push(message)
		
		// Observe model properties
		fin.models.global.messages.on('push', function(message) {
			message.from.name.observe(function(name) { console.log('message from', name) })
			message.text.observe(function(text) { console.log('message text is',  text) })
		})
	</script>

Engines
-------
Fin uses pluggable engines for storage and pubsub. You can build your own engine, or use one that comes with fin.
	
	var fin = require('fin'), engine = require('fin/engines/development')
	fin.start('localhost', 8080, engine)

The "development" engine holds all data and handles subscriptions in node process memory. It's great for development since you do not need to install a storage system and a pubsub system to get started. In production, you should use a more scalable engine, e.g. the redis engine:

Install redis
	sudo make install-redis
Start redis server
	redis-server
Start fin server
	var fin = require('fin'), redisEngine = require('fin/engines/development')
	fin.start('production.com', 8080, redisEngine)
