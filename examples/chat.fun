class User {
	1 name: Text,
	2 age: Number,
}

class Message {
	1 sender: User,
	2 body: Text,
	3 subject: Text,
}

import Local
import Global

<link rel="stylesheet" href="examples/chat.css" />

<div class="chat">
	<input data=Local.message class="messageInput"/>
	<button>"Send"</button onClick=handler() {
		let newMessage = new { text: Local.message }
		Local.message.set("")
		Global.messages.unshift(newMessage)
	}>
	<div class="messages">
		for (message in Global.messages) {
			<div class="message"> message.text </div>
		}
	</div>
</div>

