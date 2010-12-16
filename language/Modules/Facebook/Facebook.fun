import Local

let Facebook = {
	connected: Local.__FacebookConnected__,
	connect: __javascriptBridge("function", "FacebookModule.connect"),
	user: {
		name: Local.__Facebook_user_name_,
		id: Local.__Facebook_user_id_
	}
}
