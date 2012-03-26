let jsonp = {
	get:function(path, args, responseHandler) {
		let result = { loading:true, error:null, response:null }
		<script path=path args=args responseHandler=responseHandler result=result>
			var win = window,
				doc = win.document
			if (!win.__jsonpId) { win.__jsonpId = 1 }
			var id = '__jsonp_'+(win.__jsonpId++)
			win[id] = function(response) {
				var err = null,
					response = response.data
				if (responseHandler && !responseHandler.isNull()) {
					var event = fun.expressions.fromJsValue({ type:'xhr-response', error:err, response:response })
					handler.handle(event)
				}
				if (err) {
					result.set(['error'], fun.expressions.fromJsValue(err))
				} else {
					result.set(['response'], fun.expressions.fromJsValue(response))
				}
				result.set(['loading'], fun.expressions.No)
			}
			
			var script = doc.createElement('script')
			script.src = path.asString()+'&callback='+id
			doc.getElementsByTagName('head')[0].appendChild(script)
		</script>
		return result
	}
}
