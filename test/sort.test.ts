import { parse } from 'graphql';
import { sortGraphTypes, isTypeDefinition } from 'src/sort';

describe('Direct Graph', () => {
  it('should render graph correctly', () => {
    const ast = parse(`
      type Todo {
        id: String!
        owner: Person!
        status: Status!
        union: U
        scalar: Custom!
      }

      enum Status {
        BACKLOG
        WIP
        DONE
      }

      union U = A | B

      type Person {
        name: String!
      }

      scalar Custom

      type A {
        a: String!
      }

      type B {
        b: String!
      }
    `);

    const actual = sortGraphTypes(ast.definitions.filter(isTypeDefinition));
    expect({ ...ast, definitions: actual }).toMatchInlineSnapshot(`
      type Person {
        name: String!
      }

      enum Status {
        BACKLOG
        WIP
        DONE
      }

      type A {
        a: String!
      }

      type B {
        b: String!
      }

      union U = A | B

      scalar Custom

      type Todo {
        id: String!
        owner: Person!
        status: Status!
        union: U
        scalar: Custom!
      }

    `);
  });
});
