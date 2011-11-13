import XHR

let user = {}
let currentTweet = null

let renderTweet = template(tweet) {
	<div class="tweet" onclick=handler() { currentTweet.set(tweet) }>
		<img src="/images/user/"+tweet.userID /> tweet.text
	</div>
}

<div class="columns">
	<div class="column left">
		if (user.timeline) {
			for (tweet in user.timeline) {
				renderTweet(tweet)
			}
		} else {
			<div class="login">
				<input data=user.username placeholder="username" />
				<button>"Sign in"</button onclick=handler() {
					XHR.post('/get_timeline', { username:user.username }, handler(error, response) {
						if (error) { return alert(error) }
						user.online.set(true)
						user.timeline.set(response)
					})
				}>
			</div>
		}
	</div>
	<div class="column right">
		renderTweet(currentTweet)
	</div>
</div>
