#import WebSocket

let Message = { body:Text }

let [Message] messages = []

WebSocket.on('message', handler(Message message) { messages.push(message) })

<div class="chat">
	let input = ""
	<input data=input />
	<button>"Send"</button onClick=handler() {
		let message = { body:input }
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

