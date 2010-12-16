import Facebook

<button>"Connect"</button onclick=handler() {
	Facebook.connect('177253448965438')
}>

if (Facebook.connected) {
	if (Facebook.user.name) {
		"Welcome " Facebook.user.name "!"
	}
	<br />"Your ID is: " Facebook.user.id
}
