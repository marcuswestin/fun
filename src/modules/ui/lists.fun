lists = {
	
	makeScroller = function(viewSize, opts) {
		headHeight = opts.headSize ? opts.headSize : 45
		numViews = opts.numViews ? opts.numViews : 3
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
			
			stack: [null]
			
			renderHead: template(renderHeadContent) {
				<div class="lists-head" style={ height:headHeight width:'100%' position:'relative' top:0 zIndex:1 }>
					renderHeadContent()
				</div>
			}
			
			renderBody: template(renderBodyContent) {
				offset = scroller.stack.length - 1
				sliderStyle = {
					height:contentSize.height
					width:contentSize.width * numViews
					'-webkit-transform':'translateX('+(-offset * contentSize.width)+'px)'
					'-webkit-transition':'-webkit-transform 0.70s'
					position:'relative'
				}
				<div class="lists-body" style={ position:'absolute' top:headHeight overflowX:'hidden' }>
					<div #size #crop>
						<div style=sliderStyle>
							for view in scroller.stack {
								<div class="tap-scroll-view" #size #crop #float #scrollable>
									renderBodyContent(view)
								</div>
							}
						</div>
					</div>
				</div>
			}
			
			push: handler(view) {
				scroller.stack push: view
			}
			
			pop: handler() {
				scroller.stack pop: null
			}
		}
		
		return scroller
	}
}
