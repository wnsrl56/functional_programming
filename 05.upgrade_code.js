const map = (fn, iter) => {
    let res = [];
    for(const item of iter) {
        res.push(fn(item));
    }
    return res;
}

const filter = (fn, iter) => {
    let res = [];
    for (const item of iter) {
        if( fn(item) ) {
            res.push(item);
        }
    }
    return res;
}

const reduce = (fn, acc, iter) => {    
    if(!iter) {
        iter = acc[Symbol.iterator]();
        acc = iter.next().value;
    }
    for(const item of iter) {
        acc = fn(acc, item);    
    }
    return acc;
};

// go, pipe
const run = () => {
    const go = (...args) => reduce((v, fn) => fn(v), args); // 즉시 평가 용도
    const pipe = (...fs) => (v) => go(v, ...fs); // 합성함수 만들기 용도
    const pipe2 = (f, ...fs) => (...as) => go(f(...as), ...fs); // 시작 인자를 여러개 받게 될 경우
    const add = (a, b) => a + b;
    go(
        add(0, 1),
        v => v + 10,
        v => v + 100,
        console.log
    );    
    
    const f = pipe2(
        (a, b) => a + b,
        v => v + 10,
        v => v + 100
    );

    console.log(f(0, 1));
    
    // curry
    const curry = f => (a, ..._) => _.length ? f(a, ..._) : (..._) => f(a, ..._);

    const multi = curry((a, b) => a * b);
    console.log(multi(1)(2));
    const multi3 = multi(3);
    console.log(multi3(10));
}

const main = () => {
    run();
}
main();