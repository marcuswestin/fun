import Facebook

if (Facebook.connected) {
	if (Facebook.user.name) {
		"Welcome " Facebook.user.name "!"
	}
	<br />"Your ID is: " Facebook.user.id
} else {
	<button>"Connect to Facebook"</button onclick=handler() {
		Facebook.connect('177253448965438')
	}>
}

