
// version 별 list 순회

const run = () => {
    // ES <= 5
    var list = [1, 2, 3];
    // for(var i = 0; i < list.length; i++) {
    //     console.log(list[i]);
    // }
    // var str = 'abc';
    // for(var i =0; i < str.length; i++) {
    //     console.log(str[i]);
    // }
    const iter = list[Symbol.iterator]();
    
    console.log(iter.next());
    console.log(iter.next());
    console.log(iter.next());
    console.log(iter.next());

    for(var item of list) {
        console.log(item);
    }
};

const run2 = () => {
    // ES 6 over
    const set = new Set([4, 5, 6]);
    const iter = set[Symbol.iterator]();
    
    console.log(iter.next());
    console.log(iter.next());
    console.log(iter.next());
    console.log(iter.next());

    for(const item of set) {
        console.log(item);    
    }    
};
const run3 = () => {
    // ES 6 over
    const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
    const iter = map[Symbol.iterator]();
    
    console.log(iter.next());
    console.log(iter.next());
    console.log(iter.next());
    console.log(iter.next());

    for(const item of map) {
        console.log(item);    
    }    
    // map.entires / map.keys / map.values 들 모두 for of로 순회하도록 iter가 준비되어 있다. default는 entries
    for(const item of map.entries()) {
        console.log(item);    
    }    
};

const run4 = () => {
    const iterable = {
        [Symbol.iterator]: function() {
            var limit = 3;
            return {
                next() {
                    return limit < 1 ? {value: undefined, done: true } : { value: limit--, done: false }
                },
                // next 한번 이상 호출 후, 다시 for of 순회를 할 때 이어갈 수 있도록 심볼 자체를 리턴해주어야한다 프로토콜 명시 규약임
                [Symbol.iterator]: function() {return this;}
            }
        }
    }
    const iter = iterable[Symbol.iterator]();
    console.log(iter.next());
    for(const item of iterable) {
        console.log(item);
    }

    // ES 6 이후에는 유사 배열이 아니라 iterator형식으로 전환 되어져 가고 있다.

    // ex html 연계 예제
    // for( const item of document.querySelectorAll('*')) {
    //     console.log(item);
    // }
}

run5 = () => {
    const list = [1, 2];
    console.log([...[1, 2], 3]);
    console.log([...list]);
    // spread operator 역시 iterable 객체에 의존하고 있다.
    // list[Symbol.iterator] = null; -> error
    const iter = list[Symbol.iterator]();
    console.log([...iter]);
}

const main = () => {
    console.log('---Array---');
    run();
    console.log('---End---');
    console.log('---Set---');
    run2();
    console.log('---End---');
    console.log('---Map---');
    run3();
    console.log('---End---');
    console.log('---Custom Iterator---');
    run4();
    console.log('---End---');
    console.log('---Spread Operator---')
    run5();
    console.log('---End---');
}
main();

// iterable , iterator protocol
// iterable : 이터레이터를 리턴하는 [Symbol.iterator]() 를 가진 값
// iterator : { value, done } 객체를 리턴하는 next() 를 가진 값
// 이터러블 