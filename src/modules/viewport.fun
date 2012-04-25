viewport = {
	size: {
		width: 0
		height: 0
	}
}

<script module=viewport>
	
	var on = require('fun/node_modules/dom/on'),
		getWindowSize = require('fun/node_modules/dom/getWindowSize'),
		client = require('fun/node_modules/std/client')
	
	viewportSize = fun.expressions.dereference(module, fun.expressions.Text('size')).evaluate()
	
	function update() {
		var size = client.isIOS ? getIOSViewportSize() : getWindowSize(window)
		
		fun.dictSet(viewportSize, 'width', fun.expressions.Number(size.width))
		fun.dictSet(viewportSize, 'height', fun.expressions.Number(size.height))
		
		document.body.scrollLeft = 0
	}
	
	on(window, 'orientationchange', update)
	on(window, 'resize', update)
	update()
	
	function getIOSViewportSize() {
		var isPortrait = (window.orientation % 180 == 0)
		
		if (!client.isSafari) {
			// We're in a webview and can use the window
			return { width:window.innerWidth, height:window.innerHeight }
		}
		
		var width = isPortrait ? screen.width : screen.height,
			height = isPortrait ? screen.height : screen.width
		
		if (navigator.standalone) {
			var statusBarStyle = iOS_getMetaContent("apple-mobile-web-app-status-bar-style").toLowerCase()
			if (statusBarStyle == 'black-translucent') {
				// Black translucent top bars can have content rendered underneath them and should not be taken into account
				height -= 20
			}
		} else if (client.isIPhone || client.isIPod) {
			// iPhone/iPad bottom buttons bar
			height -= (isPortrait ? 44 : 32)
		} else if (client.isIPad) {
			// iPad top navigation bar
			height -= 58
		}
		
		return { width:width, height:height }
	}
</script>
