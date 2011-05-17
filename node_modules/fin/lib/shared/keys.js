/************************************
 * Redis key and channel namespaces *
 ************************************/

module.exports = {
	getItemPropertyKey: getItemPropertyKey,
	getKeyInfo: getKeyInfo,
	getPropertyChannel: getPropertyChannel,
	getFocusProperty: getFocusProperty,
	// The unique ID key is used to consistently increase item id's. Should we use guid's instead?
	uniqueIdKey: '__fin_unique_id'
}

// item properties are stored at 		I<item id>@<propName>	e.g. I20@books
// channel names for items are			#I<item id>				e.g. #I20
// channel names for properties are		#P<propName>			e.g. #Pbooks

// Data state keys
function getItemPropertyKey(itemID, propName) {
	if (itemID === undefined || propName === undefined) {
		throw new Error("itemID and propName are required for keys.getItemPropertyKey")
	}
	return 'I' + itemID + '@' + propName
}

function getKeyInfo(key) {
	var type = key[0],
		parts = key.substr(1).split('@')
	
	return { type: type, id: parseInt(parts[0]), property: parts[1] }
}

function getPropertyChannel(propName) {
	return '#P' + propName
}

// Misc
function getFocusProperty(propName) {
	return '_focus_' + propName
}