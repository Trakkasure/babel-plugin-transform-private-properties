# babel-plugin-transform-private-properties

Compile private variables into classes utilizing weak maps.

## Installation

```sh
$ npm install babel-plugin-transform-private-properties
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["babel-plugin-transform-private-properties"]
}
```

### Via CLI

```sh
$ babel --plugins babel-plugin-transform-private-properties script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["babel-plugin-transform-private-properties"]
});
```


## Implementation

```javascript
class TestClass {

    @Private
    p=1; // Decalare private var. Very important, @Private is on it's own line, and is capitalized.

    @Private
    s;

    // Declare non-private class property.
    j=2;
    constructor() {
        this.p = 2; // Setting private.

        var self = this // Yes, we follow copying this scope.
          , other="gone";

        self.p = this.p.g; // Setting private (p) self is assigned to "this" so assign p to value of p.g

        this.func1("constructor",this.p); // Call func1 (which is private) with options. Can't call fun1 outside of this class.
 
        var me;
        me = self; // Yes, we follow copying this scope too.

        me.s = 5;

        me.p = 7;

        me.j = 8;

        self = me;

        self.p = me.p;

    }

    // You can create public functions with same name as private variable as a way to access the private in a controlled way.
    p() {
        return this.p;
    }

    // Getters can be the same as a private variable to gate-keep access.
    get s { // this probably shouldn't be allowed to work.
	    return this.s;
    }

    @Private
    func1(fromWhere) {
        console.log("This is the first function called from ",fromWhere);
    }
}
```

This results in the usage such as: 
```javascript
var t = new TestClass();
t.func1("Outside"); // t.func1 is not a function
t.s = "hi" // TypeError: Cannot set property s of #<TestClass> which has only a getter
console.log(t.s); //outputs "5"
console.log(t.p()) // outputs "7"
```
