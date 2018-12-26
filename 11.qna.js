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

const delayI = function delayI(a) {
    return new Promise(resolve => setTimeout(() => resolve(a), 100));
}

const run = () => {
    // QnA. Array.prototype.map 이 있는데 왜 ? FxJS map 함수가 필요한가?
    
    // 함수 자체를 비동기 제어가 가능하도록 수정해야됨
    async function f2() {
        const list = [1, 2, 3, 4];
        // 문법 충돌 문제 async / await 무한 겹치기
        // Array.prototype.map 은 비동기 상황에 대한 제어를 해줄 수 없다.
        const temp = list.map(async a => await delayI(a * a));
        console.log(temp);
        const res = await temp;
        console.log(res);
    }   
    // f2(); 

    async function f3() {
        const list = [1, 2, 3, 4];    
        const temp = await map(a => delayI(a * a), list);
        console.log(temp);
        const res = await temp;
        console.log(res);
    }
    // f3();

    // 주의 async 는 항상 PROMISE 객체를 리턴한다.
    async function f4() {
        const list = [1, 2, 3, 4];    
        
        // const res = await map(a => delayI(a * a), list);           
        // return res;

        // 위 리턴과 결과는 같다.
        return map(a => delayI(a * a), list);
    }
    f4().then(console.log);

    // f4와 동치
    async function f5() {        
        return map(a => delayI(a * a), [1, 2, 3, 4]);
    }
    f5().then(console.log);
};

const run2 = () => {
    // QnA. 이제 비동기는 async / await로 제어할 수 있는데, 왜 파이프라인이 필요한가?
    // 두 문제는 비동기 동기 상황에 대한 대치가 아님

    // async / await는 비동기 상황을 동기적인 문장형으로 풀어서 보기위한 목적 용도 (유저가 읽기 쉽고 사용하기 쉽게 하기 위함)
    // pipeline 은 합성함수를 만들기 위한 목적용도

    // 헷갈리는 이유는 pipeline 이 비동기 / 동기 서술 방식이 같아서 구분이 안가는 문제

    // 이 함수에서 PIPE는 명령형 > 선언형 으로 프로그래밍 사고를 변경한 정도
    function f(list) {
        return go(list,
            L.map(a => delayI(a * a)),
            L.filter(a => delayI(a % 2)),
            L.map(a => delayI(a + 1)),
            take(3),
            reduce((a, b) => delayI(a + b))
            );
    }
    go(f([1, 2, 3, 4, 5, 6, 7, 8]), console.log);

    // 위의 PIPE 를 async / await와 명령형으로 동치로 작성한 코드
    async function f2(list) {
        let arr = [];
        for (const a of list) {
            const b = await delayI(a * a);
            if(await delayI(b % 2)) {
                const temp = await delayI(b + 1);
                arr.push(temp);
                if(arr.length == 3) {
                    break;
                }                
            }
        }
        let res = arr[0];
        let i = 0;
        while(++i < arr.length) {
            res = await delayI(res + arr[i]);
        }
        return res;
    }
    go(f2([1, 2, 3, 4, 5, 6, 7, 8]), console.log);

    // 첫번째 함수는 동기 비동기 상관없이 동작한다. 두번째는 비동기 <> 동기로 상황이 변경되면, async / await 키워드가 전부 제거 되어야한다
    // 두 코드는 시간 복잡도는 같다
    // 두번째 코드를 동시성 코드로 변경하는 것은 매우 어렵다
    // 파이프라인을 돌리는 함수형 코드의 동치 코드를 짜는건 할 수 있지만, 그 역은 매우 힘들어진다.
}

const run3 = () => {
    // QnA 그럼 async / await 과 pipe를 같이 쓰는가? 많이 쓴다.
    async function f(list) {
        const r1 = await go(list,
            L.map(a => delayI(a * a)),
            L.filter(a => delayI(a % 2)),
            L.map(a => delayI(a + 1)),
            C.take(2),
            reduce((a, b) => delayI(a + b))        
            );
        const r2 = await go(list,
            L.map(a => delayI(a * a)),
            L.filter(a => delayI(a % 2)),
            reduce((a, b) => delayI(a + b))        
            );
        const r3 = await delayI(r1 + r2);
        return r3 + 10;
    }
    go(f([1, 2, 3, 4, 5, 6, 7, 8]), console.log);
}

const run4 = () => {
    // QnA 동기 상황에서 에러 핸들링은 어떻게 해야하는가?

    // 이 경우, default 값을 할당하는 식으로 처리
    function f(list = []) {
        return (list || [])
        .map(a => a + 10)
        .filter(a => a % 2)
        .slice(0, 2);
    }
    // go(f([1, 2, 3, 4, 5, 6, 7, 8]), console.log);    
    go(f([1, 2, 3, 4, 5, 6, 7, 8]), console.log);
    go(f([]), console.log);    
    go(f(null), console.log);

    // try / catch 방식
    function f2(list) {
        try {
            return list
            .map(a => a + 10)
            .filter(a => a % 2)
            .slice(0, 2);
        } catch (e) {
            return [];
        }        
    }

    go(f2(null), console.log);    
}

const run5 = () => {
    // QnA 비동기 상황에서 에러 핸들링은 어떻게 해야하는가?
    // 동기 / 비동기 에러 핸들링에서 파이프 라인의 이점을 발휘 해서 핸들링
    
    // 하단 방식은 어떻게 하더라도 핸들링 포지션 찾기가 매우 어렵다.
    async function f(list) {
        try {
            return await list
            .map(async a => await new Promise(resolve => {
                resolve(JSON.parse(a));
            }))
            .filter(a => a % 2)
            .slice(0, 2);
        } catch (e) {
            console.log(e, '--------------');
            return [];
        }        
    }
    
    // 실제로 catch 에서 잡아내지 못함
    // f(['0', '1', '2', '{']).then(console.log).catch(e => {
    //     console.log('여기에서 핸들링 되나?');
    // });

    // go 함수 앞에 await 키워드로 놓고, go 가 pipe 합성이 잘 된 promise의 경우, error catch가 잘 된다.
    //쉬운 에러 핸들링을 하려면 monad를 통해서, 안전한 합성함수를 만들 수 있어야한다.
    async function f2(list) {
        try {
            return await go(
                list,
                L.map(a => new Promise(resolve => {
                    resolve(JSON.parse(a));
                })),
                L.filter(a => a % 2),
                take(2));                
        } catch (e) {
            // lazy function으로 평가하면, 에러 상황가기 전까지 에러 CATCH가 안된다.
            console.log('await 가 좋구나');
            return [];
        }        
    }

    f2(['0', '1', '2', '3', '4', '{']).then(console.log).catch(e => {
        console.log('여기에서 핸들링 되나?');
    });

    // async try - catch가 동작되려면, Promise.reject를 return 값으로 반환되야한다. 
    async function f3(list) {
        try {
            return Promise.reject('여기가 처리되야 try catch');
        } catch (e) {
            console.log(e, '--------------');
            return [];
        }        
    }
}

const main = () => {
    // qna
    // run();
    // run2();
    // run3();    
    // run4();
    // run5();
}
main();