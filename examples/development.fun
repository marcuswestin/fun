// Lets define an interface - we'll use it to represent users
let UserID = StaticNumber
let User = {
	id:UserID,
	name:Text,
	follows:[UserID]
} // Should is be possible to do "let User = { id:Number, name:Text, friends:[User] }"?

// Create some objects that satisfy the User interface
let marcus = { id:1, name:"Marcus", friends:[2,3] }
let ashley = { id:2, name:'Ashley', follows:[3] }
let anja = { id:3, name:'Anja', follows:[3] }

let aUsersInfo = XHR.get('/get_user', { id:marcus.friends[0] }, User)

// Now lets create a template that expects a User object
let renderUser = template(User user) {
	<div class="user">
		"Name is " user.name
		for (id in user.follows) {
			"Follows " id
		}
	</div>
}

// Let's render our user
renderUser(marcus)

// referencing a null object doesn't throw - it just evaluates to null
renderUser(null) // => <div class="user">"Name is"</div>
renderUser({ id:null, name:null, follows:null }) // also => <div class="user">"Name is"</div>

let ListOfUsers = [User]
let allUsers = XHR.get('/get_all_users', ListOfUsers)
let allUsers2 = XHR.get('/get_all_users', [User])
let allUsers3 = XHR.get('/get_all_users', [{ id:Number, name:Text, follows:[Number] }])

if (allUsers.loading) { "Loading..." }
else { for (user in allUsers) { /* we know user is a User at this point */ } }

XHR.post('/get_all_users', ListOfUsers, handler(ListOfUsers users) { ... })


let XHR = {
	get:handler(String path, Object args, Type expectedReturnType) {
		
	}
	
	 <script>
		Context.ExpectedReturn == { type:'list', of: { type:'object', of:{ id:{ type:'number' }, name:{ type:'string' }, follows:{ type:'list', of:{ type:'number' } } } } }
		Context.args = 
		
		var 
		
	</script>)
}




/*
	signatures enforce types
	
	let aHandler = handler(Object o) {
		// We have put no restrictions on o, so we can't call any methods on it
	}
	
	let handlerFoo = handler({ foo:Text } bar) {
		// Now we know bar at least fulfills an object with foo, which points to a Text
		bar.foo.set("cool")
	}
	
	handlerFoo({ foo:"Test" }) // works
	handlerFoo({ foo:"qwe", cat:"asd" }) // works
	handlerFoo({ cat:"asd" }) // type error - handlerFoo needs its first arguments to satisfy the interface { foo:Text } but got
	
	let anObj = XHR.get('/get_all_users') // ReturnType is [{ foo:{ bar:Type } }]
	for (id in anObj) { anObj.foo.bar }
	
	what is XHR.get?
	
	let interpolatedMouse = interpolate({ x:Mouse.x, y:Mouse.y })
	
	let interpolate = function(o) {
		Type t = Type.of(o) // ensure t is not a Collection (List of Hash). It needs to be a Text, Number or Color
		<script obj=o type=t>
			var type = Context.script.type,
				properties = fun.getProperties(o)
			// type == { x:'number', y:'number' }
			each(properties, function(property) {
				fun.observe(property, function(mutation) {
					var currentState = mutation.oldValue,
						interpolateToState = mutation.value
					// start animation from currentState to interpolateToState.
					// If this is an interpolation with type Queue, then just add interpolateToState to the queue
				})
			})
		</script>
	}
	
	
	Hash -- maps Static to Interface
	
	let aHash = <Number>
	aHash["foo"] = 1
	
	
	let HashableUser = { id:Static }
	let users = XHR.get('/all_users', <HashableUser>)
	let drawFriendList = template(User user) {
		for (id in user.friends) {
			let friend = users[id] // causes observation on users[id], which may mutate with "set" and "unset". "unset" causes friend to be null
			<div class="friend">
		}
	}
	
	for (HashableUser in users) {
	
	}
	
*/


