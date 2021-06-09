import { TypeNode } from 'graphql';
import { TypeDefinition } from './sort';

export type IoTsType =
  | IntersectionType
  | UnionType
  | ObjectType
  | LiteralType
  | PickType
  | ArrayType
  | EnumType
  | OptionType
  | ScalarType
  | PrimitiveType
  | InputObjectType
  | QueryType
  | MutationType
  | Named<UnionType>
  | Named<ObjectType>;

export type IntersectionType = { tag: 'Intersection'; types: Array<IoTsType> };
export const IntersectionType = (types: Array<IoTsType>): IntersectionType => ({ tag: 'Intersection', types });

export type UnionType = { tag: 'Union'; types: Array<IoTsType> };
export const UnionType = (types: Array<IoTsType>): UnionType => ({
  tag: 'Union',
  types,
});

export type ObjectType = { tag: 'Object'; props: Record<string, IoTsType> };
export const ObjectType = (props: Record<string, IoTsType>): ObjectType => ({
  tag: 'Object',
  props,
});

export type Named<A extends UnionType | ObjectType> = { tag: 'Named'; value: A; name: string };
export const Named = <A extends UnionType | ObjectType>(name: string, value: A): Named<A> => ({
  tag: 'Named',
  name,
  value,
});

export type InputObjectType = { tag: 'Input'; props: Record<string, IoTsType>; name: string };
export const InputObjectType = (name: string, props: Record<string, IoTsType>): InputObjectType => ({
  tag: 'Input',
  props,
  name,
});

export type QueryType = { tag: 'Query'; props: Record<string, IoTsType>; name: string };
export const QueryType = (name: string, props: Record<string, IoTsType>): QueryType => ({
  tag: 'Query',
  props,
  name,
});

export type MutationType = { tag: 'Mutation'; props: Record<string, IoTsType>; name: string };
export const MutationType = (name: string, props: Record<string, IoTsType>): MutationType => ({
  tag: 'Mutation',
  props,
  name,
});

export type LiteralType = { tag: 'Literal'; value: string };
export const LiteralType = (value: string): LiteralType => ({ tag: 'Literal', value });

export type ArrayType = { tag: 'Array'; value: IoTsType };
export const ArrayType = (value: IoTsType): ArrayType => ({ tag: 'Array', value });

export type ScalarType = { tag: 'Scalar'; name: string };
export const ScalarType = (name: string): ScalarType => ({ tag: 'Scalar', name });

export type StringType = { tag: 'String' };
export const StringType: StringType = { tag: 'String' };

export type IntType = { tag: 'Int' };
export const IntType: IntType = { tag: 'Int' };

export type BooleanType = { tag: 'Boolean' };
export const BooleanType: BooleanType = { tag: 'Boolean' };

export type FloatType = { tag: 'Float' };
export const FloatType: FloatType = { tag: 'Float' };

export type IdType = { tag: 'ID' };
export const IdType: IdType = { tag: 'ID' };

export type PrimitiveType = StringType | IntType | BooleanType | FloatType | IdType;

export const isPrimitive = (ast: IoTsType): ast is PrimitiveType =>
  ast.tag === 'String' || ast.tag === 'Boolean' || ast.tag === 'Int' || ast.tag === 'ID' || ast.tag === 'Float';

export type EnumType = { tag: 'Enum'; cases: Array<string>; name: string };
export const EnumType = (name: string, ...cases: Array<string>): EnumType => ({
  tag: 'Enum',
  cases,
  name,
});

export type OptionType = { tag: 'Option'; value: IoTsType };
export const OptionType = (value: IoTsType): OptionType => ({ tag: 'Option', value });

export type PickType = { tag: 'Pick'; type: string; fields: Array<string> };
export const PickType = (type: string, ...fields: Array<string>): PickType => ({ tag: 'Pick', type, fields });

export type NamedType =
  | Named<UnionType>
  | Named<ObjectType>
  | EnumType
  | ScalarType
  | InputObjectType
  | QueryType
  | MutationType;

export const Typename = (name: string): Named<ObjectType> => Named(name, ObjectType({}));

export const isNamedType = (type: IoTsType): type is NamedType =>
  type.tag === 'Named' ||
  type.tag === 'Object' ||
  type.tag === 'Scalar' ||
  type.tag === 'Enum' ||
  type.tag === 'Input' ||
  type.tag === 'Query' ||
  type.tag === 'Mutation';

export const DEFAULT_SCALARS = new Map<string, PrimitiveType>([
  ['ID', IdType],
  ['String', StringType],
  ['Boolean', BooleanType],
  ['Int', IntType],
  ['Float', FloatType],
]);
export const make = (node: TypeDefinition, namedTypes: Map<string, TypeDefinition>): IoTsType => {
  const name = node.name.value;
  const getScalar = (name: string) => {
    if (DEFAULT_SCALARS.has(name)) {
      return DEFAULT_SCALARS.get(name)!;
    }

    // TODO: this could fail
    return make(namedTypes.get(name)!, namedTypes);
  };

  const getType = (type: TypeNode, required = false): IoTsType => {
    switch (type.kind) {
      case 'ListType': {
        if (required) {
          return ArrayType(getType(type.type));
        }
        return OptionType(ArrayType(getType(type.type)));
      }

      case 'NonNullType': {
        return getType(type.type, true);
      }

      case 'NamedType': {
        const t = getScalar(type.name.value);
        if (required) {
          return t;
        }
        return OptionType(t);
      }
    }
  };

  switch (node.kind) {
    case 'EnumTypeDefinition': {
      return EnumType(node.name.value, ...(node.values?.map((v) => v.name.value) || []));
    }

    case 'ObjectTypeDefinition': {
      const props =
        node.fields?.reduce(
          (acc, field) => ({ ...acc, [field.name.value]: getType(field.type) }),
          {} as Record<string, IoTsType>
        ) || {};

      if (name === 'Query') return QueryType(name, props);
      if (name === 'Mutation') return MutationType(name, props);
      return Named(name, ObjectType(props));
    }

    case 'InputObjectTypeDefinition': {
      return InputObjectType(
        name,
        node.fields?.reduce(
          (acc, field) => ({ ...acc, [field.name.value]: getType(field.type) }),
          {} as Record<string, IoTsType>
        ) || {}
      );
    }

    case 'ScalarTypeDefinition': {
      return ScalarType(name);
    }

    case 'UnionTypeDefinition': {
      return Named(
        name,
        UnionType(
          node.types?.map((t) => {
            const type = namedTypes.get(t.name.value);
            if (type === undefined) {
              throw new Error(`Could not find type definition with name: ${t.name.value}`);
            }
            return make(type, namedTypes);
          }) || []
        )
      );
    }
  }
};
