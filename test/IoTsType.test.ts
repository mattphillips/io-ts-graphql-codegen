import {
  EnumTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  UnionTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  parse
} from 'graphql';
import {
  make,
  ScalarType,
  StringType,
  IntType,
  FloatType,
  BooleanType,
  IdType,
  EnumType,
  UnionType,
  ArrayType,
  OptionType,
  ObjectType,
  InputObjectType,
  Named
} from 'src/IoTsType';

describe('Make', () => {
  describe('Scalar', () => {
    it('should return custom scalar type', () => {
      const node = parse(`
        scalar Custom
      `).definitions[0] as ScalarTypeDefinitionNode;

      expect(make(node, new Map())).toEqual(ScalarType('Custom'));
    });
    it('should return String scalar type', () => {
      const node = parse(`
        scalar Custom
      `).definitions[0] as ScalarTypeDefinitionNode;

      expect(make(node, new Map())).toEqual(ScalarType('Custom'));
    });
    it('should return Int scalar type', () => {});
    it('should return Float scalar type', () => {});
    it('should return Boolean scalar type', () => {});
    it('should return ID scalar type', () => {});
  });

  describe('Enum', () => {
    it('should return enum with all members', () => {
      const node = parse(`
      enum Custom {
        ONE
        TWO
      }
    `).definitions[0] as EnumTypeDefinitionNode;
      expect(make(node, new Map())).toEqual(EnumType('Custom', 'ONE', 'TWO'));
    });
  });
  describe('Input', () => {
    it('should return primitive fields object type', () => {
      const node = parse(`
      input PrimitiveFields {
        str: String!
        float: Float!
        bool: Boolean!
        id: ID!
        int: Int!
      }
    `).definitions[0] as ObjectTypeDefinitionNode;
      expect(make(node, new Map())).toEqual(
        InputObjectType('PrimitiveFields', {
          str: StringType,
          float: FloatType,
          bool: BooleanType,
          id: IdType,
          int: IntType
        })
      );
    });

    it('should return custom scalars', () => {
      const { definitions } = parse(`
      scalar Custom
      input CustomFields {
        custom: Custom!
      }
    `);
      expect(
        make(
          definitions[1] as ObjectTypeDefinitionNode,
          new Map([['Custom', definitions[0] as ScalarTypeDefinitionNode]])
        )
      ).toEqual(InputObjectType('CustomFields', { custom: ScalarType('Custom') }));
    });
  });
  describe('Object', () => {
    it('should return primitive fields object type', () => {
      const node = parse(`
      type PrimitiveFields {
        str: String!
        float: Float!
        bool: Boolean!
        id: ID!
        int: Int!
      }
    `).definitions[0] as ObjectTypeDefinitionNode;
      expect(make(node, new Map())).toEqual(
        Named(
          'PrimitiveFields',
          ObjectType({
            str: StringType,
            float: FloatType,
            bool: BooleanType,
            id: IdType,
            int: IntType
          })
        )
      );
    });

    it('should return custom scalars', () => {
      const { definitions } = parse(`
      scalar Custom
      type CustomFields {
        custom: Custom!
      }
    `);
      expect(
        make(
          definitions[1] as ObjectTypeDefinitionNode,
          new Map([['Custom', definitions[0] as ScalarTypeDefinitionNode]])
        )
      ).toEqual(Named('CustomFields', ObjectType({ custom: ScalarType('Custom') })));
    });

    it('should return enums ', () => {
      const { definitions } = parse(`
      enum Custom {
        ONE
        TWO
      }
      type CustomFields {
        custom: Custom!
      }
    `);
      expect(
        make(
          definitions[1] as ObjectTypeDefinitionNode,
          new Map([['Custom', definitions[0] as ScalarTypeDefinitionNode]])
        )
      ).toEqual(Named('CustomFields', ObjectType({ custom: EnumType('Custom', 'ONE', 'TWO') })));
    });

    it('should return custom types ', () => {
      const { definitions } = parse(`
      type Custom {
        str: String!
      }
      type CustomFields {
        custom: Custom!
      }
    `);
      expect(
        make(
          definitions[1] as ObjectTypeDefinitionNode,
          new Map([['Custom', definitions[0] as ScalarTypeDefinitionNode]])
        )
      ).toEqual(Named('CustomFields', ObjectType({ custom: Named('Custom', ObjectType({ str: StringType })) })));
    });

    it('should return optional types ', () => {
      const { definitions } = parse(`
      type CustomFields {
        str: String
      }
    `);
      expect(make(definitions[0] as ObjectTypeDefinitionNode, new Map())).toEqual(
        Named('CustomFields', ObjectType({ str: OptionType(StringType) }))
      );
    });

    it('should return array types ', () => {
      const { definitions } = parse(`
      type CustomFields {
        str: [String!]!
      }
    `);
      expect(make(definitions[0] as ObjectTypeDefinitionNode, new Map())).toEqual(
        Named('CustomFields', ObjectType({ str: ArrayType(StringType) }))
      );
    });

    it('should return optional array', () => {
      const { definitions } = parse(`
      type CustomFields {
        str: [String!]
      }
    `);
      expect(make(definitions[0] as ObjectTypeDefinitionNode, new Map())).toEqual(
        Named('CustomFields', ObjectType({ str: OptionType(ArrayType(StringType)) }))
      );
    });

    it('should return optional array optional value', () => {
      const { definitions } = parse(`
      type CustomFields {
        str: [String]
      }
    `);
      expect(
        make(
          definitions[0] as ObjectTypeDefinitionNode,

          new Map()
        )
      ).toEqual(Named('CustomFields', ObjectType({ str: OptionType(ArrayType(OptionType(StringType))) })));
    });

    it('should return array optional value', () => {
      const { definitions } = parse(`
      type CustomFields {
        str: [String]!
      }
    `);
      expect(make(definitions[0] as ObjectTypeDefinitionNode, new Map())).toEqual(
        Named('CustomFields', ObjectType({ str: ArrayType(OptionType(StringType)) }))
      );
    });

    it('should return union values', () => {
      const { definitions } = parse(`
      type A {
        a: String!
      }

      type B {
        b: String!
      }

      union C = A | B

      type CustomFields {
        c: C!
      }
    `);
      expect(
        make(
          definitions[3] as ObjectTypeDefinitionNode,
          new Map([
            ['A', definitions[0] as ObjectTypeDefinitionNode],
            ['B', definitions[1] as ObjectTypeDefinitionNode],
            ['C', definitions[2] as ObjectTypeDefinitionNode]
          ])
        )
      ).toEqual(
        Named(
          'CustomFields',
          ObjectType({
            c: Named(
              'C',
              UnionType([Named('A', ObjectType({ a: StringType })), Named('B', ObjectType({ b: StringType }))])
            )
          })
        )
      );
    });
  });

  describe('Union', () => {
    it('should return union type', () => {
      const { definitions } = parse(`
      type A {
        a: String!
      }

      type B {
        b: String!
      }

      union C = A | B
    `);
      expect(
        make(
          definitions[2] as UnionTypeDefinitionNode,
          new Map([
            ['A', definitions[0] as ObjectTypeDefinitionNode],
            ['B', definitions[1] as ObjectTypeDefinitionNode]
          ])
        )
      ).toEqual(
        Named('C', UnionType([Named('A', ObjectType({ a: StringType })), Named('B', ObjectType({ b: StringType }))]))
      );
    });
  });
});
