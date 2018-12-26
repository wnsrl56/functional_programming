// nop의 용도 합성함수 에러 방지 용도 실제 에러와 nop으로 들어온 에러 두개를 구분할 필요가 있다.
const nop = Symbol('nop');
const curry = f  => 
    (a, ..._) => _.length ? f(a, ..._) : (..._) => f(a, ..._);

// Promise value 풀어주는 역할
const releasePromise = (v, f) => v instanceof Promise ? v.then(f) : f(v);
// const filter = curry((fn, iter) => {
//     let res = [];
//     for (const item of iter) {
//         if( fn(item) ) {
//             res.push(item);
//         }
//     }
//     return res;
// })

// const reduce = curry((fn, acc, iter) => {    
//     if(!iter) {
//         iter = acc[Symbol.iterator]();
//         acc = iter.next().value;
//     }
//     for(const item of iter) {
//         acc = fn(acc, item);
//     }
//     return acc;
// });
const innerReduceFunc = (acc, item, f) => {
    return item instanceof Promise ? item.then(item => f(acc, item), e => e == nop ? acc : Promise.reject(e)) : f(acc, item);
}
const head = iter => releasePromise(take(1, iter), ([h]) => h);
// 비동기 상황 제어 방식
const reduce = curry((f, acc, iter) => {    
    if(!iter) {
        return reduce(f, head(iter = acc[Symbol.iterator]()), iter);
    }
    // // 하단의 방식은 실제 한번 프로미스가 돌아가면, 그 후 체인은 전부 비동기 진행이므로,
    // // 다른 방식을 쓰는 것이 좋다.
    // for(const item of iter) {            
    //     acc = acc instanceof Promise ? acc.then(acc => f(acc, item)): f(acc, item);
    // }
    // return acc;
    
    // 재귀로 변경
    // 최초 값이 프로미스로 들어와도 풀어서 진행하기 위한 함수    
    return releasePromise(acc, function recur(acc) {        
        let curr;
        while(!(curr = iter.next()).done) {
            acc = innerReduceFunc(acc, curr.value, f);       
            if(acc instanceof Promise) return acc.then(recur);
        }
        return acc;
    });
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
    iter = iter[Symbol.iterator]();   
    return function recur() {
        let curr;
        while(!(curr = iter.next()).done) {
            const item = curr.value;
            if(item instanceof Promise) {
                return item
                .then(v => (res.push(v), res).length == l ? res : recur())
                // 해당 위치의 catch 용도는 nop(합성함수 실패 방지) 용도의 에러인지, 실제 에러인지 확인하는 부분
                .catch(e => e == nop ? recur() : Promise.reject(e));
            }else if((res.push(item), res).length == l) {
                return res;
            }
        }
        return res;
    }();
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
        yield releasePromise(item, f);
    };
});

L.filter =  curry(function *(f, iter) {
    for ( const item of iter) {
        const v = releasePromise(item, f);
        if(v instanceof Promise) {
            yield v.then(v => v ? item : Promise.reject(nop))
        }
        else if(v) {
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

const map = curry(pipe(L.map, takeAll));
const filter = curry(pipe(L.filter, takeAll));

const find = curry((f, iter) => {
    return go(
    iter,
    L.filter(f),
    take(1),
    ([v]) => v
    );
});

function noop() {}; // 아무것도 하지 않는 함수
const catchNoop = arr => (arr.forEach(v => v instanceof Promise ? v.catch(noop) : v), arr);

const C = {}; //concurrency
C.reduce = curry((f, acc, iter) => {
    // catch된 값을 전달 하는 게 아니라, catch 를 미리 실행해놓는 것
    // 이유는 js는 catch 평가가 비동기의 경우 미리 컨텍스트에 올릴 때 CONSOLE에 찍어버리고 후에 평가하더라도 이미 찍힌 CONSOLE은 평가가 끝나 버리는 문제가 있어서
    // 해당 catch를 미리 실행 후, CONSOLE 처리를 끝내고 추후 catch 처리를 다시 해버리는 식으로 변경함
    // 추후에 비동기 catch 를 하더라도 잘 작동하게 된다.
    return iter ? reduce(f, acc, catchNoop([...iter])) : reduce(f, catchNoop([...acc]));    

    // 비구조화 할당을 통해서 인자 전달 방식을 변경.. 근데 읽기가 힘들어 굳이 여기까지 안 해도 될 듯
    // return reduce(f, ...(iter ? [acc, catchNoop([...iter])] : [catchNoop([...acc])])); 
});
C.take = curry((l, iter) => take(l, catchNoop([...iter])));
C.takeAll = C.take(Infinity);
C.map = curry(pipe(L.map, C.takeAll));
C.filter = curry(pipe(L.filter, C.takeAll));
// -- lib end -- //


const run = () => {
    const add10 = (v, callback) => {
        setTimeout(() => callback(v + 10), 100);
    }

    add10(5, res => {
        add10(res, res => {
            add10(res, res => {
                console.log(res);
            });
        });
    });

    const add20 = (v) => {
        return new Promise(resolve => setTimeout(() => resolve(v + 20), 100));
    }    
    add20(5)
    .then(add20)
    .then(add20)
    .then(console.log);

    // Promise는 기존 비동기 실행 함수와 다른 차이점이 있는데,
    // 바로 값으로 평가된다는 것이다. 일급 객체로 다룰 수 있는 점이 함수형에 있어서 유의미하게 다가온다.
    // 과거 비동기 함수는 컨텍스트 만 남기고 해당 내용은 값으로 평가되는 부분이 없기 때문에 읽기가 매우 곤란했다.
};


const run2 = () => {
    // 동기 상황에서만 실행을 보장
    const go1 = (v, f) => v instanceof Promise ? v.then(f) : f(v);
    const add5 = a => a + 5;

    console.log(go1(10, add5));

    const delay100 = a => new Promise(resolve => setTimeout(() => resolve(a), 100));
    
    const n1 = 10;
    go1(go1(n1, add5), console.log);
    
    const n2 = delay100(10);
    go1(go1(n2, add5), console.log);     
}

const run3 = () => {
    // composition
    // f . g
    // f(g(X))
    // monad > 강 타입 언어는 monad 가 필수적으로 있어야한다.
    // js는 데이터 타입이 유연하기 때문에, 크게 활용될 여지는 없다.

    const g = a => a + 1;
    const f = a => a * a;

    console.log(f(g(1)));
    console.log(f(g()));
    // [1].map(g).map(f).forEach(r => console.log(r));

    // 데이터의 유무에 따른 안전한 함수 합성을 위한 예시
    Array.of(1).map(g).map(f).forEach(r => console.log(r));
    [].map(g).map(f).forEach(r => console.log(r));

    // 프로미스는 데이터 관점이 아닌 비동기 / 동기의 결과 유무에 따른 안전한 함수 합성을 위한 도구
    Promise.resolve(1).then(g).then(f).then(r => console.log(r));    
    Promise.resolve().then(g).then(f).then(r => console.log(r));
    new Promise(resolve => 
        setTimeout(() => resolve(2), 100)
        ).then(g).then(f).then(r => console.log(r));

    // monad 는 js에서는 크게 중요한 개념이 아니니 집중하지 말아라. 
}

const run4 = () => {
    // Kleisli composition
    // 오류가 있을 수 있는 상황에서 함수 합성을 할 때 쓰는 규칙
    // f . g
    // 정상적인 상황
    // f(g(x)) == f(g(x))
    // 비정상적인 상황 일 때, f . g 와 g 의 결과가 같게 리턴을 한다. (kleisli composition)
    // f(g(x)) == g(x)

    let users = [
        {id: 1, name: 'aa'},
        {id: 2, name: 'bb'},
        {id: 3, name: 'cc'},
    ];

    const getUserById = id => find(u => u.id == id, users) || Promise.reject('no data!');
    const f = ({name}) => name;
    const g = getUserById;
    // const fg = id => f(g(id));
    // 이러한 외부 요인에 따라 합성함수의 결과를 보장할 수 없음
    // const r = fg(2);
    // users.pop();
    // users.pop();    
    // const r2 = fg(2);
    // console.log(r, r2);

    const fg = id => Promise.resolve(id).then(g).then(f).catch(v => v);
    fg(2).then(console.log)
    users.pop();
    users.pop();
}

const run5 = () => {
    // go, pipe, reduce에서 비동기 제어
    // 프로미스 reject를 돌려주기 때문에 catch 처리도 편리하게 할 수 있고,
    // 다형성에도 효과적이다.
    go( Promise.resolve(1),
        a => a + 10,
        a => Promise.resolve(a + 100),
        () => Promise.reject('error'),
        a => a+ 1000,
        a => a + 10000,
        console.log).catch(v => console.log(v));
}

const run6 = () => {
    // 프로미스 결과가 항상 프로미스가 아니라는 규칙을 기억하고 있어야한다.
    // 프로미스가 여러번 중첩되면 깊은 프로미스를 반환하는게 아니라 최후의 resolve를 반환한다.
    Promise.resolve(Promise.resolve(Promise.resolve(1))).then(console.log);
    new Promise(resolve => resolve(new Promise(resolve => resolve(1)))).then(console.log);
}

const run7 = () => {
    // 지연평가 + Promise - L.map, map, take   

    // L.map 이 promise의 경우
    go([0, 1, 2],
        L.map(a => Promise.resolve(a + 10)),
        takeAll,
        console.log);
    
    // 데이터가 promise의 경우    
    go([Promise.resolve(0), Promise.resolve(1), Promise.resolve(2)],
        L.map(a => a + 10),
        takeAll,
        console.log);
    
    // 둘 다 적용일 경우    
    go([Promise.resolve(0), Promise.resolve(1), Promise.resolve(2)],
        L.map(a => Promise.resolve(a + 10)),
        takeAll,
        console.log);
        
    // 위 셋을 map으로 변경
    // map = curry(pipe(L.map, takeAll));    
    go([0, 1, 2],
        map(a => Promise.resolve(a + 10)),        
        console.log);
    go([Promise.resolve(0), Promise.resolve(1), Promise.resolve(2)],
        map(a => a + 10),        
        console.log);
    go([Promise.resolve(0), Promise.resolve(1), Promise.resolve(2)],
        map(a => Promise.resolve(a + 10)),    
        console.log);    
    
}

const run8 = () => {
    // Kleisli composition - L.filter, filter, nop, take, reduce

    // nop 을 take, reduce에 지원하기
    go([1, 2, 3, 4, 5, 6],
        L.map(a => a * a),        
        // L.map(a => Promise.resolve(a * a)),
        L.filter(a => Promise.resolve(a % 2)),        
        take(2),        
        console.log);

    // nop 의 사용 방식 간단한 예시
    // reject 발생 후, 그 후 합성 함수 다 무시 바로 catch 로 떨어짐
    // Promise.resolve(1)
    // .then(() => Promise.reject('err'))
    // .then(() => console.log('this'))
    // .then(() => console.log('this'))
    // .then(() => console.log('this'))
    // .catch(e => console.log(e, 'get'));
}
const run9 = () => {
    // 모든 지연 평가와 비동기 작성을 추가 했을 경우, 
    // 함수로 실제 데이터 지연이 발생 했을 때, 필요한 작업만 진행하게 되므로 더 효율적으로 함수 수행이 가능하다.
    go([1, 2, 3, 4, 5, 6, 7, 8],
        L.map(a => {
            console.log(a);
            return new Promise(resolve => setTimeout(() => resolve(a * a), 1000));
        }),
        L.filter(a => {
            console.log(a);
            return new Promise(resolve => setTimeout(() => resolve(a % 2), 1000));
        }),
        take(2),
        // reduce((a, b) => a + b),        
        console.log);
}

const run10 = () => {
    // 지연된 함수열을 병렬적으로 평가하기 - C.reduce, C.take
    const delay1000 = a => new Promise(resolve => {
        console.log('run');
        return setTimeout(() => resolve(a), 1000);
    });
    console.time('');
    go([1, 2, 3, 4, 5, 6, 7, 8, 9],
        L.map(a => delay1000(a * a)),
        L.filter(a => delay1000(a % 2)),
        L.map(a => delay1000(a * a)),        
        C.take(2),
        C.reduce((a, b) => a + b),
        console.log,
        _ => console.timeEnd(''));
}

const run11 = () => {
    // 즉시 병렬적으로 평가하기 - C.map, C.filter
    const delay1000 = a => new Promise(resolve => {
        console.log('run');
        return setTimeout(() => resolve(a), 1000);
    });
    // console.time('');
    // go([1, 2, 3, 4, 5, 6, 7, 8, 9],
    //     C.map(a => delay1000(a * a)),
    //     // C.filter(a => delay1000(a % 2)),    
    //     // C.reduce((a, b) => a + b),
    //     console.log,
    //     _ => console.timeEnd(''));

    // 단계별
    map(a => delay1000(a * a), [1, 2, 3, 4]).then(console.log);
    filter(a => delay1000(a % 2), [1, 2, 3, 4]).then(console.log);

    // 동시성 처리
    C.map(a => delay1000(a * a), [1, 2, 3, 4]).then(console.log);
    C.filter(a => delay1000(a % 2), [1, 2, 3, 4]).then(console.log);
}

const run12 = () => {
    // 지연, 즉시, 동시성 코드들의 조합 예시
    const delay500 = (v, name) => new Promise(resolve => {
        console.log(`${name}: ${v}`);
        return setTimeout(() => resolve(v), 500);
    });

    console.time('');
    go([1, 2, 3, 4, 5, 6, 7, 8, 9],
        L.map(a => delay500(a * a, 'map 1')),
        L.filter(a => delay500(a % 2, 'filter 2')),
        L.map(a => delay500(a + 1, 'map 3')),        
        // C.take(2),
        C.reduce((a, b) => a + b),
        console.log,
        _ => console.timeEnd(''));
}

const run13 = () => {
    // async / await
    // 비동기 사항들을 문장으로 다루기 위한 방식들
    // async await는 프로미스 객체를 기반으로 동작하기 때문에 어디에선가는 Promise 객체를 생성 해줘야 한다.
    function delay(time) {
        return new Promise(resolve => setTimeout(() => resolve(), time));
    }

    async function delayIdentity(a) {
        await delay(500);
        return a;
    }

    // async는 항상 Promise 객체를 반환한다.
    async function f1() {
        const a = await delayIdentity(10);
        const b = await delayIdentity(5);
        return a + b;
    }    

    // async 결과를 활용하고 싶을 때 예시들
    f1().then(console.log);
    releasePromise(f1(), console.log);
    (async () => {
        // await는 오는 결과의 promise 객체를 평가 후 진행한다.
        console.log(await f1());
    })();

    const pa = Promise.resolve(10);
    const pa2 = f1();
    (async () => {        
        console.log(await pa);
        console.log(await pa2);
    })();
}


const main = () => {
    // 9 chapter
    // run();
    // run2();
    // run3();
    // run4();
    // run5();
    // run6();

    // 10 chapter
    // run7();
    // run8();
    // run9();
    // run10();
    // run11();
    // run12();    
    
    // appendix async / await
    // run13();
}
main();