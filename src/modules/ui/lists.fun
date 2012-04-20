lists = {
	
	makeScroller = function(viewSize) {
		headHeight = 45
		contentSize = {
			width: viewSize.width
			height: viewSize.height - headHeight
		}
		size = { style:contentSize }
		float = { style:{
			float:'left'
		} }
		scrollable = { style:{
			'overflow-y': 'scroll'
			'-webkit-overflow-scrolling': 'touch'
		} }
		crop = { style:{
			overflowX:'hidden'
		} }
		scroller = {
			
			view: 0
			
			renderHead: template(renderHeadContent) {
				<div class="lists-head" style={ height:headHeight width:'100%' position:'absolute' top:0 zIndex:1 }>
					renderHeadContent()
				</div>
			}
			
			renderBody: template(views) {
				sliderStyle = {
					height:contentSize.height
					width:contentSize.width * views.length
					'-webkit-transform':'translateX('+(-scroller.view * contentSize.width)+'px)'
					'-webkit-transition':'-webkit-transform 0.70s'
					position:'relative'
				}
				<div class="lists-body" style={ position:'absolute' top:headHeight overflowX:'hidden' }>
					<div #size #crop>
						<div style=sliderStyle>
							for renderView in views {
								<div class="tap-scroll-view" #size #crop #float #scrollable>
									renderView()
								</div>
							}
						</div>
					</div>
				</div>
			}
		}
		
		return scroller
	}
}
