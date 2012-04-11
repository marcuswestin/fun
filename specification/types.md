Types
=====
We may want to add incremental typing via interfaces. They are different from variables by starting with an upper case name.

Interfaces
----------
The value types can be combined into interfaces:

	User = { id:Number, name:Text }
	ListOfNumbers = [Number]
	ListOfUsers = [User]
	HashOfNumbers = <Number>
	HashOfUsers = <User>

Handlers, Templates and Functions can specify the interfaces that they expect. Code that calls them must pass in values that conform to the expected interfaces:
		
	drawUser = template(User user) {
		<div class="user">
			"Name: " user.name
		</div>
	}
	drawUser({ id:1, name:"Marcus" }) // this compiles
	drawUser({ name:"Ashley" }) // this won't compile. drawUser expects a User, which has { id:Number } in addition to { name:Text }

The expected interface can be inlined, though it's good practice to explicitly name interfaces.
For example, drawUser does not depend on user.id so it could specify a smaller interface:

	drawUser2 = template({ name:Text } user) {
		<div class="user">"Name: " user.name</div>
	}
	drawUser2({ id:1, name:"Marcus" }) // this runs
	drawUser2({ name:"Ashley" }) // as does this

Getting the type of a value is simple. This emits "Number":

	var a = 1
	a.Type

Old example of possible example typed chat app:

	#import WebSocket
	
	Message = { body:Text }
	
	var [Message] messages = []
	
	WebSocket.on('message', handler(Message message) { messages.push(message) })
	
	<div class="chat">
		var input = ""
		<input data=input />
		<button>"Send"</button onClick=handler() {
			var message = { body:input.copy() }
			input.set('')
			WebSocket.send('message', message)
			messages.push(message)
		}>
		<div class="messages">
			for (message in messages) {
				<div class="message"> message.body </div>
			}
		</div>
	</div>
