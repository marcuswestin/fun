import jsonp
import ui/lists
import viewport
import tap
import time

<head>
	<link rel="stylesheet/stylus" type="text/css" href="instagram.styl" />
	viewport.fitToDevice()
</head>

instagramClientId = '8d4c20c24e124ebfbf1f99d6c2e5946c'
popularImages = null
scroller = lists.makeScroller(viewport.size)

makePopularRequest = function() {
	return jsonp.get("https://api.instagram.com/v1/media/popular?client_id="+instagramClientId, null, handler(event) {
		if (event.response) {
			popularImages set: event.response.data
		}
	})
}

popularRequest = makePopularRequest()

renderPopular = template() {
	if popularRequest.loading { "Loading..." }
	
	if popularRequest.error { "Error: " popularRequest.error }
	
	for item in popularImages {
		if item.type is 'image' {
			<div class="image" #tap.listItem(handler() { scroller.push({ item:item }) })>
				<img src=item.images.low_resolution.url />
			</div>
		}
	}
}

renderItem = template(item) {
	<div class="itemView">
		<img src=item.images.standard_resolution.url />
		for comment in item.comments.data {
			<div class="comment">
				<img src=comment.from.profile_picture style={ float:'left' }/>
				// comment.from.full_name ": " comment.text
			</div>
		}
	</div>	
}

scroller.renderHead(template() {
	<div class="head">
		view = scroller.stack.last
		if (view.item) {
			<div class="title">view.item.caption.text</div>
			<div class="accessory left">'Back'</div #tap.button(handler() {
				scroller.stack pop:null
				time.after(500, makePopularRequest)
			})>
		} else {
			<div class="title">"Popular"</div>
		}
	</div>
})

scroller.renderBody(template(view) {
	if (view.item) {
		renderItem(view.item)
	} else {
		renderPopular()
	}
})
