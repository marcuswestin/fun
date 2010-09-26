TODO
====

Create loops
------------
	<div class="fruits">
		for (fruit in fruits) {
			<div class="fruit">
				This <span class="name"> fruit.name </span>
				is <span class="color" style={ color: fruit.color }> fruit.color </span>
			</div>
		}
	</div>

Create function declarations and invocations
--------------------------------------------
	let emitUserRow = function(user) {
		<div class="user " + (user.isMe ? "me")>
			<img class="picture" src=user.pictureURL />
			<span class="name"> user.name </span>
		</div>
	}
	
	<div class="friends">
		for (friend in Session.user.friends) {
			emitUserRow(friend)
		}
	</div>

Create the Mouse data object
----------------------------
Rather than 

	Local.mouseX

do

	Mouse.x

and then add

	Mouse.on('down', handler)

Create a Google data object
---------------------------
For Google Buzzes, Videos, Search... Poll at a given frequency