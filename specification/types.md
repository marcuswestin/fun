Types
=====

13 types
--------

There are 13 types in Fun: `Bool`, `Text`, `Number`, `Color`, `Object`, `List`, `Template`, `Handler`, `Function`, `Enum`, `Event`, and `Interface`

They break into 4 categories: Atomic values, Collections, Callables and Interfaces.

??? `Dictionary`

Atomic values
-------------
`Text`, `Number`, `Color`, `Enum` and `Event` are atomic values.

	let name = "Marcus"
	let age = 24
	let color = #336699
	name.type == Text
	age.type == Number
	color.type == Color

/* ???
 * When a value changes (when it "mutates"), all code referencing the value automatically re-evaluates.
 **/

`Enum` values have one of a predefined set of 
`Event` values describe events. We'll cover `Enum` and `Event` in detail later.

Values always begin with a lowercase letter.

Collections
-----------
`Lists` and `Objects` are collections - they contain values:

	let numbers = [1, 4, 42]
	let user = { name:'Marcus', id:1 }

A `List` is what it sounds like - a list of values.
An `Object` is a collection of key value pairs - a great way to organize things that belong together.


/* ??? 
 * let users = <1:user, 4:{ name:'Ashley', id:4 }>
 * A `Dictionary` is similar to an Object, but you can add and remove values from it, and its keys are always `Static` values.
 **/

Callables
---------
`Templates`, `Handlers`, and `Functions` are _Callable_ - they can be called:

	let helloWorld = template() {
		"Hello World!"
	}
	let greet = template(Text name) {
		<div class="greeting">"Hello " name "!"</div>
	}
	helloWorld()
	greet("Marcus")

`Templates` are used to render reusable snippets of HTML.
`Handlers` are used to handle events, such as a click on a button. Values can only mutate inside of a handler.
`Functions` take values as input and return other values as output.

Interfaces
----------
The 12 types can be combined into interfaces:

	let User = { id:Number, name:Text }
	let ListOfNumbers = [Number]
	let ListOfUsers = [User]
	let HashOfNumbers = <Number>
	let HashOfUsers = <User>

Handlers, Templates and Functions specify the interfaces that they expect. Code that calls them must pass in values that conform to the expected interfaces:
		
	let drawUser = template(User user) {
		<div class="user">
			"Name: " user.name
		</div>
	}
	drawUser({ id:1, name:"Marcus" }) // this runs
	drawUser({ name:"Ashley" }) // this won't run. drawUser expects a User, which has { id:Number } in addition to { name:Text }

The expected interface can be inlined, though it's good practice to explicitly name your interfaces.
For example, drawUser does not depend on user.id so it could specify a smaller interface:

	let drawUser2 = template({ name:Text } user) {
		<div class="user">"Name: " user.name</div>
	}
	drawUser2({ id:1, name:"Marcus" }) // this runs
	drawUser2({ name:"Ashley" }) // as does this

Interfaces always begin with a capital letter.

Types: Advanced topics
======================

Functions
---------

	let capitalize = function(Text text) {
		let capitalized = @readonly text;
		<script text=text capitalized=capitalized>
			fun.observe(Context.script.text.uniqueID, function(mutation) {
				fun.mutate('set', Context.script.capitalized, mutation.args[0])
			})
		</script>
		return capitalized
	}
	
	let tween = function(Value value, { duration:@optional Number, dt:@optional Number })
