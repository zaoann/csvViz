
function identity(x) {return x;}

function con(x,xs) {return [x].concat(xs)}

function headStr(str) {return str.charAt(0);}
function head(a) {return a[0];}
function tail(a) {return a.slice(1);}

function parsing(x, str) {
    this.parsed = x;
    this.rest = str;
}

var noParse = new parsing(null, "");

// definition of what's considered "Nothing".
function maybe(valFail, fctSuccess, inp) {
    switch(inp) {
        case null:
        case undefined:
        case "":
        case noParse:
            return valFail;
            break;
        default:
            return fctSuccess(inp);
    };
}
    
// Adds Monad's (>>=) as .then() and (+++) as .orElse() to a function object.
function makeParser(f) {

    f.then = function(g) {       // g :: parsed(a) -> makeParser(b)
        return makeParser(function(str) {
            var p = f(str);
            return (p === noParse ? noParse : g(p.parsed)(p.rest));
        });
    };

    f.orElse = function(psr) {    // psr is a fallback parser when this gives noParse
        return makeParser(function(str) {
            return maybe(psr(str), identity, f(str));
        });
    };

    return f;
}

function parseTo(x) {
    return makeParser(function(inp) {
        return new parsing(x, inp);
    });
}

var failure = makeParser(function(inp) {return noParse});

function lift(f) {
    return function(x) {
        return parseTo(f(x));
    };
}

function peek(psr) {
    return makeParser(function(str) {
        var peeked = psr(str);
        if (peeked == noParse) {
            return noParse;
        } else {
            return new parsing(psr(str).parsed, str);
        };
    });
}

var item = makeParser(function(inp) {
    return maybe(noParse, function(s) {return new parsing(headStr(s), tail(s));}, inp);
});

var any = makeParser(function(inp) {
    return maybe(noParse, function(s) {return new parsing(null, tail(s));}, inp);
});

function sat(pred) {
    return item.then(function(x) {
        return pred(x) ? parseTo(x) : failure;
    });
}

function testRegEx(r) {     // so that it can be used point-free in sat();
    return function(str) {return r.test(str)};
}

function curry2(f) {    // currying 2-argument functions so that point-free style can be used.
    return function(x1) {
        return function(x2) {
            return f(x1, x2);
        };
    };
}

function equal(x, y) {return x === y};  // operators in js are not functions, ie (===) no good!
function plus(x, y) {return x + y};  // operators in js are not functions, ie (===) no good!
function minus(x, y) {return x - y};
function times(x, y) {return x * y};
function safeDiv(n,d) {return (d==0)?0:n/d;}

var equalTo = curry2(equal);    // so that we can use this point-free as functions, eg in sat().

// Try use point-free functions in sat()
var digit = sat(testRegEx(/^\d$/));
var lower = sat(testRegEx(/^[a-z]$/));
var upper = sat(testRegEx(/^[A-Z]$/));
var alphabet = sat(testRegEx(/^[a-z]|[A-Z]$/)); // or lower.orElse(upper);
var alphanum = sat(testRegEx(/^\d|[a-z]|[A-Z]$/)); // or alphabet.orElse(digit);
var whiteSpace = sat(testRegEx(/^\s$/));

var isChar = function(c) {return sat(equalTo(c))};

var string = function(str) {
    var s = headStr(str);
    var ss = tail(str);
    return (s == '') ? parseTo('') :
        isChar(s).then(function() {             // If no need to bind the result to a variable,
            return string(ss).then(function() { // we can leave the function to have 0 argument.
                return parseTo(str);            // If f() is defined, f(a,b,c) will run.
            });
        });
}

// many :: Parser a -> Parser [a]
// In Haskell, String is the same as [Char], so "many" and "many1" can generalize with (:).
// But in JS, String is not Array, and the point of "many" and "many1" is to apply "Parser a"
// many times to form a "Parser [a]" which doesn't work nicely with strings which requires
// a ".reduce(plus)" to glue the [Char] together.
// But ".reduce(plus)" is an extra step which seems a bit tedious.
// Either we stick with this practice, or we make another version of "many"s for string.. let's see.
function many(psr) {return many1(psr).orElse(parseTo([]))}
function many1(psr) {
    return psr.then(function(x) {
        return many(psr).then(function(xs) {
            return parseTo(con(x, xs));
        });
    });
}

var legalAlphanum = alphanum.orElse(isChar('_').orElse(isChar('-')));
var legalOperatorChar = sat(testRegEx(/^(\+|-|\*|\/|\^|%|\.|\?|!|:|=)$/));

// xs :: JS [String] array. Mainly for lifting since .reduce(plus) is pretty convinient too.
function glue(xs) {
    return xs.length == 0 ? "" : xs.reduce(plus);   // reduce doesn't like empty arrays.
}

var identVar =
    lower.then(function(x) {
        return many(legalAlphanum).then(function(xs) {
        //return many(alphanum).then(function(xs) {   // js string is not array. Need to convert.
            var varName = glue(con(x, xs));  // js overloads (+) for numbers and strings.
            return parseTo(varName);                // but lower and alphanum gives only strings.
        });                                         // So we are safe from actually adding numbers.
    });

var nat =
    many1(digit).then(function(xs) {
        return parseTo (parseInt (glue(xs)));
    });

function maybe1(psr) {
    return psr.orElse(parseTo([]));
}

var space = many(whiteSpace).then(lift(glue));
    //many(whiteSpace).then(function(s) {      // no space or white space.
        //return parseTo("");     //In Haskell, () is used... here I'll use "" for now.
        //return parseTo(s.reduce(plus));     //In Haskell, () is used, here I want to keep this info.
    //});
var space1 = many1(whiteSpace).then(lift(glue));     // 1 or more white space.

function token(psr) {
    return space.then(function() {
        return psr.then(function(v) {
            return space.then(function() {
                return parseTo(v);
            });
        });
    });
}

var identifierVar = token (identVar);
var natural = token (nat);
var symbol = function(sym) {return token(string(sym))};

var integer = nat.orElse(symbol('-').then(function(negSign) {
    return nat.then(function(n) {
        return parseTo(-n);
    });
}));

var num = integer.then(function(i) {
    return (symbol('.').then(function(dot) {
        return many(digit).then(function(ds) {
            if (ds.length>0) {
                d = i < 0 ? -parseFloat(glue(con('.',ds))) : parseFloat(glue(con('.',ds)));
                return parseTo( i + d );
            } else {
                return parseTo(i);
            };
        });
    })).orElse(parseTo(i));
});

var number = token(num);

var jsArray_Natural =
    symbol("[").then(function() {
        return natural.then(function(n) {
            return many(symbol(",").then(function() {return natural}))
                .then(function(ns) {
                    return symbol("]").then(function() {
                        return parseTo (con(n, ns));
                    });
                });
        });
    });

var word = many1(legalAlphanum).then(lift(glue));

var legalOperator = many1(legalOperatorChar).then(lift(glue));

var words = many1(
    word.orElse(space1).orElse(isChar('(')).orElse(isChar(')')).orElse(isChar('/'))).then(lift(glue));
        // need spaces between words. Consider parentheses legal in multi-word phraces.

function enclosedBy(symOpen, symClose, psr) {
    return symbol(symOpen).then(function(o) {
        return psr.then(function(x) {
            return symbol(symClose).then(function(c) {
                return parseTo(x);
                //return parseTo(o + x + c);   // do we need the open/closed quotes?
            });
        });
    });
}

var doubleQuotedWords = token (enclosedBy('"', '"', words));
var squareBracketedWords = token (enclosedBy('[', ']', words));

/*
function ignore(n, psr) {
    return makeParser(function(str) {
        return psr(str.slice(n));
    });
}
*/

function findAll(psr) {
    return (psr.orElse(any).then(function(p) {
        return findAll(psr).then(function(ps) {
            if (p == null) {
                return parseTo(ps);
            } else {
                return parseTo(con(p,ps));
            };
        });
    })).orElse(parseTo([]));
}

var atom =
    identifierVar
        .orElse(doubleQuotedWords)
        .orElse(number);

function infixOperatorClosure() {
    var legal_operators = {};
    function addOperator(sym, f, precedence, ifRightAss) {
        //var psr = symbol(sym).then(parseTo(f));
        legal_operators[sym] = {apply: f, prec: precedence, rightAssoc: ifRightAss};
        return legal_operators;
    }
    function getOperator(sym) {
        if (sym in legal_operators) {
            return legal_operators[sym];
        } else {
            return null;
        };
    }
    var parser = legalOperator.then(function(sym) {
        var op = getOperator(sym);
        return ( op == null) ? failure : parseTo(op);
    });
    return {add: addOperator, get: getOperator, parse: parser};
}

var infixOperators = infixOperatorClosure();
infixOperators.add('+', plus, 1, true);
infixOperators.add('-', minus, 1, true);
infixOperators.add('*', times, 2, false);
infixOperators.add('/', safeDiv, 2, false);

var expression = makeParser(function(str) {
    var subExpr = atom.orElse(enclosedBy("(", ")", expression));
    function rest(lhs) {
        return (infixOperators.parse.then(function(op1) {
            return (subExpr.then(function(rhsL) {
                return (peek(infixOperators.parse).then(function(op2) {
                    var goLeft = (op1.prec > op2.prec) || ((op1.prec == op2.prec) && !(op1.rightAssoc));
                    if (goLeft) {
                        return parseTo(op1.apply(lhs, rhsL)).then(rest);
                    } else {
                        return failure;
                    }
                }));
            })).orElse(expression.then(function(rhsR) {
                return parseTo (op1.apply(lhs, rhsR));
            }));
        })).orElse(parseTo(lhs));
    }

    return subExpr.then(rest)(str);
});

var formula = makeParser(function(str) {

    var term = (squareBracketedWords.then(function(col) {
        return parseTo(function(v) {return v[col];});
    })).orElse(number.then(function(n) {
        return parseTo(function(v) {return n;});
    }));

    var subFormula = term.orElse(enclosedBy("(", ")", formula));

    function rest(lhs) {
        return (infixOperators.parse.then(function(op1) {
            return (subFormula.then(function(rhsL) {
                return (peek(infixOperators.parse).then(function(op2) {
                    var goLeft = (op1.prec > op2.prec) || ((op1.prec == op2.prec) && !(op1.rightAssoc));
                    if (goLeft) {
                        return parseTo(function(v) {
                            return op1.apply(lhs(v), rhsL(v));
                        }).then(rest);
                    } else {
                        return failure;
                    }
                }));
            })).orElse(formula.then(function(rhsR) {
                return parseTo (function(v) {
                    return op1.apply(lhs(v), rhsR(v));});
            }));
        })).orElse(parseTo(lhs));
    }

    return subFormula.then(rest)(str);
});



/*
var factor = makeParser(function(str) {
    return atom.orElse(enclosedBy("(", ")", expr))(str);
});

var term = makeParser(function(str) {
    return factor.then(function(f) {
        return ((operatorTimes.orElse(operatorDivides)).then(function(op) {
            return term.then(function(t) {
                return parseTo(op(f, t));
            });
        })).orElse(parseTo(f));
    }) (str);
});

var expr = makeParser(function(str) {
    return term.then(function(t) {
        return ((operatorPlus.orElse(operatorMinus)).then(function(op) {
            return expr.then(function(e) {
                return parseTo(op(t, e));
            });
        })).orElse(parseTo(t));
    }) (str);
});
*/
