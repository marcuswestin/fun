<div class="compose">
	<input data=Local.newMessage />
	<button onClick=sendMessage>Send</button>
</div>

let sendMessage = handler() {
	Global.messages.push({ user: Session.User, text: Local.newMessage })
}

<div class="messages">
	for (message in Global.messages) {
		<div class="message">
			<img src=message.user.pictureURL />
			message.user.name " says:"
			<span class="text"> message.text </span>
		</div>
	}
</div>
