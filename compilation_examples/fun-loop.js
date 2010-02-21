
for (message in session.messages)
	<div> 
		<img src=message.user.pic />
		message.user.name " says: " message.text
	</div>


===============>>>>


(function(domHook, session){
	var user, views = []
	
	function handleItemAdded(message, insertedAtIndex) {
		var element = dom.create('<div>(( Image user.pic : )){{user.name}} says: {{message.text}}')
		var view = fin.applyToElement(element, {
			user: user,
			message: message
		})
		views.splice(insertedAtIndex, 0, view)
		dom.insertElement(domHook, element, insertAdIndex)
	}
	
	function handleItemRemoved(message, removedFromIndex) {
		var view = views.splice(removedFromIndex, 1)
		dom.remove(view.getElement())
		view.destroy()
	}
	
	function handleItemMoved(message, fromIndex, toIndex) {
		var view = views.splice(fromIndex, 1)
		views.splice(toIndex, 0, view)
		dom.move(view.getElement(), fromIndex, toIndex)
	}
	
	session.addListDependency('messages', handleItemAdded, handleItemRemoved, handleItemMoved)
	
	// How do we add a user dependency for all the users here...?
	session.addDependency('user', updateUser)
	
})(document.appendChild(document.createElement()));