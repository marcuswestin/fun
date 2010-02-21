

if (session.user.isLoggedIn)
	render <div> "Welcome ", session.user.name </div>
else
	render <div> "You are not logged in" </div>


=========>>>


(function(domHook, session){ // session is an argument because it was seen as a root level variable in the execution block
	var lastEvaluation, user, userView
	
	function ifTrue() {
		domHook.innerHTML = "<div>Welcome {{name}}</div>"
		userView = user.applyToDom(domHook)
	}
	
	function ifFalse() {
		if (userView) { 
			userView.destroy()
			delete userView
		}
		domHook.innerHTML = "You are not logged in"
	}
	
	function evaluate() {
		var evaluation = user.getProperty('isLoggedIn');
		if (typeof lastEvaluation == 'undefined' || evaluation != lastEvaluation) {
			evaluation ? ifTrue() : ifFalse()
		}
	}
	
	function updateUser() {
		user.removeDependency(evaluate)
		user = session.getProp('user')
		user.addDependency('isLoggedIn', evaluate)
	}
	
	session.addDependency('user', updateUser)
	
})(document.appendChild(document.createElement('div')), session);