import viewport
import ./codemirror

paneSize = { width:viewport.size.width / 2, height:viewport.size.height, border:'none' }

pane = { style: { float:'left', width:paneSize.width, height:paneSize.height } }

<div #pane>
	codemirror.render(paneSize, handler(event) {
		if (event.error) {
			// TODO show helpful error
		} else {
			<script html=event.html>
				var iframe = document.getElementById('output')
				var doc = iframe.contentWindow.document
				doc.open()
				doc.write(html.getContent())
				doc.close()
			</script>
		}
	})
</div>

<iframe frameBorder='0' #pane id="output"></iframe>
