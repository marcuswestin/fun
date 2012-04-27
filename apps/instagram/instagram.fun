import jsonp
import ui/lists
import viewport
import tap
import time
import localstorage
import style

viewport.fitToDevice()

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
	if popularRequest.loading { <div>"Loading..."</div style={ textAlign:'center', margin:'50px 0' }> }
	
	if popularRequest.error { "Error: " popularRequest.error }
	
	for item in popularImages {
		if item.type is 'image' {
			<div class="image" #tap.listItem(handler() { scroller.push({ item:item }) })>
				<img src=item.images.low_resolution.url style={ float:'left' } />
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
	headStyle = { height:'100%', color:'#160F08', textShadow:'0 1px 0 #aaa', fontSize:18 }
	titleStyle = { textAlign:'center', padding:'10px 0 0 0' }
	accessoryStyle = { position:'absolute', top:10, left:4, cursor:'pointer' }
	<div class="head" style=headStyle #style.gradient('#675C52', '#3F3831')>
		view = scroller.stack.last
		if (view.item) {
			<div class="title" style=titleStyle>view.item.caption.text</div>
			<div class="accessory left" style=accessoryStyle>'Back'</div #tap.button(handler() {
				scroller.stack pop:null
				time.after(500, makePopularRequest)
			})>
		} else {
			<div class="title" style=titleStyle>"Popular"</div>
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
