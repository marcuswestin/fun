import Local
import Global

<link rel="stylesheet" href="chat.css" />

<div class="chat">
	
	<input data=Local.message class="messageInput"/>
	
	<button>"Send"</button onClick=handler() {
		Global.messages.unshift(Local.message)
		set Local.message = " "
	}>
	
	<div class="messages">
		for (message in Global.messages) {
			<div class="message">
				message
			</div>
		}
	</div>

</div>

