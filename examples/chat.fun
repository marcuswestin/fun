class Global {
	1 messages: List of Message
}

class Message {
	1 body: Text
}

let userInput = ""

<link rel="stylesheet" href="examples/chat.css" />

<div class="chat">
	<input data=userInput class="messageInput"/>
	<button>"Send"</button onClick=handler() {
		let newMessage = new { text: userInput }
		userInput.set("")
		global.messages.unshift(newMessage)
	}>
	<div class="messages">
		for (message in global.messages) {
			<div class="message"> message.text </div>
		}
	</div>
</div>

