twitter = {
	search:function(searchQuery) {
		// var result = { loading:true, error:null, response:null }
		var result = null
		<script searchQuery=searchQuery result=result>
			function doQuery() {
				var script = document.createElement('script'),
					params = { callback: 'callback_'+new Date().getTime(), q: searchQuery.evaluate().asString() }

				var query = []
				for (var key in params) {
					query.push(encodeURIComponent(key)+"="+encodeURIComponent(params[key]))
				}

				window[params.callback] = function(response) {
					// if (response.error) {
					// 	result.set(['error'], fun.expressions.fromJavascriptValue(response.error))
					// } else {
					// 	result.set(['response'], fun.expressions.fromJavascriptValue(response.response))
					// }
					// result.set(['loading'], false)
					fun.set(__functionReturnValue__, null, fun.expressions.Text(JSON.stringify(response)))
					// setTimeout(doQuery, 5000)
				}
				script.src = '//search.twitter.com/search.json?'+query.join('&')
				document.getElementsByTagName('head')[0].appendChild(script)
				// setInterval(function() {
				// 	__functionReturnValue__.set(null, fun.expressions.Number(new Date().getTime()))
				// }, 1000)
			}
			doQuery()
		</script>
		return result
	}
}