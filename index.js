
export default function({types: t}) {

  return {
      // inherits: require('babel-plugin-transform-class-properties')
    visitor: {
      Program(path) {
        path.traverse({
          Class(path) {
            let isSubClass = !!path.node.superClass;
            let constructor;
            let props = [];
            let body = path.get("body");
            let privateDecorator=null;
            let instanceBody = [];
            const refs = {};
            for (let subPath of body.get("body")) {
              if (subPath.isClassMethod({ kind: "constructor" })) {
                constructor = subPath;
              } else if (subPath.isClassMethod() && (privateDecorator=findPrivateDecorator(subPath.node))!==false) {
                const id=refs[subPath.node.key.name]||path.scope.generateUidIdentifier(subPath.node.key.name);
                path.insertBefore(t.variableDeclaration('var',[t.variableDeclarator(
                    id,t.newExpression(t.Identifier('WeakMap'),[])
                )]
                ));
                subPath.node.decorators.splice(privateDecorator, 1);
                // move into constructor
                instanceBody.push(
                  t.expressionStatement(
                    t.callExpression(
                      t.memberExpression(
                        id
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
                refs[subPath.node.key.name]=id;
                subPath.remove();
              } else if (subPath.isClassProperty() && subPath.node.decorators && subPath.node.decorators.length > 0) {
                let propNode = subPath.node;
                const privateDecorator=findPrivateDecorator(propNode);
                const id=refs[propNode.key.name]||path.scope.generateUidIdentifier(propNode.key.name);
                if (privateDecorator===false) continue;
                path.insertBefore(
                  t.variableDeclaration(
                    'var'
                  , [
                      t.variableDeclarator(
                        id
                      , t.newExpression(t.Identifier('WeakMap'),[])
                      )
                    ]
                  )
                );
                refs[propNode.key.name]=id;
                if (propNode.value) {
                  instanceBody.push(
                    t.expressionStatement(
                      t.callExpression(
                        t.memberExpression(
                          id
                        , t.Identifier('set')
                        )
                      , [
                          t.thisExpression()
                        , propNode.value
                        ]
                      )
                    )
                  );
                }
                subPath.remove();
              }
            }

            if (instanceBody.length) {
              if (!constructor) {
                let newConstructor = t.classMethod("constructor", t.identifier("constructor"), [], t.blockStatement([]));
                if (isSubClass) {
                  newConstructor.params = [t.restElement(t.identifier("args"))];
                  newConstructor.body.body.push(
                    t.returnStatement(
                      t.callExpression(
                        t.super()
                      , [t.spreadElement(t.identifier("args"))]
                      )
                    )
                  );
                }
                [constructor] = body.unshiftContainer("body", newConstructor);
              }
              for (let node of body.get("body")) {
                node.traverse({
                  ThisExpression(path) {
                    handleRefItems(t,node,path,refs,t.thisExpression(),[])
                  }
                });
              }
              if (isSubClass) {
                let Supers = [];
                constructor.traverse({Super(path) {
                  if (path.parentPath.isCallExpression({ callee: path.node })) {
                    this.push(path.parentPath);
                  }
                }}, Supers);
                for (let Super of Supers) {
                  Super.insertAfter(instanceBody);
                }
              } else {
                constructor.get("body").unshiftContainer("body", instanceBody);
              }
            }
          }
        });
      }
    }
  }
}

function handleRefItems(t,node,path,refs,refExp,known_vars) {
  if (path.parentPath.type==='MemberExpression') {
    if (!refs[path.parent.property.name]) return;
    if (path.parentPath.parentPath.type=="AssignmentExpression") {
      if (path.parentPath.parent.left.type=="MemberExpression") {
        // console.log("Writing setter ",path.parentPath.parent.left.property.name)
        const id=refs[path.parentPath.parent.left.property.name]||path.scope.generateUidIdentifier(path.parentPath.parent.left.property.name);
        path.parentPath.parentPath.parentPath.replaceWith(t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              id
            , t.Identifier('set')
            )
          , [
              path.node
            , path.parentPath.parent.right
            ]
          )
        ));
      } else {
        // console.log("Writing getter ",path.parentPath.parent.left.property.name)
        const id=refs[path.parent.property.name]||path.scope.generateUidIdentifier(path.parent.property.name);

        path.parentPath.replaceWith(t.callExpression(
          t.memberExpression(
            id
          , t.Identifier('get')
          )
        , [
            refExp
          ]
        ));
      }
    } else {
        // console.log("Writing getter ",path.parent.property.name)
        const id=refs[path.parent.property.name]||path.scope.generateUidIdentifier(path.parent.property.name);
        path.parentPath.replaceWith(t.callExpression(
          t.memberExpression(
            id
          , t.Identifier('get')
          )
        , [
            refExp
          ]
        ));
    }
  } else {
    // TODO: Handle non "var" assignment. if "x=this" and x is not defined in a "var" then following it fails.
    if (path.parent.type=="AssignmentExpression") {
      if (path.scope.hasOwnBinding(path.parent.left.name) ) {
        node.traverse({
          ReferencedIdentifier(path) {
            if (this.scope.hasOwnBinding(path.node.name) && known_vars.indexOf(path.node.name)==-1) {
              known_vars.push(path.node.name);
              handleRefItems(t,node,path,refs,path.node,known_vars);
            }
          }}
        , {
            scope: path.parentPath.scope
          }
        );
      } else {
        const id=path.parent.left;
        console.log("Traversing",id);
        node.traverse({
          ReferencedIdentifier(p) {
            console.log(JSON.stringify(p.parent,cleanJSON(),4));
            if (path.node.name!==this.left.name && path.node.name!==this.right.name) return;
            handleRefItems(t,node,p,refs,p.node,known_vars);
          }}
        , {
            scope: path.scope
          , left: path.parent.left
          , right: path.parent.right
          }
        );
      }
    } else
    if (path.parent.type=="VariableDeclarator") {
      node.traverse({
        ReferencedIdentifier(path) {
          if (this.scope.hasOwnBinding(path.node.name)) {
            // known_vars.push(path.node.name);
            handleRefItems(t,node,path,refs,path.node,known_vars);
          }
        }}
      , {
          scope: path.parentPath.scope
        }
      );
    }
  }

}

function findPrivateDecorator(node) {
  var idx=0;
  return (node.decorators || []).some((decorator) => {
    return decorator.expression.name === 'Private'||(++idx&&false);
  })?idx:false;
}

function deleteDecorators(klass, decorators) {
  decorators.forEach((decorator) => {
    var index = klass.decorators.indexOf(decorator);
    if (index >= 0) {
    }
  });
}

function cleanJSON (...fields) {
  var objs=[];
  var fields = [
          'loc',
          'parent',
          'hub',
          'contexts',
          'opts',
          'parentPath',
          'container',
          'parentKey',
          'parentBlock',
        ].concat(fields);
  return function(k,v) {
    if (fields.indexOf(k)>=0) return "[Object]";
      if (objs.indexOf(v)>=0) return "[Circular Reference]";
      if (typeof v === typeof({}) || typeof v === typeof([])) objs.push(v);
      return v;
    }
}
