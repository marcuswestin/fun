var Twitter = {
	query: function(path, params) {
		var result = { loading:true, error:null, response:null }
		<script path=path params=params result=result>
			var script = document.createElement('script'),
				callbackID = 'callback_'+new Date().getTime(),
				query = []
			for (var key in params.content) {
				query.push(encodeURIComponent(key)+"="+encodeURIComponent(params.content[key].evaluate()))
			}
			query.push('callback='+callbackID)
			window[callbackID] = function(response) {
				if (response.error) {
					result.set(['error'], fun.expressions.fromJavascriptValue(response.error))
				} else {
					result.set(['response'], fun.expressions.fromJavascriptValue(response.response))
				}
				result.set(['loading'], false)
			}
			script.src = '//api.twitter.com'+path.evaluate()+'?'+query.join('&')
		</script>
		return result
	}
}

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
					Twitter.query('/timeline', { username:user.username }, handler(error, response) {
						if (error) { return alert(error) }
						user.online.set(true)
						user.timeline = set(response)
					})
				}>
			</div>
		}
	</div>
	<div class="column right">
		renderTweet(currentTweet)
	</div>
</div>
