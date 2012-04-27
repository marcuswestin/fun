import viewport
import ./codemirror

paneSize = { width:viewport.size.width / 2, height:viewport.size.height, border:'none' }

pane = { style: { float:'left', width:paneSize.width, height:paneSize.height } }

<div #pane>
	codemirror.render(paneSize, handler(event) {
		
	})
</div>

<iframe frameborder="0" #pane name="output">
	
</iframe>
