Types
=====
We may want to add incremental typing via interfaces. They are different from variables by starting with an upper case name.

Interfaces
----------
The value types can be combined into interfaces:

	let User = { id:Number, name:Text }
	let ListOfNumbers = [Number]
	let ListOfUsers = [User]
	let HashOfNumbers = <Number>
	let HashOfUsers = <User>

Handlers, Templates and Functions can specify the interfaces that they expect. Code that calls them must pass in values that conform to the expected interfaces:
		
	let drawUser = template(User user) {
		<div class="user">
			"Name: " user.name
		</div>
	}
	drawUser({ id:1, name:"Marcus" }) // this compiles
	drawUser({ name:"Ashley" }) // this won't compile. drawUser expects a User, which has { id:Number } in addition to { name:Text }

The expected interface can be inlined, though it's good practice to explicitly name interfaces.
For example, drawUser does not depend on user.id so it could specify a smaller interface:

	let drawUser2 = template({ name:Text } user) {
		<div class="user">"Name: " user.name</div>
	}
	drawUser2({ id:1, name:"Marcus" }) // this runs
	drawUser2({ name:"Ashley" }) // as does this

Getting the type of a value is simple. This emits "Number":

	var a = 1
	a.Type

