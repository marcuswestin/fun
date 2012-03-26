import jsonp

let popularRequest = null,
 	instagramApiKey = 'YOUR KEY'

<button>"fetch"</button onclick=handler() {
	popularRequest set: jsonp.get("https://api.instagram.com/v1/media/popular?access_token="+instagramApiKey)
}>

if popularRequest.loading {
	"Loading..."
}
if popularRequest.error {
	"Error: " popularRequest.error
}
if popularRequest.response {
	for item in popularRequest.response {
		if item.type is 'image' {
			<div class="image">
				<img src=item.images.low_resolution.url />
				for comment in item.comments.data {
					<div class="comment">comment.from.full_name " said: " comment.text</div>
				}
			</div>
		}
	}
}
