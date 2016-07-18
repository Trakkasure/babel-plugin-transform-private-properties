export default class PrivateProperties {
  constructor(types) {
    this.types = types;
  }

  run(klass) {
    // Process only if `@autoAssign` decorator exists.
    const decorators = this.findautoAssignDecorators(klass);
    if (decorators.length > 0) {
      // Get constructor and its paremeters.
      const ctor = this.findConstructor(klass);
      const args = this.getArguments(ctor);
      // Prepend assignment statements to the constructor.
      this.prependAssignments(ctor, args);
      // Delete `@autoAssign`.
      this.deleteDecorators(klass, decorators);
    }
  }

  findautoAssignDecorators(klass) {
    return (klass.decorators || []).filter((decorator) => {
      return decorator.expression.name === 'autoAssign';
    });
  }

  deleteDecorators(klass, decorators) {
    decorators.forEach((decorator) => {
      const index = klass.decorators.indexOf(decorator);
      if (index >= 0) {
        klass.decorators.splice(index, 1);
      }
    });
  }

  findConstructor(klass) {
    return klass.body.body.filter((body) => {
      return body.kind === 'constructor';
    })[0];
  }

  getArguments(ctor) {
    return ctor.value.params;
  }

  prependAssignments(ctor, args) {
    const body = ctor.value.body.body;
    args.slice().reverse().forEach((arg) => {
      const assignment = this.buildAssignment(arg);
      body.unshift(assignment);
    });
  }

  buildAssignment(arg) {
    const self = this.types.identifier('this');
    const prop = this.types.memberExpression(self, arg);
    const assignment = this.types.assignmentExpression('=', prop, arg);
    return this.types.expressionStatement(assignment);
  }
}
