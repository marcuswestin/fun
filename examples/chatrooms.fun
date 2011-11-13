import Local
import Global

// Chatrooms app templates
let templates = {
	
	// List all the rooms
	roomsList: template() {
		<h1>"Rooms"</h1>
		for (room in Global.rooms) {
			<div class="room" style={ cursor:'pointer' }>
				<span class="name"> room.name </span onclick=handler() {
					Local.currentRoom.set(room)
				}>
				if (room == Local.currentRoom) { <span class="currentRoomArrow">" --> "</span> }
			</div>
		}
	},
	
	// Render controls for creating a new room: an input field for the room name, and a button to create it
	newRoomControls: template() {
		<div class="newRoom">
			<input data=Local.newRoomName /><br />
			<button>"Create new room"</button onclick=handler() {
				let newRoom = new { name:Local.newRoomName, messages:[] }
				Global.rooms.unshift(newRoom)
				Local.newRoomName.set('')
			}>
		</div>
	},
	
	// Render the currently selected chatroom
	renderCurrentRoom: template() {
		<div class="currentChatroom">
			<h2> Local.currentRoom.name </h2>
			<div class="chat">
				"username" <input data=Local.username />
				<br />"message" <input data=Local.messageText />
				<button>"Send"</button onclick=handler() {
					let newMessage = new { sender: Local.username, text: Local.messageText }
					Local.messageText.set('')
					Local.currentRoom.messages.unshift(newMessage)
				}>
			</div>
			
			<div class="messages">
				for (message in Local.currentRoom.messages) {
					message.sender ": " <input class="message" data=message.text style={ width: 350 }/>
					<br />
				}
			</div>
		</div>
	},
}

// Start application
////////////////////
<link rel="stylesheet" href="examples/chatrooms.css" />

<div class="rooms">
	templates.roomsList()
	templates.newRoomControls()
</div>

if (Local.currentRoom) {
	// TODO Pass in Local.currentRoom and rename template to renderRoom
	templates.renderCurrentRoom()
}
