import Local

let Facebook = {
	connected: Local.__Facebook_connected__,
	connect: __javascriptBridge("function", "FacebookModule.connect"),
	user: {
		name: Local.__Facebook_user_name__,
		id: Local.__Facebook_user_id__
	}
}

