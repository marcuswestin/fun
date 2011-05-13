exports.create = function(oldObject) {
	function F() {}
	F.prototype = oldObject;
	var newObject = new F();
	if (newObject.initialize) { newObject.initialize() }
	return newObject
}
