import {
  IntersectionType,
  ObjectType,
  Typename,
  UnionType,
  Named,
  QueryType,
  MutationType,
  ArrayType,
  ScalarType,
  PickType,
  StringType,
  IntType,
  LiteralType,
  InputObjectType,
  OptionType,
  FloatType,
  BooleanType,
  IdType
} from 'src/IoTsType';
import { print, printNamedType } from 'src/print';

describe('Print', () => {
  describe('Array', () => {
    it('should return named values inlined with name', () => {
      expect(print(ArrayType(ScalarType('Named')))).toEqual('t.array(Named)');
    });

    it('should return non-named values completely inlined', () => {
      expect(print(ArrayType(PickType('Named', 'a')))).toEqual("t.array(Pick(Named.props, 'a'))");
    });
  });

  describe('Intersection', () => {
    it('should return intersection types inlined', () => {
      expect(print(IntersectionType([StringType, IntType]))).toEqual(`t.intersection([t.string, t.number])`);
    });

    it('should return types inlined when given types list size === 5', () => {
      expect(print(IntersectionType([StringType, IntType, BooleanType, FloatType, IdType]))).toEqual(
        `t.intersection([t.string, t.number, t.boolean, t.number, t.string])`
      );
    });

    it('should return nested intersections when given type list size === 7 with a max size of 5 types per intersection', () => {
      expect(
        print(IntersectionType([StringType, StringType, StringType, StringType, StringType, StringType, StringType]))
      ).toEqual(
        `t.intersection([t.intersection([t.string, t.string, t.string, t.string, t.string]), t.intersection([t.string, t.string])])`
      );
    });
    it('should return nested intersections when given type list size === 6 with a max size of 4 types per intersection', () => {
      expect(print(IntersectionType([StringType, StringType, StringType, StringType, StringType, StringType]))).toEqual(
        `t.intersection([t.intersection([t.string, t.string, t.string, t.string]), t.intersection([t.string, t.string])])`
      );
    });

    it('should return nested intersections when given type list size is greater than 5', () => {
      expect(
        print(
          IntersectionType([
            StringType,
            StringType,
            StringType,
            StringType,
            StringType,
            StringType,
            StringType,
            StringType,
            StringType,
            StringType,
            StringType,
            StringType
          ])
        )
      ).toEqual(
        `t.intersection([t.intersection([t.string, t.string, t.string, t.string, t.string]), t.intersection([t.string, t.string, t.string, t.string, t.string]), t.intersection([t.string, t.string])])`
      );
    });
  });

  describe('Literal', () => {
    it('should render literal with given value', () => {
      expect(print(LiteralType('Value'))).toEqual(`t.literal('Value')`);
    });
  });

  describe.each`
    type          | fn
    ${'Query'}    | ${QueryType}
    ${'Mutation'} | ${MutationType}
    ${'Input'}    | ${InputObjectType}
  `('$type', ({ fn }) => {
    it('should inline non-named types', () => {
      expect(print(fn('', { a: LiteralType('A') }))).toMatchSnapshot();
    });

    it('should inline named types name value', () => {
      expect(print(fn('', { a: ScalarType('A') }))).toMatchSnapshot();
    });
  });

  describe('ObjectType', () => {
    it('should inline non-named types', () => {
      expect(print(ObjectType({ a: LiteralType('A') }))).toMatchSnapshot();
    });

    it('should inline named types name value', () => {
      expect(print(ObjectType({ a: ScalarType('A') }))).toMatchSnapshot();
    });
  });

  describe('Pick', () => {
    it('should return selection inlined', () => {
      expect(print(PickType('Named', 'a'))).toEqual("Pick(Named.props, 'a')");
    });
  });

  describe('Scalar', () => {
    it('should return any codec', () => {
      expect(print(ScalarType('A'))).toEqual('t.any');
    });
  });

  describe('Option', () => {
    it('should return named values inlined with name', () => {
      expect(print(OptionType(ScalarType('Named')))).toEqual('optionFromNullable(Named)');
    });

    it('should return non-named values completely inlined', () => {
      expect(print(OptionType(PickType('Named', 'a')))).toEqual("optionFromNullable(Pick(Named.props, 'a'))");
    });
  });

  describe('String', () => {
    it('should return string codec', () => {
      expect(print(StringType)).toEqual('t.string');
    });
  });

  describe('Float', () => {
    it('should return number codec', () => {
      expect(print(FloatType)).toEqual('t.number');
    });
  });

  describe('Boolean', () => {
    it('should return boolean codec', () => {
      expect(print(BooleanType)).toEqual('t.boolean');
    });
  });

  describe('ID', () => {
    it('should return string codec', () => {
      expect(print(IdType)).toEqual('t.string');
    });
  });

  describe('Int', () => {
    it('should return number codec', () => {
      expect(print(IntType)).toEqual('t.number');
    });
  });

  describe('Union', () => {
    it('should return unions inlined', () => {
      expect(print(UnionType([IntersectionType([Typename('Test')]), IntersectionType([Typename('Test2')])])))
        .toMatchInlineSnapshot(`
        t.union([
          t.intersection([
            t.type({
              __typename: t.literal("Test"),
            }),
          ]),
          t.intersection([
            t.type({
              __typename: t.literal("Test2"),
            }),
          ]),
        ]);

      `);
    });
    it('should return unions named types names inline', () => {
      expect(print(UnionType([ScalarType('A'), ScalarType('B')]))).toMatchInlineSnapshot(`
        t.union([A, B]);

      `);
    });

    it('should return nested unions', () => {
      expect(
        print(
          Named(
            'Blah',
            ObjectType({
              blah: UnionType([IntersectionType([Typename('Test')]), IntersectionType([Typename('Test2')])])
            })
          )
        )
      ).toMatchInlineSnapshot(`
        t.type({
          __typename: t.literal("Blah"),
          blah: t.union([
            t.intersection([
              t.type({
                __typename: t.literal("Test"),
              }),
            ]),
            t.intersection([
              t.type({
                __typename: t.literal("Test2"),
              }),
            ]),
          ]),
        });

      `);
    });
  });

  describe('Named', () => {
    describe('Union', () => {
      it('should return unions without name', () => {
        expect(print(Named('Ignored', UnionType([ScalarType('A'), ScalarType('B')])))).toEqual(`t.union([A, B])`);
      });
    });

    describe('ObjectType', () => {
      it('should inline non-named types with __typename', () => {
        expect(print(Named('Alphabet', ObjectType({ a: LiteralType('A') })))).toMatchSnapshot();
      });

      it('should inline named types name value with __typename', () => {
        expect(print(Named('Alphabet', ObjectType({ a: ScalarType('A') })))).toMatchSnapshot();
      });
    });
  });

  describe('printNamedType', () => {
    describe('InputType', () => {
      it('should remove option types with null union on primitives', () => {
        expect(printNamedType(InputObjectType('Name', { a: OptionType(StringType) }))).toMatchSnapshot();
      });

      it('should remove option types with null union on array primitives', () => {
        expect(printNamedType(InputObjectType('Name', { a: ArrayType(OptionType(StringType)) }))).toMatchSnapshot();
      });

      it('should remove option types with null union on custom inputs', () => {
        expect(
          printNamedType(InputObjectType('Name', { a: OptionType(InputObjectType('A', { b: StringType })) }))
        ).toMatchSnapshot();
      });
    });
  });
});
