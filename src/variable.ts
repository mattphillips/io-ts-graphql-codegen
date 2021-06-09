import { OperationDefinitionNode, TypeNode } from 'graphql';
import { InputObjectType, ScalarType, PrimitiveType, EnumType, IoTsType, ArrayType, OptionType } from './IoTsType';
import { capitalizeFirstLetter, getName } from './utils';

export const make = (namedInputs: Map<string, InputObjectType | ScalarType | PrimitiveType | EnumType>) => (
  node: OperationDefinitionNode
): InputObjectType => {
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
        // TODO: this could fail
        const t = namedInputs.get(type.name.value)!;
        if (required) {
          return t;
        }
        return OptionType(t);
      }
    }
  };

  return InputObjectType(
    `${node.name?.value}${capitalizeFirstLetter(node.operation)}Variables`,
    node.variableDefinitions?.reduce(
      (acc, def) => ({
        ...acc,
        [getName(def.variable)]: getType(def.type),
      }),
      {}
    ) || {}
  );
};
