class Global {
	1 messages: List of Message
}

class Message {
	1 body: Text
}

import Local

<link rel="stylesheet" href="examples/chat.css" />

<div class="chat">
	<input data=Local.message class="messageInput"/>
	<button>"Send"</button onClick=handler() {
		let newMessage = new { text: Local.message }
		Local.message.set("")
		global.messages.unshift(newMessage)
	}>
	<div class="messages">
		for (message in global.messages) {
			<div class="message"> message.text </div>
		}
	</div>
</div>

