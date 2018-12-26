const curry = f  => 
    (a, ..._) => _.length ? f(a, ..._) : (..._) => f(a, ..._);

const map = curry((fn, iter) => {
    let res = [];
    for(const item of iter) {
        res.push(fn(item));
    }
    return res;
})

const filter = curry((fn, iter) => {
    let res = [];
    for (const item of iter) {
        if( fn(item) ) {
            res.push(item);
        }
    }
    return res;
})

const reduce = curry((fn, acc, iter) => {    
    if(!iter) {
        iter = acc[Symbol.iterator]();
        acc = iter.next().value;
    }
    for(const item of iter) {
        acc = fn(acc, item);
    }
    return acc;
});

const go = (...args) => reduce((v, fn) => fn(v), args);
const pipe = (f, ...fs) => (...as) => go(f(...as), ...fs);

const range = (l) => {
    let i = -1;
    let res = [];
    while(++i < l) {
        res.push(i);
    }
    return res;
};

const take = curry((l, iter) => {
    let res = [];
    for (const item of iter) {
        res.push(item);
        if(res.length == l) {
            return res;
        }
    }
    return res;
});

const L = {};

L.range =  function *(l) {
    let i = -1;
    while(++i < l) {
      yield i;   
    }        
};

L.map =  curry(function *(f, iter) {
    for ( const item of iter) {
        yield f(item);
    };
});

L.filter =  curry(function *(f, iter) {
    for ( const item of iter) {
        if(f(item)) {
            yield item;
        }        
    };
});

L.flatten = function *(iter) {
    const isIterable = v => v && v[Symbol.iterator];        
    for(const item of iter) {
        if(isIterable(item)) {
            for(const innerItem of item) yield innerItem;
        } else {
            yield item;
        }
    }
}

L.flatMap = curry(pipe(L.map, L.flatten));

const takeAll = take(Infinity);
