import Local

"Local.state: " <input data=Local.state /> "(try foo, bar, and others)"

switch(Local.state) {
	case 'foo': "Local.state = 'foo'"
	case 'bar': "Local.state = 'bar'"
	default: "default, Local.state = '" Local.state "'"
}
