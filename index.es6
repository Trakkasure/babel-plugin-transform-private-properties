
// import * as t from "babel-types";
import nameFunction from "babel-helper-function-name";


// var t = require('babel-types');
// var generate = require('babel-generator');
const template = require('babel-template');
const privateAssignment = template(`
  IMPORT_NAME.set(this,IMPORT_VALUE);
`);
const privateExpressionStatement = template(`
  IMPORT_NAME.get(this);
`);
const buildConstructor = template(`
  constructor(){

  }
`);

export default function({types: t}) {
  let findBareSupers = {
    Super(path) {
      if (path.parentPath.isCallExpression({ callee: path.node })) {
        this.push(path.parentPath);
      }
    }
  };

  let referenceVisitor = {
    ReferencedIdentifier(path) {
      console.log(path.node.name);
      if (this.scope.hasOwnBinding(path.node.name)) {
        console.log("Ref :",JSON.stringify(path,cleanJSON(),4));
        // this.collision = true;
        path.skip();
      }
    }
  };

    return {
        // inherits: require('babel-plugin-transform-class-properties')
        visitor: {
            Class(path) {
                let isDerived = !!path.node.superClass;
                let constructor;
                let props = [];
                let body = path.get("body");
                let privateDecorator=null;
                let instanceBody = [];
                const refs = [];
                for (let subPath of body.get("body")) {
                  if (subPath.isClassProperty()) {
                    props.push(subPath);
                  } else if (subPath.isClassMethod({ kind: "constructor" })) {
                    constructor = subPath;
                  } else if (subPath.isClassMethod() && (privateDecorator=findPrivateDecorator(subPath.node))!==false) {
                    // console.log(JSON.stringify(subPath,cleanJSON('scope','context'),4));
                    path.insertBefore(t.variableDeclaration('var',[t.variableDeclarator(
                        t.Identifier(subPath.node.key.name),t.newExpression(t.Identifier('WeakMap'),[])
                    )]
                    ));
                    subPath.node.decorators.splice(privateDecorator, 1);
                    // move into constructor
                    instanceBody.push(
                      t.expressionStatement(
                        t.callExpression(
                          t.memberExpression(
                            t.Identifier(subPath.node.key.name)
                          , t.Identifier('set')
                          )
                        , [
                            t.thisExpression()
                          , t.functionExpression(
                              t.Identifier('')
                            , subPath.node.params
                            , subPath.node.body
                            )
                          ]
                        )
                      )
                    );
                    refs.push(subPath.node.key.name);
                    subPath.remove();
                    subPath.traverse(referenceVisitor,{scope:path.scope,context:path.context});
                  }
                }

                if (!props.length) return;

                let nodes = [];
                let ref;

                if (path.isClassExpression() || !path.node.id) {
                  nameFunction(path);
                  ref = path.scope.generateUidIdentifier("class");
                } else { // path.isClassDeclaration() && path.node.id
                  ref = path.node.id;
                }

                for (let prop of props) {
                  let propNode = prop.node;
                  if (propNode.decorators && propNode.decorators.length > 0) {
                    const privateDecorator=findPrivateDecorator(propNode);
                    if (privateDecorator===false) continue;
                    path.insertBefore(t.variableDeclaration('var',[t.variableDeclarator(
                        t.Identifier(propNode.key.name),t.newExpression(t.Identifier('WeakMap'),[]))
                    ])
                    );
                    refs.push(propNode.key.name);
                    propNode.decorators.splice(privateDecorator, 1);
                    if (!propNode.value) continue;
                    instanceBody.push(t.expressionStatement(
                        t.assignmentExpression('=',t.memberExpression(t.thisExpression(), propNode.key),propNode.value)
                    ));
                    instanceBody.push(
                      t.expressionStatement(
                        t.callExpression(
                          t.memberExpression(
                            t.Identifier(propNode.key.name)
                          , t.Identifier('set')
                          )
                        , [
                            t.thisExpression()
                          , propNode.value
                          ]
                        )
                      )
                    );
                    continue;
                  }

                  if (!propNode.value) continue;

                  let isStatic = propNode.static;

                  if (isStatic) {
                    nodes.push(t.expressionStatement(
                      t.assignmentExpression("=", t.memberExpression(ref, propNode.key), propNode.value)
                    ));
                  } else {
                    instanceBody.push(t.expressionStatement(
                      t.assignmentExpression("=", t.memberExpression(t.thisExpression(), propNode.key), propNode.value)
                    ));
                  }
                }

                if (instanceBody.length) {
                  if (!constructor) {
                    let newConstructor = t.classMethod("constructor", t.identifier("constructor"), [], t.blockStatement([]));
                    if (isDerived) {
                      newConstructor.params = [t.restElement(t.identifier("args"))];
                      newConstructor.body.body.push(
                        t.returnStatement(
                          t.callExpression(
                            t.super(),
                            [t.spreadElement(t.identifier("args"))]
                          )
                        )
                      );
                    }
                    [constructor] = body.unshiftContainer("body", newConstructor);
                  }
                for (let path of body.get("body")) {
                    path.traverse({
                      ThisExpression(path) {
                        // path=path.parentPath;
                        if (path.parentPath.type==='MemberExpression') {
                          if (refs.indexOf(path.parent.property.name)==-1) return;
                          if (path.parentPath.parentPath.type=="AssignmentExpression") {
                            // console.log("ThisExpressions: ",JSON.stringify(path.parentPath,cleanJSON("context","scope"),4));
                            if (path.parentPath.parent.left.type=="MemberExpression") {
                              console.log("Writing setter ",path.parentPath.parent.left.property.name)
                              // console.log("ThisExpressions: ",JSON.stringify(path.parentPath.parentPath.parentPath,cleanJSON("context","scope"),4));
                              path.parentPath.parentPath.parentPath.replaceWith(t.expressionStatement(
                                t.callExpression(
                                  t.memberExpression(
                                    t.Identifier(path.parentPath.parent.left.property.name)
                                  , t.Identifier('set')
                                  )
                                , [
                                    path.node
                                  , path.parentPath.parent.right
                                  ]
                                )
                              ));
                            } else {
                              console.log("Writing getter ",path.parentPath.parent.left.property.name)
                              path.parentPath.replaceWith(t.callExpression(
                                t.memberExpression(
                                  t.Identifier(path.parent.property.name)
                                , t.Identifier('get')
                                )
                              , [
                                  t.thisExpression()
                                ]
                              ));
                            }
                          } else {
                            // console.log("ThisExpressions: ",JSON.stringify(path.parent,cleanJSON("context","scope"),4));
                              console.log("Writing getter ",path.parent.property.name)
                              path.parentPath.replaceWith(t.callExpression(
                                t.memberExpression(
                                  t.Identifier(path.parent.property.name)
                                , t.Identifier('get')
                                )
                              , [
                                  t.thisExpression()
                                ]
                              ));
                          }
                        } else {
                          if (path.parent.type=="AssignmentExpression") {
                          }
                        }
                      }
                    });
                }

                  let collisionState = {
                    collision: false,
                    scope: constructor.scope
                  };

                  for (let prop of props) {
                    prop.traverse(referenceVisitor, collisionState);
                    if (collisionState.collision) break;
                  }

                  if (collisionState.collision) {
                    let initialisePropsRef = path.scope.generateUidIdentifier("initialiseProps");

                    nodes.push(t.variableDeclaration("var", [
                      t.variableDeclarator(
                        initialisePropsRef,
                        t.functionExpression(null, [], t.blockStatement(instanceBody))
                      )
                    ]));

                    instanceBody = [
                      t.expressionStatement(
                        t.callExpression(t.memberExpression(initialisePropsRef, t.identifier("call")), [t.thisExpression()])
                      )
                    ];
                  }

                  //

                  if (isDerived) {
                    let bareSupers = [];
                    constructor.traverse(findBareSupers, bareSupers);
                    for (let bareSuper of bareSupers) {
                      bareSuper.insertAfter(instanceBody);
                    }
                  } else {
                    constructor.get("body").unshiftContainer("body", instanceBody);
                  }
                }

                for (let prop of props) {
                  prop.remove();
                }

                path.traverse(referenceVisitor,{scope:path.scope});

                // console.log(constructor.scope)

                if (!nodes.length) return;

                if (path.isClassExpression()) {
                  path.scope.push({ id: ref });
                  path.replaceWith(t.assignmentExpression("=", ref, path.node));
                } else { // path.isClassDeclaration()
                  if (!path.node.id) {
                    path.node.id = ref;
                  }

                  if (path.parentPath.isExportDeclaration()) {
                    path = path.parentPath;
                  }
                }

                path.insertAfter(nodes);

            },
            ArrowFunctionExpression(path) {
                let classExp = path.get("body");
                if (!classExp.isClassExpression()) return;

                let body = classExp.get("body");
                let members = body.get("body");
                if (members.some((member) => member.isClassProperty())) {
                  path.ensureBlock();
                }
            }
        }
    }
}

/*
module.exports=function (opts) {
  // console.log(opts);
  var t = opts.types;
  var properties=[];
  var once=true;
  var watchFor=[];
  return {
    visitor: {
      // ClassExpression: function(path) {
      //     // delete path.parent;
      //     console.log('ClassExpression:',path.node.body.body);
      // },
      ClassDeclaration: {
        enter:function(path) {
          // delete path.parent;
          // console.log('ClassDeclaration:',path.node.body.body);
          console.log("Processing...");
          (properties=findPrivatePropertiesAndMethods(path,t)).forEach(function(cv) {
              path.insertAfter(buildWeakMap({IMPORT_NAME:t.Identifier(cv.key.name)}));
          });
          console.log("Props: ",properties);
          var ctor = path.node.body.body.filter((body) => {
              return body.kind === 'constructor';
          })[0];
          var idx=0;
          if (!ctor) {
              ctor=t.ClassMethod('constructor',t.Identifier('constructor'),[],t.BlockStatement([]));
              console.log('After Constructor Creation:',path.node);
              var first=false;
              path.traverse({
                  ClassMethod: function(path) {
                      if (first)
                          path.insertBefore(ctor);
                      first = false;
                  }
              });
          }
          console.log('Constructor: ',ctor);
          if (ctor.body.body.length&&ctor.body.body[0].type==="ExpressionStatement" && ctor.body.body[0].expression.callee.type==="Super") idx++;
          var assignments=properties.map(function(cv){
              return privateAssignment({
                  IMPORT_NAME: t.Identifier(cv.key.name),
                  IMPORT_VALUE: cv.value
              });
          });
          [].splice.apply(ctor.body.body,[idx,0].concat(assignments));
        }
      , exit: function(path) {
          console.log("Exiting class declaration.",properties);
        }
      },
      Class: function(path) {
          console.log('Class: ');//,properties);
          // delete path.parent;
          // console.log(path.node.body.body);  
          // console.log(JSON.stringify(path,true,4));
      },
      AssignmentExpression:function(path) {
          if (!properties.length) return;
          console.log('Assignment: ',JSON.stringify(path,cleanJSON(),4));
          // console.log('Assignment: ',JSON.stringify(path.node,true,4));
          // path.node.declarations.forEach(function(decl) {
          //     if(decl.init.type==='ThisExpression') watchFor.push(decl.id);
          // });
      },
      VariableDeclaration: function (path,parent) {
          if (!properties.length) return;
          if (path.declarations && path.declarations[0].init.type==='ClassExpression') return;
          console.log('Variable Declartion: ',JSON.stringify(path,cleanJSON(),4));
          // console.log('Variable Declartion: ',JSON.stringify(path.node,true,4));
          //fixAssignments(path,properties,t);
      }
    }
  };
}
*/
function cleanJSON (...fields) {
  var objs=[];
  var fields = [
          'loc',
          'parent',
          'hub',
          'contexts',
          // 'data',
          // 'shouldSkip',
          // 'shouldStop',
          // 'removed',
          // 'state',
          'opts',
          // 'skipKeys',
          'parentPath',
          // 'context',
          'container',
          // 'listKey',
          // 'inList',
          'parentKey',
          'parentBlock',
          // 'key',
          // 'node',
          // 'scope',
          // 'type',
          // 'typeAnnotation'
        ].concat(fields);
  return function(k,v) {
    if (fields.indexOf(k)>=0) return "[Object]";
      if (objs.indexOf(v)>=0) return "[Circular Reference]";
      if (typeof v === typeof({}) || typeof v === typeof([])) objs.push(v);
      return v;
    }
}
function findPrivatePropertiesAndMethods(path,types) {
  var properties=[];

  var holdItemRef=function(path) {
      var hasPrivateDecoraror=findPrivateDecorator(path.node);
      if (hasPrivateDecoraror===false) return;
      properties.push(path.node);
      path.node.decorators.splice(hasPrivateDecoraror, 1);
  }
  path.traverse({
    ClassProperty: holdItemRef,
    ClassMethod: holdItemRef
  });
  return properties;
}

function findPrivateDecorator(node) {
  var idx=0;
  return (node.decorators || []).some((decorator) => {
    return decorator.expression.name === 'Private'||(++idx&&false);
  })?idx:false;
}

// check in all functions for assignment uses.
function fixAssignments(path,properties,t) {
  // var watchFor=[];
  path.traverse({
      AssignmentExpression: function(path) {
        // console.log(JSON.stringify(path.node,true,4));
        if (path.node.operator==='=' && path.node.left.type==='MemberExpression' &&  path.node.left.object.type==='ThisExpression') {
            var prop=properties.filter(function(cv){return cv.key.name === path.node.left.property.name })[0];
            path.node = privateAssignment({
              IMPORT_NAME: t.Identifier(prop.key.name),
              IMPORT_VALUE: path.node.right
            });
        }
      }
  })
}

function deleteDecorators(klass, decorators) {
  decorators.forEach((decorator) => {
    var index = klass.decorators.indexOf(decorator);
    if (index >= 0) {
    }
  });
}

function findThisExpressions(path,mapper,t){

}
