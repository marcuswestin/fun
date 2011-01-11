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
