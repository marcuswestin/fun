// This example is currently broken. Need to make it work :)

state = 'foo'

"Local.state: " <input data=state /> "(try foo, bar, and others)"

<div>
	switch(state) {
		case 'foo', 'bar': "Local.state is foo/bar! " state
		case 'marcus', 'westin': "Local.state is my name! " state
		default: "default, Local.state is " state
	}
</div>
