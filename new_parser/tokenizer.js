// tokens.js
// 2009-05-17

// (c) 2006 Douglas Crockford

// Produce an array of simple token objects from a string.
// A simple token object contains these members:
//      type: 'name', 'string', 'number', 'symbol'
//      value: string or number value of the token
//      from: index of first character of the token
//      to: index of the last character + 1

// Comments of the // type are ignored.

// Operators are by default single characters. Multicharacter
// symbols can be made by supplying a string of prefix and
// suffix characters.
// characters. For example,
//      '<>+-&', '=>&:'
// will match any of these:
//      <=  >>  >>>  <>  >=  +: -: &: &&: &&

var fs = require('fs'),
    sys = require('sys'),
	util = require('./util')

exports.tokenize = util.intercept('TokenizeError', doTokenize)

var TokenizeError = function(file, line, column, msg) {
	this.name = 'TokenizeError';
	this.message = ['on line', line + ',', 'column', column, 'of', '"'+file+'":', msg].join(' ')
}
TokenizeError.prototype = Error.prototype

var keywords = 'import,let,set,for,in,if,else,template,handler'.split(',')
function doTokenize (inputFile) {
    var c;                      // The current character.
    var from;                   // The index of the start of the token.
    var i = 0;                  // The index of the current character.
    var line = 1;               // The line of the current character.
    var lineStart = 0;          // The index at the beginning of the line
    var inputString;            // The string to tokenize
    var length;                 // The length of the input string
    var n;                      // The number value.
    var q;                      // The quote character.
    var str;                    // The string value.
    var prefix = '!=<>';
    var suffix = '=';

    var result = [];            // An array to hold the results.

    var halt = function (msg) {
        var col = from - lineStart + 1
        sys.puts(util.grabLine(inputFile, line, col, i - from));
        throw new TokenizeError(inputFile, line, col, msg);
    }

    var make = function (type, value) {

// Make a token object.

        return {
            type: type,
            value: value,
            from: from,
            span: i - from,
            line: line,
            column: from - lineStart + 1,
            file: inputFile
        };
    };
    
// Allow for keyword lookup with "if (str in keywords) { ... }"

    for (var kWord, keyI=0; kWord = keywords[keyI]; keyI++) {
        keywords[kWord] = true;
    }

// If prefix and suffix strings are not provided, supply defaults.

    if (typeof prefix !== 'string') {
        prefix = '<>+-&';
    }
    if (typeof suffix !== 'string') {
        suffix = '=>&:';
    }


// Loop through the text, one character at a time.

    inputString = fs.readFileSync(inputFile).toString()
    length = inputString.length
    
    c = inputString.charAt(i);
    while (c) {
        from = i;

        if (c == '\n') {

// Keep track of the line number

            line += 1;
            i += 1;
            lineStart = i;
            c = inputString.charAt(i);

// Ignore whitespace.

        } else if (c <= ' ') {
            i += 1;
            c = inputString.charAt(i);

// name.

        } else if (c == '_' || c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z') {
            str = c;
            i += 1;
            for (;;) {
                c = inputString.charAt(i);
                if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
                        (c >= '0' && c <= '9') || c === '_') {
                    str += c;
                    i += 1;
                } else {
                    break;
                }
            }
            result.push(make(str in keywords ? 'keyword' : 'name', str));

// number.

// A number cannot start with a decimal point. It must start with a digit,
// possibly '0'.

        } else if (c >= '0' && c <= '9') {
            str = c;
            i += 1;

// Look for more digits.

            for (;;) {
                c = inputString.charAt(i);
                if (c < '0' || c > '9') {
                    break;
                }
                i += 1;
                str += c;
            }

// Look for a decimal fraction part.

            if (c === '.') {
                i += 1;
                str += c;
                for (;;) {
                    c = inputString.charAt(i);
                    if (c < '0' || c > '9') {
                        break;
                    }
                    i += 1;
                    str += c;
                }
            }

// Look for an exponent part.

            if (c === 'e' || c === 'E') {
                i += 1;
                str += c;
                c = inputString.charAt(i);
                if (c === '-' || c === '+') {
                    i += 1;
                    str += c;
                    c = inputString.charAt(i);
                }
                if (c < '0' || c > '9') {
                    halt("Bad exponent");
                }
                do {
                    i += 1;
                    str += c;
                    c = inputString.charAt(i);
                } while (c >= '0' && c <= '9');
            }

// Make sure the next character is not a letter.

            if (c >= 'a' && c <= 'z') {
                str += c;
                i += 1;
                halt("Bad number - should not end in a letter");
            }

// Convert the string value to a number. If it is finite, then it is a good
// token.

            n = +str;
            if (isFinite(n)) {
                result.push(make('number', n));
            } else {
                halt("Bad number");
            }

// string

        } else if (c === '\'' || c === '"') {
            str = '';
            q = c;
            i += 1;
            for (;;) {
                c = inputString.charAt(i);
                if (c < ' ') {
                    halt(c === '\n' || c === '\r' || c === '' ?
                        "Unterminated string." :
                        "Control character in string.", make('', str));
                }

// Look for the closing quote.

                if (c === q) {
                    break;
                }

// Look for escapement.

                if (c === '\\') {
                    i += 1;
                    if (i >= length) {
                        halt("Unterminated string");
                    }
                    c = inputString.charAt(i);
                    switch (c) {
                    case 'b':
                        c = '\b';
                        break;
                    case 'f':
                        c = '\f';
                        break;
                    case 'n':
                        c = '\n';
                        break;
                    case 'r':
                        c = '\r';
                        break;
                    case 't':
                        c = '\t';
                        break;
                    case 'u':
                        if (i >= length) {
                            halt("Unterminated string");
                        }
                        c = parseInt(inputString.substr(i + 1, 4), 16);
                        if (!isFinite(c) || c < 0) {
                            halt("Unterminated string");
                        }
                        c = String.fromCharCode(c);
                        i += 4;
                        break;
                    }
                }
                str += c;
                i += 1;
            }
            i += 1;
            result.push(make('string', str));
            c = inputString.charAt(i);

// comment.

        } else if (c === '/' && inputString.charAt(i + 1) === '/') {
            i += 1;
            for (;;) {
                c = inputString.charAt(i);
                if (c === '\n' || c === '\r' || c === '') {
                    break;
                }
                i += 1;
            }

// combining

        } else if (prefix.indexOf(c) >= 0) {
            str = c;
            i += 1;
            while (i < length) {
                c = inputString.charAt(i);
                if (suffix.indexOf(c) < 0) {
                    break;
                }
                str += c;
                i += 1;
            }
            result.push(make('symbol', str));

// single-character symbol

        } else {
            i += 1;
            result.push(make('symbol', c));
            c = inputString.charAt(i);
        }
    }
    return result;
};
