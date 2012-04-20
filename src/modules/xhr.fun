xhr = {
	post:function(path, args, responseHandler) {
		return xhr._send('post', path, args, responseHandler)
	},
	get: function(path, args, responseHandler) {
		return xhr._send('get', path, args, responseHandler)
	},
	postJson:function(path, args, responseHandler) {
		return xhr._send('post', path, args, responseHandler, { 'Content-Type':'application/json' })
	},
	_send: function(method, path, args, responseHandler, headers) {
		result = { loading:true, error:null, response:null }
		<script method=method path=path args=args responseHandler=responseHandler headers=headers result=result module=xhr>
			if (!__hackFirstExecution) { return }
			
			module.set(['loading'], fun.expressions.Yes)
			module = module.evaluate()
			if (module._loadingCount) { module._loadingCount += 1 }
			else { module._loadingCount = 1 }
			
			var xhr = require('fun/node_modules/std/xhr')
			xhr[method.asString()](path.asString(), args && args.asJSONObject(), function(err, response) {
				if (err) {
					err = { text:err.message }
				}
				if (responseHandler && !responseHandler.isNull()) {
					var event = fun.expressions.fromJsValue({ type:'xhr-response', error:err, response:response })
					responseHandler.invoke(null, event)
				}
				result.set(['loading'], fun.expressions.No)
				if (err) {
					result.set(['error'], fun.expressions.fromJsValue(err))
				} else {
					result.set(['response'], fun.expressions.fromJsValue(response))
				}
				
				if (!--module._loadingCount) {
					module.set(['loading'], fun.expressions.No)
				}
			}, headers && headers.asJSONObject())
		</script>
		return result
	},
	loading: false
}
