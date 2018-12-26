// generator - iterable 하고, iterator를 가지는 함수

const run = () => {
    function *gen1() {
        yield 1;
        yield 2;
        yield 3;    

        // default는 return 값이 undefined 이나, return 값을 지정해주면 해당 값을 리턴한다.
        // return 4;
    }
    const iter = gen1();
    console.log(iter.next());
    console.log(iter.next());
    console.log(iter.next());
    console.log(iter.next());

    for ( const item of gen1()) {
        console.log(item);
    }
}

const run2 = () => {
    function * odds(limit) {
        for(let i = 0; i <= limit; i++) {
            if (i % 2) {
                yield i;
            }
        }
    }

    for(const item of odds(11)) {
        console.log(item);
    }

    // iterable 하므로, 전개연산자와 구조 분해, 나머지 연산자에 활용 가능
    console.log([...odds(11), ...odds(5)]);
    const [head1, ...tail1] = odds(7);
    console.log(head1, tail1);

    // next 전개 후, 할당도 당연히 가능
    const iter1 = odds(7);
    iter1.next();
    iter1.next();
    const [head2, ...tail2] = iter1;
    console.log(head2, tail2);
}

const main = function main() {
    console.log('---Generator Basic---');
    run();
    console.log('---End---');
    console.log('---Example: odds---');
    run2();
    console.log('---End---');
};
main();