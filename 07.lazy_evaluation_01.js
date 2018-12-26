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
const pipe = (...fs) => (v) => go(v, ...fs);
const pipe2 = (f, ...fs) => (...as) => go(f(...as), ...fs);
const L = {};

// L. range <> range 의 차이점
// range는 최초 실행 시, array를 평가 후, iterable하게 변경한다.
// L. range는 iterable 하게 생성 후, 동작 하므로, 최초 next() 함수 실행 시 평가된다.
const test = (name, time, fn) => {
    console.time(name);
    while(time--) fn();
    console.timeEnd(name);
}

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

// -Lib Code End- //

const add = (a, b) => a + b;


const createLazyFunctions = () => {
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
}

const run = () => {    
    // test range function
    const list = range(4);
    console.log(reduce(add, list));
    test('range', 10, ()=> {reduce(add, range(1000000))});
}
const run2 = () => {
    // test lazy range function
    const list = L.range(4);    
    console.log(reduce(add, list));
    test('L.range', 10, ()=> {reduce(add, L.range(1000000))});
}
const run3 = () => {
    // test take function
    // take 함수 array의 몇 개 까지 취하는 함수
    // const take = (l, iter) => {
    //     let res = [];
    //     for (const item of iter) {
    //         res.push(item);
    //         if(res.length == l) {
    //             return res;
    //         }
    //     }
    // };
    console.log(take(5, range(100000)));
    // 위 실행 보다, 하단 2개가 더 빠르고, 하단 2가지는 사실 차이가 없다.
    console.log(take(5, L.range(100000)));
    console.log(take(5, L.range(Infinity)));
    
    go(
        range(10000),
        take(5),
        reduce(add),
        console.log,
    );
}

const run4 = () => {    
    // test lazy map function
    const it = L.map(a => a + 10, [1,2,3]);
    console.log(it.next());
    console.log(it.next());
    console.log(it.next());
}

const run5 = () => {
    // test lazy filter function
    const it = L.filter(a => a % 2, [1, 2, 3]);    
    console.log(it.next());
    console.log(it.next());
    console.log(it.next());
}

const runFromFunc = () => {
    go(range(10),
    map(n => n + 10),
    filter(n => n % 2),
    take(2),
    console.log
    )
}
const runFromLazyFunc = () => {
    go(L.range(10),
    L.map(n => n + 10),
    L.filter(n => n % 2),
    take(2),
    console.log
    )
};

const testForFunc = () => {
    const res1 = [];
    let iter1 = range(10);    

    for(const item of iter1) {
        res1.push(item);
    }

    // for .. of 와 동치인 코드 작성
    const res2 = [];
    let iter2 = range(10);    
    let curr;

    iter2 = iter2[Symbol.iterator]();

    while(!(curr = iter2.next()).done) {
        const item = curr.value;
        res2.push(item);
    }
    console.log(res1, res2);
}
const main = () => {
    createLazyFunctions();
    runFromFunc();
    runFromLazyFunc();
    testForFunc();
        
    // 테스트 용도
    // run();
    // run2();
    // run3();
    // run4();
    // run5();
}
main();

// map, filter 계열 함수들이 가지는 결합 법칙

// - 사용하는 데이터가 무엇이든지
// - 사용하는 보조 함수가 순수 함수라면 무엇이든지
// - 아래와 같이 결합한다면 둘 다 결과가 같다.
// map = m , filter = f
// [[m, m]] , [[f, f]], [[m, m]] == [[m, f, m], [m, f, m]]

