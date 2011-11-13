#import XHR

let Account = { signedIn:@required Bool, username:@static Text, id:@static Number }
let Tweet = { id:@static Number, text:@static Text, userID:@static Number }

let Account user = { signedIn:false }

if (account.signedIn) { renderApp() }
else { renderLogin() }

let renderLogin = template() {
	<div class="login">
		let password = ""
		<input data=account.username placeholder="username" />
		<input data=password type="password" placeholder="password" />
		<button>"Sign in"</button disabled=disableButton onclick=handler() {
			XHR.post('/login', { username:account.username, password:password }, handler(Text error, Account response) {
				if (error) { return alert(error) }
				user.set(response)
			})
		}>
	</div>
}

let Tab = { 'Timeline', '@Mentions', 'Retweets', 'Searches', 'Lists' }
let Tab currentTab = 'Timeline'
let renderApp = template() {
	<div class="columns">
		<div class="left column">
			renderTweetBox()
			renderTabs()
			renderTimeline()
		</div>
		<div class="right column">
		
		</div>
	</div>
}

let renderTweetBox = template() {
	let tweet = ""
	let remainingLetters = 160 - tweet.length
	let remainingColor = 
		remainingLetters < 0 ? #633 :
		remainingLetters < 10 ? #333 :
		remainingLetters < 20 ? #444 :
		remainingLetters < 30 ? #666 : #999
	
	<div class="tweetBox">
		<div class="title">"What's happening?"</div>
		<textarea data=tweet />
		<div class="remainingLetters" style={ color:remainingColor }>
			remainingLetters
		</div>
	</div>
}

let renderTimeline = template() {
	let [Tweet] tweets = XHR.get('/timeline.json', { id:user.id })
	if (tweets.loading) { <div class="loading">"Loading..."</div> }
	for (tweet in tweets) {
		renderTweet(tweet)
	}
}

let renderTweet = template(Tweet tweet) {
	<div class="tweet" onclick=handler() { currentTweet.set(tweet) }>
		<img src="/images/user/"+tweet.userID /> tweet.text
	</div>
}