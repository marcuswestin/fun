import Local

"Local.state: " <input data=Local.state /> "(try foo, bar, and others)"

switch(Local.state) {
	case 'foo', 'bar': "Local.state is foo/bar! " Local.state
	case 'marcus', 'westin': "Local.state is my name! " Local.state
	default: "default, Local.state is " Local.state
}
