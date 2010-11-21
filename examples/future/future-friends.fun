let user = Session.User

let sendMessageToFriend = handler(friend) {
	let message = Local.friendMessages[friend]
	friend.messages.append({ sender: user, message: message })
}

<h1>"Say hi to your friends"</h1>
for (friend in user.friends) {
	<div class="friend">
		<img src=friend.picture_url />
		<span class="name">friend.name</span>
		<editable data=Local.friendMessages[friend]>
		<button onClick=sendMessageToFriend(friend)>
	</div>
}
