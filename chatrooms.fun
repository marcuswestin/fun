import Local
import Global

<div class="rooms">
	<input data=Local.newRoomName />
	<button>"Create new room"</button onclick=handler() {
		let newRoom = new { name:Local.newRoomName, messages:[] }
		Global.rooms.unshift(newRoom)
		Local.newRoomName.set('')
	}>
	for (room in Global.rooms) {
		<div class="room" style={ cursor:'pointer' }>
			<div class="name">room.name</div onclick=handler() {
				Local.currentRoom.set(room)
			}>
		</div>
	}
</div>

if (Local.currentRoom) {
	"Username "<input data=Local.username />
	<div class="currentChatroom">
		<div class="messages">
			for (message in Local.currentRoom.messages) {
				message.sender ": " <input class="message" data=message.text style={ width: 350 }/>
				<br />
			}
		</div>
		<input data=Local.messageText /><button>"Send"</button onclick=handler() {
			let newMessage = new { sender: Local.username, text: Local.messageText }
			Local.messageText.set('')
			Local.currentRoom.messages.push(newMessage)
		}>
	</div>
} else {
	"Click on a room to join it"
}
