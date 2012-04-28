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
			
			module = module.evaluate()
			
			fun.dictSet(module, 'loading', fun.expressions.Yes)
			if (module._loadingCount) { module._loadingCount += 1 }
			else { module._loadingCount = 1 }
			
			var xhr = require('std/xhr')
			xhr[method.toString().toLowerCase()](path.toString(), args && args.toJSON(), function(err, response) {
				if (err) {
					err = { text:err.message }
				}
				if (responseHandler && !responseHandler.isNull()) {
					var event = fun.expressions.fromJsValue({ type:'xhr-response', error:err, response:response })
					responseHandler.invoke([event])
				}
				fun.dictSet(result, 'loading', fun.expressions.No)
				if (err) {
					fun.dictSet(result, 'error', fun.expressions.fromJsValue(err))
				} else {
					fun.dictSet(result, 'response', fun.expressions.fromJsValue(response))
				}
				
				if (!--module._loadingCount) {
					fun.dictSet(module, 'loading', fun.expressions.No)
				}
			}, headers && headers.toJSON())
		</script>
		return result
	},
	loading: false
}
