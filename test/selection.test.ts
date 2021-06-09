import { parse, OperationDefinitionNode } from 'graphql';
import {
  IntersectionType,
  ObjectType,
  Typename,
  PickType,
  ArrayType,
  OptionType,
  UnionType,
  make,
  ScalarType,
  QueryType,
  MutationType
} from 'src/IoTsType';
import { sortGraphTypes, isTypeDefinition } from 'src/sort';
import { make as makeSelection } from 'src/selection';
import { getRoot } from 'src/utils';

const parseOperation = (operation: string) => parse(operation).definitions[0] as OperationDefinitionNode;

// TODO: this might make sense elsewhere
const compileGraph = (schema: string) => {
  const { definitions } = parse(schema);
  const sortedGraph = sortGraphTypes(definitions.filter(isTypeDefinition));
  const namedTypes = sortedGraph.reduce((acc, type) => acc.set(type.name.value, type), new Map());
  const ioTsGraph = sortedGraph.map(n => make(n, namedTypes));
  return ioTsGraph;
};

const TODO_SCHEMA = `
type Todo {
  id: ID!
  description: String!
  author: Author!
  lastUpdated: LastUpdated!
  unit: Unit!
}

scalar Unit

type Author {
  name: String!
  address: Address!
}

type Address {
  postcode: String!
}

union LastUpdated = Today | Never

type Today {
  date: String!
  dayOfWeek: DayOfWeek!
}

union DayOfWeek = Monday | Tuesday

type Monday {
  day: Int!
}

type Tuesday {
  day: Int!
}

type Never {
  creation: String!
}

type Query {
  todo: Todo!
  todos: [Todo!]!
  headTodo: Todo
  todoIncAddress: Address!
  unit: Unit!
}

type Mutation {
  update(id: ID!, todo: TodoInput!): UpdateResponse!
}

union UpdateResponse = Todo | Error

type Error {
  message: String!
}
`;

describe('Selections', () => {
  it('should set typename on given object when typename is not present in query', () => {
    const operation = parseOperation(`
      query Todo {
        todo {
          id
        }
      }
    `);
    const actual = makeSelection(operation, getRoot(operation, compileGraph(TODO_SCHEMA)));

    expect(actual).toEqual(QueryType('Todo', { todo: IntersectionType([Typename('Todo'), PickType('Todo', 'id')]) }));
  });

  it('should return custom scalars at the root level', () => {
    const operation = parseOperation(`
    query DoNothing {
      unit
    }
  `);
    const actual = makeSelection(operation, getRoot(operation, compileGraph(TODO_SCHEMA)));

    expect(actual).toEqual(QueryType('DoNothing', { unit: ScalarType('Unit') }));
  });

  it('should return custom scalars at the root level', () => {
    const operation = parseOperation(`
      query Todo {
        todo {
          id
          unit
        }
      }
    `);
    const actual = makeSelection(operation, getRoot(operation, compileGraph(TODO_SCHEMA)));

    expect(actual).toEqual(
      QueryType('Todo', { todo: IntersectionType([Typename('Todo'), PickType('Todo', 'id', 'unit')]) })
    );
  });

  it('should not set typename as a Pick on given object when typename is present in query', () => {
    const operation = parseOperation(`
      query Todo {
        todo {
          __typename
          id
        }
      }
    `);
    const actual = makeSelection(operation, getRoot(operation, compileGraph(TODO_SCHEMA)));
    expect(actual).toEqual(QueryType('Todo', { todo: IntersectionType([Typename('Todo'), PickType('Todo', 'id')]) }));
  });

  it('should return multiple selections in one codec', () => {
    const operation = parseOperation(`
      query Todos {
        todo {
          id
        }
        todoIncAddress {
          postcode
        }
      }
    `);
    const actual = makeSelection(operation, getRoot(operation, compileGraph(TODO_SCHEMA)));
    expect(actual).toEqual(
      QueryType('Todos', {
        todo: IntersectionType([Typename('Todo'), PickType('Todo', 'id')]),
        todoIncAddress: IntersectionType([Typename('Address'), PickType('Address', 'postcode')])
      })
    );
  });

  it('should wrap list values in array', () => {
    const operation = parseOperation(`
      query Todos {
        todos {
          id
        }
      }
    `);
    const actual = makeSelection(operation, getRoot(operation, compileGraph(TODO_SCHEMA)));
    expect(actual).toEqual(
      QueryType('Todos', { todos: ArrayType(IntersectionType([Typename('Todo'), PickType('Todo', 'id')])) })
    );
  });

  it('should wrap list with nested selections values in array', () => {
    const operation = parseOperation(`
      query Todos {
        todos {
          id
          author {
            name
          }
        }
      }
    `);
    const actual = makeSelection(operation, getRoot(operation, compileGraph(TODO_SCHEMA)));
    expect(actual).toEqual(
      QueryType('Todos', {
        todos: ArrayType(
          IntersectionType([
            Typename('Todo'),
            PickType('Todo', 'id'),
            ObjectType({ author: IntersectionType([Typename('Author'), PickType('Author', 'name')]) })
          ])
        )
      })
    );
  });

  it('should wrap optional values in option', () => {
    const operation = parseOperation(`
      query HeadTodo {
        headTodo {
          id
        }
      }
    `);
    const actual = makeSelection(operation, getRoot(operation, compileGraph(TODO_SCHEMA)));
    expect(actual).toEqual(
      QueryType('HeadTodo', { headTodo: OptionType(IntersectionType([Typename('Todo'), PickType('Todo', 'id')])) })
    );
  });

  it('should wrap optional with nested selections values in option', () => {
    const operation = parseOperation(`
      query Todos {
        headTodo {
          id
          author {
            name
          }
        }
      }
    `);
    const actual = makeSelection(operation, getRoot(operation, compileGraph(TODO_SCHEMA)));
    expect(actual).toEqual(
      QueryType('Todos', {
        headTodo: OptionType(
          IntersectionType([
            Typename('Todo'),
            PickType('Todo', 'id'),
            ObjectType({ author: IntersectionType([Typename('Author'), PickType('Author', 'name')]) })
          ])
        )
      })
    );
  });

  it('should return nested selection as an ObjectType on the given prop', () => {
    const operation = parseOperation(`
      query Todo {
        todo {
          id
          author {
            name
          }
        }
      }
    `);
    const actual = makeSelection(operation, getRoot(operation, compileGraph(TODO_SCHEMA)));

    expect(actual).toEqual(
      QueryType('Todo', {
        todo: IntersectionType([
          Typename('Todo'),
          PickType('Todo', 'id'),

          ObjectType({ author: IntersectionType([Typename('Author'), PickType('Author', 'name')]) })
        ])
      })
    );
  });

  it('should return nested selection two levels deep as an ObjectType on the given prop', () => {
    const operation = parseOperation(`
      query Todo {
        todo {
          id
          author {
            name
            address {
              postcode
            }
          }
        }
      }
    `);
    const actual = makeSelection(operation, getRoot(operation, compileGraph(TODO_SCHEMA)));
    expect(actual).toEqual(
      QueryType('Todo', {
        todo: IntersectionType([
          Typename('Todo'),
          PickType('Todo', 'id'),

          ObjectType({
            author: IntersectionType([
              Typename('Author'),
              PickType('Author', 'name'),

              ObjectType({ address: IntersectionType([Typename('Address'), PickType('Address', 'postcode')]) })
            ])
          })
        ])
      })
    );
  });

  it('should throw an error when union selection is not exhaustive', () => {
    const operation = parseOperation(`
      mutation UpdateTodo($id: ID!, $todo: TodoInput!) {
        update(id: $id, todo: $todo) {
          ... on Error {
            message
          }
        }
      }
    `);

    expect(() => makeSelection(operation, getRoot(operation, compileGraph(TODO_SCHEMA)))).toThrowError();
  });

  it('should return union selections', () => {
    const operation = parseOperation(`
      mutation UpdateTodo($id: ID!, $todo: TodoInput!) {
        update(id: $id, todo: $todo) {
          ... on Todo {
            id
            description
          }
          ... on Error {
            message
          }
        }
      }
    `);
    const actual = makeSelection(operation, getRoot(operation, compileGraph(TODO_SCHEMA)));
    expect(actual).toEqual(
      MutationType('UpdateTodo', {
        update: UnionType([
          IntersectionType([Typename('Todo'), PickType('Todo', 'id', 'description')]),
          IntersectionType([Typename('Error'), PickType('Error', 'message')])
        ])
      })
    );
  });

  it('should return nested union selections', () => {
    const operation = parseOperation(`
      query Todo {
        todo {
          id
          lastUpdated {
            ... on Today {
              date
            }
            ... on Never {
              creation
            }
          }
        }
      }
    `);
    const actual = makeSelection(operation, getRoot(operation, compileGraph(TODO_SCHEMA)));
    expect(actual).toEqual(
      QueryType('Todo', {
        todo: IntersectionType([
          Typename('Todo'),
          PickType('Todo', 'id'),
          ObjectType({
            lastUpdated: UnionType([
              IntersectionType([Typename('Today'), PickType('Today', 'date')]),
              IntersectionType([Typename('Never'), PickType('Never', 'creation')])
            ])
          })
        ])
      })
    );
  });

  it('should return nested union selections', () => {
    const operation = parseOperation(`
      query Todo {
        todo {
          id
          lastUpdated {
            ... on Today {
              date
              dayOfWeek {
                ... on Monday {
                  day
                }

                ... on Tuesday {
                  day
                }
              }
            }
            ... on Never {
              creation
            }
          }
        }
      }
    `);
    const actual = makeSelection(operation, getRoot(operation, compileGraph(TODO_SCHEMA)));
    expect(actual).toEqual(
      QueryType('Todo', {
        todo: IntersectionType([
          Typename('Todo'),
          PickType('Todo', 'id'),
          ObjectType({
            lastUpdated: UnionType([
              IntersectionType([
                Typename('Today'),
                PickType('Today', 'date'),
                ObjectType({
                  dayOfWeek: UnionType([
                    IntersectionType([Typename('Monday'), PickType('Monday', 'day')]),
                    IntersectionType([Typename('Tuesday'), PickType('Tuesday', 'day')])
                  ])
                })
              ]),
              IntersectionType([Typename('Never'), PickType('Never', 'creation')])
            ])
          })
        ])
      })
    );
  });
});
