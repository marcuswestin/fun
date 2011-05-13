var curry = require('./curry'),
	slice = require('./slice'),
	each = require('./each')

var time = module.exports = {
	now: now,
	ago: ago
}

time.second = time.seconds = 1000
time.minute = time.minute = 60 * time.second
time.hour = time.hours = 60 * time.minute
time.day = time.days = 24 * time.hour
time.week = time.weeks = 7 * time.day

function now() { return new Date().getTime() }

function ago(ts, yield) { return ago.stepFunction(ts, yield) }
ago.stepFunction = _stepFunction(
	10 * time.second, 'just now', null,
	time.minute, 'less than a minute ago', null,
	2 * time.minute, 'one minute ago', null,
	time.hour, '%N minutes ago', [time.minute],
	2 * time.hour, 'one hour ago', null,
	time.day, '%N hours ago', [time.hour],
	time.day * 2, 'one day ago', null,
	time.week, '%N days ago', [time.day],
	2 * time.week, '1 week ago', [time.week],
	0, '%N weeks ago', [time.week])

ago.precise = _stepFunction(
	time.minute, '%N seconds ago', [time.second],
	time.hour, '%N minutes, %N seconds ago', [time.minute, time.second],
	time.day, '%N hours, %N minutes ago', [time.hour, time.minute],
	time.week, '%N days, %N hours ago', [time.day, time.hour],
	0, '%N weeks, %N days ago', [time.week, time.day])


function _stepFunction() {
	var steps = arguments
	var stepFn = function(ts, yield) {
		var timeAgo = time.now() - ts
		for (var i=0; i < steps.length; i+=3) {
			var stepSize = steps[i],
				stepPayload = steps[i+1],
				stepGranularities = steps[i+2],
				smallestGran = Number.MAX_VALUE

			if (timeAgo > stepSize) { continue }

			var untakenTime = timeAgo
			each(stepGranularities, function(granularity) {
				var granAmount = Math.floor(untakenTime / granularity)
				untakenTime -= granAmount * granularity
				stepPayload = stepPayload.replace('%N', granAmount)
				if (granularity < smallestGran) {
					smallestGran = granularity
				}
			})

			if (yield) {
				yield(stepPayload)
				if (smallestGran) {
					setTimeout(curry(stepFn, ts, yield), smallestGran)
				}
			}
			return stepPayload
		}
		var defaultValue = steps[steps.length - 1]
		return defaultValue
	}
	return stepFn
}
