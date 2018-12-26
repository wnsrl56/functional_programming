const products = [
    {name: 'Shirt', price: 15000},
    {name: 'Pants', price: 30000},
    {name: 'Glasses', price: 50000},
    {name: 'Shoes', price: 70000},
    {name: 'Hat', price: 40000}
];
const run = () => {
    let names = [];
    for(const item of products) {
        names.push(item.name);
    }
    console.log(names);
    let prices = [];
    for(const item of products) {
        prices.push(item.price);
    }
    console.log(prices);

    // 일반화 시키기

    // fn => 반환 시킬 아이템을 뽑아내는 함수
    const map = (fn, iter) => {
        let result = [];
        for(const item of iter) {
            result.push(fn(item));
        }
        return result;
    }

    console.log(map(p => p.name, products));
    console.log(map(p => p.price, products));

    // map의 다형성

    console.log([1, 2, 3].map(a => a+1));
    // 유사 배열에 map 함수가 할당이 안되어 있지만, 위에 생성한 함수는 가능하다(iterable에 대응하게 만들었기 때문)
    // console.log(document.querySelectorAll('*').map(el => el.name)); -> error
    // console.log(map(el => el.nodeName, document.querySelectorAll('*'))); -> ok

    function *gen() {
        yield 2;
        if (false) yield 3;
        yield 4;
    }
    console.log(map(item => item * item, gen()));

    let m = new Map();
    m.set('a', 10);
    m.set('b', 20);
    const it = m[Symbol.iterator]();
    // 구조 분해로 key value를 받아서 value를 변경 후 새로운 MAP 객체로 리턴할 수  있다.
    console.log(map(([k, v]) => [k, v * 2], m ));

    let m2 = new Map(map(([k, v]) => [k, v * 2], m ));
    for(const item of m2) {
        console.log(item)
    };
}
const run2 = () => {
    const filter = (fn, iter) => {
        let res = [];
        for (const item of iter) {
            if( fn(item) ) {
                res.push(item);
            }
        }
        return res;
    }
    let filteredValue = filter(item => item.price < 20000, products);
    console.log(...filteredValue);

    let filteredValue2 = filter(item => item.price >= 20000, products);
    console.log(...filteredValue2);

    console.log(filter(n => n % 2, [1, 2, 3, 4]));
    console.log(filter(n => n % 2, function *() {
        yield 1;
        yield 2;
        yield 3;
        yield 4;
        yield 5;
    }()));
}
const run3 = () => {
    const nums = [1, 2, 3, 4, 5];
    let total = 0;

    for(const item of nums) {
        total += item;
    }
    console.log(total);

    const reduce = (fn, acc, iter) => {
        // acc 초기값을 선언 해주지 않아도, js 에서는 iter 값을 분할해서 쓰게 하는 방어로직이 들어있다.
        if(!iter) {
            iter = acc[Symbol.iterator]();
            acc = iter.next().value;
        }
        for(const item of iter) {
            acc = fn(acc, item);
        }
        return acc;
    };

    const add = (a, b) => a + b;
    const sub = (a, b) => a - b;
    console.log(reduce(add, 0, [1, 2, 3, 4, 5]));
    console.log(reduce(sub, 0, [1, 2, 3, 4, 5]));
    
    // reduce는 fn에 다 위임해서 누적하기 때문에, 데이터 형태와 무관하게 돌아간다.
    console.log(reduce((total_price, product) => total_price + product.price, 0, products));
}

const main = function main() {
    console.log('---Map---');
    run();
    console.log('---End---');
    console.log('---Filter---');
    run2();
    console.log('---End---');
    console.log('---Reduce---');
    run3();
    console.log('---End---');
};
main();