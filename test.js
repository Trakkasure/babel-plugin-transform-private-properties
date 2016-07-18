//import {Private} from 'private.js';
class TestClass {

	@Private
	p;

	constructor() {

	}

	@Private
	func1() {
		console.log("This is the first function");
	}
}
