require('../client')

fin.models = {
	process: process,
	_waitForID: _waitForID
}

var CustomModelPrototype = require('./CustomModel'),
	propertyModels = require('./propertyModels')

function process(modelDescriptions) {
	for (var modelName in modelDescriptions) {
		_validateModelDescription(modelName, modelDescriptions[modelName])
		_createModelConstructor(modelName, modelDescriptions[modelName])
	}
	
	if (fin.models.Global) { fin.models.global = new fin.models.Global(0) }
	if (fin.models.Local) { fin.models.local = new fin.models.Local(-1) }
}

var _validateModelDescription = function(modelName, properties) {
	var firstLetterCode = modelName.charCodeAt(0),
		propertyIDs = {}
	assert(65 <= firstLetterCode && firstLetterCode <= 90, 'Model names should start with an upper case letter. "'+modelName+'" does not.')
	assert(!fin.models[modelName], 'Model "'+modelName+'" already exists')
	assert(!propertyModels[modelName], 'Property model "'+modelName+'" already exists')
	for (propertyName in properties) {
		var property = properties[propertyName],
			firstLetterCode = propertyName.charCodeAt(0),
			valueType = property.type,
			collectionOf = property.of,
			isCollection = (valueType == 'List' || valueType == 'Set'),
			id = property.id,
			friendlyName = modelName+'.'+propertyName
		if (isCollection) { assert(collectionOf, 'Collections (Sets and Lists) require the "of" descriptor, e.g. { id:1, type:"List" of:"Number" }. "'+friendlyName+'" is a "'+valueType+'" but it does not have one.') }
		if (collectionOf) { assert(isCollection, 'Only collections (Sets and Lists) should have an "of" descriptor. "'+friendlyName+'" has one but should not since it is of type "'+valueType+'".') }
		assert(isCollection == !!collectionOf, 'Only collections (Sets and Lists) ')
		assert(97 <= firstLetterCode && firstLetterCode <= 122, 'Property names should start with a lowercase letter. "'+friendlyName+'" does not.')
		assert(typeof id == 'number' || typeof id == 'string', 'Properties need an id. "'+friendlyName+'" does not have one.')
		prefer(typeof id == 'number', 'For better performance property IDs should be numeric. "'+friendlyName+'" has ID "'+id+'".')
		assert(!CustomModelPrototype[propertyName], 'Certain property names would overwrite important model methods. "'+friendlyName+'" is such a property - pick a different property name.')
		assert(!propertyIDs[id], 'Property IDs need to be unique. "'+modelName+'" has two properties with the id '+id+', "'+modelName+'.'+propertyIDs[id]+'" and "'+friendlyName+'"')
		propertyIDs[id] = propertyName
	}
}

var _createModelConstructor = function(modelName, modelDescription) {
	var modelConstructor = fin.models[modelName] = function(idOrValues) {
		this._constructor = fin.models[modelName]
		this._instantiate.call(this, idOrValues)
	}
	var modelPropertiesID = []
	for (var propertyName in modelDescription) {
		modelPropertiesID.push(modelDescription[propertyName].id)
	}
	modelConstructor.prototype = CustomModelPrototype
	modelConstructor.description = modelDescription
}

/* Util
 ******/
function _waitForID(model, callback) {
	if (model._id !== undefined) { callback(model._id) }
	else if (model._waitingForID) { model._waitingForID.push(callback) }
	else { model._waitingForID = [callback] }
}

/* Schema assert utils
 *********************/
function assert(isOK, msg) {
	if (isOK) { return }
	throw new Error(msg)
}

function prefer(isTrue, msg) {
	if (isTrue) { return }
	if (window.console) { console.log("Warning: " + msg) }
	else { alert("Warning: " + msg) }
}
