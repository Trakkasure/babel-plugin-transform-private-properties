 class TestClass {

	@Private
	p=1;

    j=2;
	constructor() {
		runWith(this.p);

		this.p = 2;

		var self = this
		  , other="gone";

		self.p = 3;

		self.p = this.p;

		this.func1("constructor",this.p);

		var me;
		me = this;

		me.p = 7;

		me.j = 8;

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
}

function runWith(value) {
	console.log('Run with called with value:',value);
}
const test = new TestClass();

runWith('outside');

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
