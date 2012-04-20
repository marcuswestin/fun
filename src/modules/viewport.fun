viewport = {
	size: {
		width: 0
		height: 0
	}
}

<script module=viewport>
	
	var on = require('fun/node_modules/dom/on'),
		getWindowSize = require('fun/node_modules/dom/getWindowSize'),
		cleint = require('fun/node_modules/std/client')

	function update() {
		var size = getWindowSize(window)
		
		
		
		if ('orientation' in window) {
			if (window.orientation % 180 === 0) {
				size.height = screen.height - 64
				size.width = screen.width
			} else if (window.orientation % 90 === 0) {
				size.height = screen.width - 80
				size.width = screen.height
			}
		}
		
		module.set(['size','width'], fun.expressions.Number(size.width))
		module.set(['size','height'], fun.expressions.Number(size.height))
		
		document.body.scrollLeft = 0
	}
	
	on(window, 'orientationchange', update)
	on(window, 'resize', update)
	update()
</script>
