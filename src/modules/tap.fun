tap = {
	
	button:function(selectHandler) {
		hashAttributes = { class:'tap-button' }
		<script hashAttributes=hashAttributes selectHandler=selectHandler>
			var module = window.__fun_tap
			module.registerTapHandler(hashAttributes, 'button', 'onTouchStart', selectHandler)
			if (module.supportClick) {
				module.registerTapHandler(hashAttributes, 'button', 'onMouseDown', selectHandler)
			}
		</script>
		return hashAttributes
	}
	
	listItem:function(selectHandler) {
		hashAttributes = { class:'tap-list-item' }
		<script hashAttributes=hashAttributes selectHandler=selectHandler>
			var module = window.__fun_tap
			module.registerTapHandler(hashAttributes, 'listItem', 'onTouchStart', selectHandler, 'tap-scroll-view')
			if (module.supportClick) {
				module.registerTapHandler(hashAttributes, 'button', 'onMouseDown', selectHandler)
			}
		</script>
		return hashAttributes
	}
	
}

<script module=tap>
	var tap = require('fun/node_modules/dom/tap'),
		client = require('fun/node_modules/std/client')
	
	window.__fun_tap = {
		supportClick: !client.isMobile,
		registerTapHandler: function(hashAttributes, type, name, selectHandler, opts) {
			hashAttributes.set([name], fun.expressions.Handler(function(funEvent) {
				var event = funEvent.jsEvent,
					element = this,
					handler = function(e) { selectHandler.evaluate().invoke(element, fun.expressions.Event(e)) }
				
				tap[type][name](element, handler, event, opts)
			}))
		}
	}
</script>


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
