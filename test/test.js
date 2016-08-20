import {EventEmitter} from "util";

const createChangeEmitter=()=>{return ()=>{}};

class TestClass {

    @Private
    p=1;

    j=2;
    constructor() {
        runWith(this.p);

        this.p = 2;

        var self = this
          , other="gone";

        self.p = this.p.g;

        self.p = ['event1','event2','event3','event4','event5','event6']
                         .reduce((ev,all)=>({...all,[ev]: createChangeEmitter()}),{});;

        this.func1("constructor",this.p);

        var me;
        me = this;

        me.p = 7;

        me.j = 8;

        self = me;

        self.p = me.p;

        const otherFunc = function(){   
            var self2=this; // need to handle this situation three shouldn't == p.get(self2)
            var self3=self;
            var two = self3.p;
            var three=self2.p;
        }

    }

    p() {
        return this.p;
    }
    @Private
    func1(fromWhere) {
        console.log("This is the first function called from ",fromWhere);
    }

    getP() {
        return this.p;
    }

    setP(v) {
        this.p=v;
    }

    func2() {
        console.log("This is another function",this.p);
        const z=this.p;
        const x=this.j;
    }

    static x = class cClass {

        @Private
        j;

        constructor() {
            console.log("This is a contained class of parent class.");

            this.j=parent.p;
        }

        func1(){
            console.log("This is func1");
        }
        @Private
        func2(){
            console.log("This is func2");
        }
    }
}

function runWith(value) {
    console.log('Run with called with value:',value);
}
const test = new TestClass();

runWith('outside');

console.log("Number should be 7");
test.func2();

try {
    test.func1('outside');
    console.log("accesing private func1 didn't throw error.");
} catch (e) {
}

if (test.p)
    console.log("get private var p shouldn't exist.");

test.p=10;
if (test.p!=10)
    console.log("get var p not correct value.");

test.func2();


export default TestClass;
export {TestClass};