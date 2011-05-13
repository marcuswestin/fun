/*
	Based off of implementation in https://github.com/mcarter/js.io/blob/master/packages/base.js by Martin Hunt @mgh

	Example usage:

	var Person = Class(function() {

		this._init = function(name) {
			this._name = name
		}

		this.getName = function() {
			return this._name
		}
		
		this.greet = function(name) {
			return 'Hi ' + name + '! My name is ' + this._name
		}
	})

	var CoolKid = Class(Person, function(supr) {
		
		this.greet = function() {
			return supr(this, 'greet', arguments).replace(/^Hi /, 'Sup').replace('My name is', "I'm")
		}

	})

	var john = new Person("John"),
		coolKid = new CoolKid("mr Coolio")
	
	john.greet(coolKid)
	coolKid.greet(john)
*/

module.exports = function Class(parent, proto) {
	if(!proto) { proto = parent }
	proto.prototype = parent.prototype

	var cls = function() { if(this._init) { this._init.apply(this, arguments) }}
	cls.prototype = new proto(function(context, method, args) {
		var target = parent
		while(target = target.prototype) {
			if(target[method]) {
				return target[method].apply(context, args || [])
			}
		}
		throw new Error('supr: parent method ' + method + ' does not exist')
	})

	cls.prototype.constructor = cls
	return cls
}
