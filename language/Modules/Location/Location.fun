import Local

let Location = {
	navigate: __javascriptBridge("function", "LocationModule.navigate"),
	state: Local.__Location_state__,
}