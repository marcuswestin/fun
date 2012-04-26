app = {
	whenAppLoaded:function(appLoadedHandler) {
		<script appLoadedHandler=appLoadedHandler>
			setTimeout(function() {
				appLoadedHandler.invoke()
			})
		</script>
	}
}