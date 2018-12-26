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
// const pipe = (...fs) => (v) => go(v, ...fs); // 단일 값
const pipe = (f, ...fs) => (...as) => go(f(...as), ...fs); // rest parameter 용도

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

// 자주 쓰는 표현
const takeAll = take(Infinity);
const flatten = pipe(L.flatten, takeAll);
// -Lib Code End- //

// reduce , take 는 값을 꺼내서 결과를 만드는 역할을 한다.
// map, filter 는 값을 합성하는 역할
const run = () => {
    // reduce example
    // join은 reduce 계열의 함수
    L.entries = function *(obj) {
        for ( const k in obj) {
            yield [k, obj[k]];
        }
    };

    const join = curry((sep = ',', iter) => {
       return reduce((a, b) => `${a}${sep}${b}`, iter);
    });

    const queryStr = pipe(
            L.entries,
            L.map(([k, v]) => `${k}=${v}`),        
            join('&')
            );
    console.log(queryStr({ limit: 10, offset: 10, type: 'notice' }));
}
const run2 = () => {
    const users = [
        { age: 32 },
        { age: 65 },
        { age: 12 },
        { age: 22 },
        { age: 14 },
        { age: 43 },
        { age: 53 },
        { age: 23 },
    ];
    const find = curry((f, iter) => {
        return go(
        iter,
        L.filter(f),
        take(1),
        ([v]) => v
        );
    });
    console.log(find(u => u.age < 30)(users));
    go(
        users,
        L.map(u => u.age),
        find(v => v < 30),
        console.log
        );
    
};
const run3 = () => {    
    // L.map + take 로 map 전환
    const map = curry(pipe(L.map, takeAll));
    console.log(map(v => v + 10, L.range(10)));

    // L.filter + take 로 filter 전환
    const filter = curry(pipe(L.filter, takeAll));
    console.log(filter(v => v < 3, L.range(10)));
};

const run4 = () => {
    // Flatten, L.flatten
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

    const it = L.flatten([[1,2], 3, 4, [5, 6], [7,8,9]]);
    
    go(L.filter(v => v % 2, it), take(5), console.log);

    const flatten = pipe(L.flatten, takeAll);
    const t = flatten([[1,2], 3, 4, [5, 6], [7,8,9]]);
    console.log([...t]);
}

const run5 = () => {
    // FlatMap, L.flatMap

    // ES 6 VER flatMap can be used client side.
    // console.log([[1,2], [3, 4], [5,6,7]].flatMap(v => v.map( v => v * v));
    // console.log(flatten([[1,2], [3, 4], [5,6,7]].map(v => v.map( v => v * v)))); // 위 코드와 동치, 전체 순회를 하게 된다면, 시간 복잡도에서는 차이가 없음
    L.flatMap = curry(pipe(L.map, L.flatten));
    const it = L.flatMap(v => v, [[1,2], [3, 4], [5,6,7]]);    
    const flatten = pipe(L.flatten, takeAll);
    const flatMap = curry(pipe(L.map, flatten));
    console.log(flatMap(v => v, [[1,2], [3, 4], [5,6,7]]));
    console.log(flatMap(range, map(v => v + 1, [1, 2, 3])));
    const it2 = L.flatMap(L.range, map(v => v + 1, [1, 2, 3]));
    console.log(take(3, it2));
}

const run6 = () => {
    // Example 2차원 배열 다루기
    const add = (a, b) => a + b;
    const arr = [
        [1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [9, 10]
    ]
    go(
        arr,
        L.flatten,
        L.filter(v => v % 2),
        L.map(v => v * v),
        take(4),
        reduce(add),
        console.log
        );
}

const run7 = () => {
    // 실무적인 코드
    const add = (a, b) => a + b;
    const users = [
        { 
            name: 'a', age: 21, 
            family: [
                { name: 'a1', age: 54, },
                { name: 'a2', age: 47, },
                { name: 'a3', age: 16, },
                { name: 'a4', age: 15, },        
            ]
        },
        { 
            name: 'b', age: 23, 
            family: [
                { name: 'b1', age: 58, },
                { name: 'b2', age: 51, },
                { name: 'b3', age: 19, },
                { name: 'b4', age: 22, },        
            ]
        },
        { 
            name: 'c', age: 31, 
            family: [
                { name: 'c1', age: 64, },
                { name: 'c2', age: 62, },            
            ]
        },
        { 
            name: 'd', age: 20, 
            family: [
                { name: 'd1', age: 42, },
                { name: 'd2', age: 42, },
                { name: 'd3', age: 11, },
                { name: 'd4', age: 7, },        
            ]
        }
    ];

    // go(
    //     users,
    //     L.map(u => u.family),
    //     L.flatten,
    //     L.filter(u => u.age < 20),
    //     L.map(u => u.age),
    //     take(3),
    //     reduce(add),
    //     console.log
    //     );
    // 하단의 방식으로 데이터 형식이 무엇인지 상관하지 않고, 데이터 조합을 할 수 있다.
    go(
        users,
        L.flatMap(u => u.family),
        L.filter(u => u.age < 20),
        L.map(u => u.age),
        take(3),
        reduce(add),
        console.log
        );  

}

const main = () => {
    // run();
    // run2();
    // run3();
    // run4();
    // run5();
    // run6();
    run7();
}
main();