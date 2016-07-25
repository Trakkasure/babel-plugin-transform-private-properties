import {deprecated} from 'core-decorators';

// const Private = deprecated;

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

		self.j = this.j;

		this.func1("constructor",this.p);

	}

	@Private
	func1(fromWhere) {
		console.log("This is the first function called from ",fromWhere);
	}

	func2() {
		console.log("This is another function",this.p);
		const z=this.p;
		const x=this.j;
	}
}


function runWith(v) {
	console.log("Do something with v");
}


// export {TestClass};

// const c = new TestClass();

// console.log(c);
// c.func1();