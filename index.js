// import PrivateProperties from './private.js';

module.exports=function (opts) {
  var Plugin = opts.Plugin;
  var types = opts.types;
  return {visitor: {
      FunctionDeclaration: function (node, parent) {
        // new PrivateProperties(t).run(node);
      	console.log("Entered function declaration.");
      },
      // PropertyDeclaration: function (node,parent) {
      // 	console.log("Entered property declaration.");
      // },
      Identifier: {
      	enter: function() {
      		console.log("Entered: ",arguments)
      	},
      	exit: function() {
      		console.log("Exit: ",arguments)
      	}
      }
    }
  };
}
