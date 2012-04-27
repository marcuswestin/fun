app = {
	whenLoaded:function(appLoadedHandler) {
		<script appLoadedHandler=appLoadedHandler>
			setTimeout(function() {
				appLoadedHandler.invoke()
			})
		</script>
	}
}