var util = require('./util')

module.exports = {
	expressionTypes: util.listToObject(['COMPOSITE', 'ITERATOR', 'ARGUMENT', 'ALIAS', 'INVOCATION', 'INLINE_SCRIPT', 'OBJECT', 'LIST', 'VALUE_LITERAL', 'VALUE', 'HANDLER', 'NULL']),
	LOCAL_ID: -1,
	GLOBAL_ID: 0
}

