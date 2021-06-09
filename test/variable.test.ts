import { parse, OperationDefinitionNode } from 'graphql';
import {
  OptionType,
  make,
  ScalarType,
  InputObjectType,
  PrimitiveType,
  EnumType,
  DEFAULT_SCALARS,
  isNamedType,
  StringType,
  ArrayType
} from 'src/IoTsType';
import { printVariables } from 'src/print';
import { sortGraphTypes, isTypeDefinition } from 'src/sort';
import { make as makeVariable } from 'src/variable';

const parseOperation = (operation: string) => parse(operation).definitions[0] as OperationDefinitionNode;

// TODO: this might make sense elsewhere
const compileGraph = (schema: string): Map<string, InputObjectType | ScalarType | PrimitiveType | EnumType> => {
  const { definitions } = parse(schema);
  const graph = sortGraphTypes(definitions.filter(isTypeDefinition));
  const namedTypes = graph.reduce((acc, type) => acc.set(type.name.value, type), new Map());
  const ioTsAst = graph.map(n => make(n, namedTypes)).filter(isNamedType);
  const namedInputs = ioTsAst
    .filter(
      (ast): ast is ScalarType | InputObjectType | EnumType =>
        ast.tag === 'Scalar' || ast.tag === 'Input' || ast.tag === 'Enum'
    )
    .reduce(
      (acc, node) => acc.set(node.name, node),
      new Map<string, ScalarType | InputObjectType | PrimitiveType | EnumType>(DEFAULT_SCALARS.entries())
    );

  return namedInputs;
};

const TODO_SCHEMA = `
type Todo {
  id: ID!
  description: String!
}

input TodoInput { 
  description: String!
}

input TodoInputOptionDescription {
  description: String
}

type Mutation {
  primitiveCreate(description: String!): Todo!
  complexCreate(todo: TodoInput!): Todo!
  optionalPrimitiveCreate(description: String): Todo!
  optionalComplexCreate(todo: TodoInput): Todo!
  nestedOptionalComplexCreate(todo: TodoInputOptionDescription!): Todo!
}
`;

const NAMED_TYPES = compileGraph(TODO_SCHEMA);

describe('Variables', () => {
  it('should support primitive required variables', () => {
    const operation = parseOperation(`
      mutation PrimitiveRequired($description: String!) {
        primitiveCreate(description: $description) {
          id
          description
        }
      }
    `);
    const actual = makeVariable(NAMED_TYPES)(operation);

    expect(actual).toEqual(InputObjectType('PrimitiveRequiredMutationVariables', { description: StringType }));
  });

  it('should support required custom input variables', () => {
    const operation = parseOperation(`
      mutation CustomRequired($todo: TodoInput!) {
        complexCreate(todo: $todo) {
          id
          description
        }
      }
    `);
    const actual = makeVariable(NAMED_TYPES)(operation);

    expect(actual).toEqual(
      InputObjectType('CustomRequiredMutationVariables', {
        todo: InputObjectType('TodoInput', { description: StringType })
      })
    );
  });

  it('should support optional primitive variables', () => {
    const operation = parseOperation(`
      mutation PrimitiveOptional($description: String) {
        optionalPrimitiveCreate(description: $description) {
          id
          description
        }
      }
    `);
    const actual = makeVariable(NAMED_TYPES)(operation);

    expect(actual).toEqual(
      InputObjectType('PrimitiveOptionalMutationVariables', { description: OptionType(StringType) })
    );
  });

  it('should support optional custom input variables', () => {
    const operation = parseOperation(`
      mutation CustomOptional($todo: TodoInput) {
        optionalComplexCreate(todo: $todo) {
          id
          description
        }
      }
    `);
    const actual = makeVariable(NAMED_TYPES)(operation);

    expect(actual).toEqual(
      InputObjectType('CustomOptionalMutationVariables', {
        todo: OptionType(InputObjectType('TodoInput', { description: StringType }))
      })
    );
  });

  it('should support nested optional values in custom input variables', () => {
    const operation = parseOperation(`
      mutation CustomNestedOptional($todo: TodoInputOptionDescription!) {
        nestedOptionalComplexCreate(todo: $todo) {
          id
          description
        }
      }
    `);
    const actual = makeVariable(NAMED_TYPES)(operation);

    expect(actual).toEqual(
      InputObjectType('CustomNestedOptionalMutationVariables', {
        todo: InputObjectType('TodoInputOptionDescription', { description: OptionType(StringType) })
      })
    );
  });

  describe('printVariables', () => {
    it('should print primitive required variables', () => {
      expect(printVariables(InputObjectType('Name', { description: StringType }))).toMatchInlineSnapshot(`
        export const Name = t.type({ description: t.string });
        export type Name = t.TypeOf<typeof Name>;

      `);
    });

    it('should support required custom input variables', () => {
      expect(
        printVariables(
          InputObjectType('Name', {
            todo: InputObjectType('TodoInput', { description: StringType })
          })
        )
      ).toMatchInlineSnapshot(`
        export const Name = t.type({ todo: TodoInput });
        export type Name = t.TypeOf<typeof Name>;

      `);
    });

    describe('Optional', () => {
      it('should remove option from optional primitive variables', () => {
        expect(printVariables(InputObjectType('Name', { description: OptionType(StringType) }))).toMatchInlineSnapshot(`
          export const Name = t.type({ description: t.union([t.null, t.string]) });
          export type Name = t.TypeOf<typeof Name>;

        `);
      });

      it('should remove option from optional array primitive variables', () => {
        expect(printVariables(InputObjectType('Name', { description: ArrayType(OptionType(StringType)) })))
          .toMatchInlineSnapshot(`
          export const Name = t.type({
            description: t.array(t.union([t.null, t.string])),
          });
          export type Name = t.TypeOf<typeof Name>;

        `);
      });

      it('should remove option from optional custom input variables', () => {
        expect(
          printVariables(
            InputObjectType('Name', {
              todo: OptionType(InputObjectType('TodoInput', { description: StringType }))
            })
          )
        ).toMatchInlineSnapshot(`
          export const Name = t.type({ todo: t.union([t.null, TodoInput]) });
          export type Name = t.TypeOf<typeof Name>;

        `);
      });

      it('should remove option from optional array custom input variables', () => {
        expect(
          printVariables(
            InputObjectType('Name', {
              todo: ArrayType(OptionType(InputObjectType('TodoInput', { description: StringType })))
            })
          )
        ).toMatchInlineSnapshot(`
          export const Name = t.type({ todo: t.array(t.union([t.null, TodoInput])) });
          export type Name = t.TypeOf<typeof Name>;

        `);
      });
    });
  });
});
