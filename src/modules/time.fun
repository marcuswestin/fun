time = {
	after:function(amount, notifyHandler) {
		<script amount=amount notifyHandler=notifyHandler>
			setTimeout(function() {
				notifyHandler.invoke()
			}, amount.getContent())
		</script>
	}
}