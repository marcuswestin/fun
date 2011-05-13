/*
	Delay the execution of a function.
	If the function gets called multiple times during a delay, the delayed function gets invoced only once,
	with the arguments of the most recent invocation. This is useful for expensive functions that should
	not be called multiple times during a short time interval, e.g. rendering
	
	Example usage:

	Class(UIComponent, function() {
		this.render = delay(function() {
			...
		}, 250) // render at most 4 times per second
	})

	// Bath messages into a single email
	var EmailBatcher = Class(function() {
		this._init = function() {
			this._queue = []
		}

		this.send = function(email) {
			this._queue.push(email)
			this._scheduleDispatch()
		}

		this._scheduleDispatch = delay(function() {
			smtp.send(this._queue.join('\n\n'))
			this._queue = []
		}, 5000) // send emails at most once every 5 seconds
	})
*/
	
var unique = 0
module.exports = function(fn, delay) {
	if (typeof delay != 'number') { delay = 50 }
	var timeoutName = '__delayTimeout__' + (++unique)
	return function delayed() {
		if (this[timeoutName]) { return }
		var args = arguments, self = this
		this[timeoutName] = setTimeout(function fireDelayed() {
			clearTimeout(self[timeoutName])
			delete self[timeoutName]
			fn.apply(self, args)
		}, delay)
	}
}
