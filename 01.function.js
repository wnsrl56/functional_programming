const log = console.log;

// 일급 함수 - 함수가 값으로 다루어 질 수 있다.
// 고차 함수 - 함수를 값으로 다루는 함수
// 사이드 이펙트(부수 효과) - 외부 세상의 변화에게 영향을 받거나 영향을 주는 것
// 순수 함수 - 부수 효과가 없고, 같은 인자를 받으면 항상 같은 결과를 리턴하는 함수, 언제 어느 시점에 평가해도 항상 동일하게 결과를 만듦

const run = function() {
    const apply1 = f => f(1);
    const add2 = a => a + 2;
    log(apply1(add2));
    log(apply1(a => a - 1));

    const times = (f, n) => {
        let i = -1;
        while (++i < n) {
            f(i);
        }
    }

    times(log, 3);
    times(a => log(a + 10), 3);

    // 함수를 만들어서 리턴하는 함수 (클로저를 만들어 리턴하는 함수)
    const addMaker = a => b => a + b;
    const add10 = addMaker(10);
    log(add10(5));
    log(add10(10));

    // 부수효과들
    console.log(10);
    let a = 10;
    function f1(b) {
        a = b; // 자기 스코프 밖의 값을 고쳐버림
    }

    // 순수 함수
    function add1(a) {
        return a + 1;
    }
    console.log( add1(1) );

    setTimeout(()=> console.log(add1(1)), 1000);
}

const main = function main() {
    run();
};
main();
