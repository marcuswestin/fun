import Local

let Facebook = {
	connected: false,
	connect: javascriptHandler("FacebookModule.connect"),
	user: {
		name: '',
		id: 0
	}
}

<script>
void(function() {
	window.FacebookModule = {
		connect: connect
	}
	
	var doc = document,
		fbRootDiv
	
	function connect(appId) {
		FB.init({ appId:appId, status:true, cookie:true, xfbml:false })
		FB.login(_handleLoginResponse)
	}
	
	function _handleLoginResponse(response) {
		if (response.status == 'connected') {
			fun.set('Facebook.connected', true)
			fun.set('Facebook.user.id', response.session.uid)
			FB.api('/me', function(response) {
				fun.set('Facebook.user.name', response.name)
			})
		}
	}
	
	function _init() {
		fbRootDiv = doc.body.appendChild(doc.createElement('div'))
		fbRootDiv.id = 'fb-root'
		fbRootDiv.style.display = 'none'
		
		var s = doc.createElement('script')
		s.type = 'text/javascript'
		s.src = '//connect.facebook.net/en_US/all.js'
		s.async = true
		fbRootDiv.appendChild(s)
	}
	
	_init()
})()
</script>