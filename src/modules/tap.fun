tap = {
	
	button:function(selectHandler) {
		hashAttributes = { class:'tap-button' }
		<script hashAttributes=hashAttributes selectHandler=selectHandler>
			var tap = require('fun/node_modules/dom/tap')
			function setHandler(name) {
				hashAttributes.set([name], fun.expressions.Handler(function(funEvent) {
					var event = funEvent.jsEvent,
						element = this,
						onButtonTouched = function(e) { selectHandler.evaluate().invoke(element, fun.expressions.Event(e)) }
					
					tap.button[name](element, onButtonTouched, event)
				}))
			}
			setHandler('onTouchStart')
			setHandler('onMouseDown')
		</script>
		return hashAttributes
	}
	
	listItem:function(selectHandler) {
		<script selectHandler=selectHandler>
		
		</script>
	}
	
}


// TODO inject styles
// 	.tap-button {
// 		-webkit-touch-callout: none;
// 		-webkit-user-select: none; /* Disable selection/Copy of UIWebView */
// 		-webkit-touch-callout: none;
// 		-webkit-user-select: none;
// 		-khtml-user-select: none;
// 		-moz-user-select: none;
// 		-ms-user-select: none;
// 		user-select: none;
// 	}
// 
