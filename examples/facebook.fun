import facebook

if (facebook.connected) {
	if (facebook.user.name) {
		<div>"Welcome " facebook.user.name "!"</div>
	}
	<div>"Your ID is: " facebook.user.id</div>
} else {
	<button>"Connect to facebook"</button onclick=handler() {
		facebook.connect('177253448965438')
	}>
}

