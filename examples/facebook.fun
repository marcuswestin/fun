import Facebook

if (Facebook.connected) {
	if (Facebook.user.name) {
		<div>"Welcome " Facebook.user.name "!"</div>
	}
	<div>"Your ID is: " Facebook.user.id</div>
} else {
	<button>"Connect to Facebook"</button onclick=handler() {
		Facebook.connect('177253448965438')
	}>
}
