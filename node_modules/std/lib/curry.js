module.exports = function curry(fn /*, arg1, arg2, ..., argN */) {
    var curryArgs = Array.prototype.slice.call(arguments, 1)
    return function curried() {
        var invocationArgs = Array.prototype.slice.call(arguments, 0)
        return fn.apply(this, curryArgs.concat(invocationArgs))
    }
}
