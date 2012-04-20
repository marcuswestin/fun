lists = {
	
	makeScroller = function(viewSize) {
		size = { style:viewSize }
		float = { style:{ float:'left' }}
		scrollable = { style:{ 'overflow-y': 'scroll' '-webkit-overflow-scrolling': 'touch' } }
		cropX = { style:{ overflowX:'hidden' } }
		scroller = {
			view:0
			render:template(views) {
				sliderStyle = {
					height:viewSize.height
					width:viewSize.width * views.length
					'-webkit-transform':'translateX('+(-scroller.view * viewSize.width)+'px)'
					'-webkit-transition':'-webkit-transform 0.70s'
					position:'relative'
				}
				<div #size #cropX>
					<div style=sliderStyle>
						for renderView in views {
							<div class="tap-scroll-view" #cropX #float #scrollable #size>
								renderView()
							</div>
						}
					</div>
				</div>
			}
		}
		return scroller
	}
	
}