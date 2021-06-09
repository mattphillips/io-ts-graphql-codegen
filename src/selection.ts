import { OperationDefinitionNode, SelectionNode, NameNode, FieldNode, InlineFragmentNode } from 'graphql';
import {
  ObjectType,
  IoTsType,
  IntersectionType,
  Typename,
  PickType,
  isNamedType,
  ArrayType,
  OptionType,
  UnionType,
  MutationType,
  QueryType,
} from './IoTsType';

export const make = (operation: OperationDefinitionNode, root: QueryType | MutationType): QueryType | MutationType => {
  const go = (node: SelectionNode, lastVisited: IoTsType): IoTsType => {
    if (node.kind === 'Field') {
      const name = getName(node);
      const current = getProps(lastVisited)[name];

      if (current === undefined) {
        throw new Error(`Field: ${name} does not exist on type: ${lastVisited.tag}`);
      }

      const primitiveSelections =
        node.selectionSet?.selections.filter(
          (s): s is FieldNode => s.kind === 'Field' && s.selectionSet === undefined && getName(s) !== '__typename'
        ) || [];

      const nestedSelections =
        node.selectionSet?.selections.filter(
          (s): s is FieldNode => s.kind === 'Field' && s.selectionSet !== undefined
        ) || [];

      const unionSelections =
        node.selectionSet?.selections.filter(
          (s): s is InlineFragmentNode => s.kind === 'InlineFragment' && s.selectionSet !== undefined
        ) || [];

      if (current.tag === 'Named' && current.value.tag === 'Union' && unionSelections.length > 0) {
        const missingCases = current.value.types
          .filter(isNamedType)
          .map((type) => type.name)
          .filter(
            (name) => unionSelections.find((selection) => selection.typeCondition?.name.value === name) === undefined
          );

        if (missingCases.length > 0) {
          throw new Error(
            `Non exhaustive matching on Union: \`${current.name}\`. \n\nMissing cases: \n\t- ${missingCases.join(
              '\n\t- '
            )}`
          );
        }

        return UnionType(unionSelections.map((s) => go(s, current)));
      }

      if (current.tag === 'Scalar') {
        return current;
      }

      if (current.tag === 'Array') {
        return ArrayType(
          IntersectionType([
            Typename(getIoTsName(current.value)),
            PickType(getIoTsName(current.value), ...primitiveSelections.map((s) => getName(s))),
            ...nestedSelections.map((s) => ObjectType({ [getName(s)]: go(s, current.value) })),
          ])
        );
      }

      if (current.tag === 'Option') {
        return OptionType(
          IntersectionType([
            Typename(getIoTsName(current.value)),
            PickType(getIoTsName(current.value), ...primitiveSelections.map((s) => getName(s))),
            ...nestedSelections.map((s) => ObjectType({ [getName(s)]: go(s, current.value) })),
          ])
        );
      }

      if (nestedSelections.length === 0 && primitiveSelections.length === 0) {
        return IntersectionType([Typename(getIoTsName(lastVisited)), PickType(getIoTsName(lastVisited), name)]);
      }

      return IntersectionType([
        Typename(getIoTsName(current)),
        PickType(getIoTsName(current), ...primitiveSelections.map((s) => getName(s))),
        ...nestedSelections.map((s) => ObjectType({ [getName(s)]: go(s, current) })),
      ]);
    }

    if (node.kind === 'InlineFragment') {
      const current =
        lastVisited.tag === 'Named' && lastVisited.value.tag === 'Union'
          ? lastVisited.value.types.find((s) => s.tag === 'Named' && s.name === getName(node.typeCondition))
          : undefined;

      if (current === undefined) {
        throw new Error(`Could not find ${getName(node.typeCondition)} in union type: ${getIoTsName(lastVisited)}`);
      }

      const primitiveSelections =
        node.selectionSet?.selections.filter(
          (s): s is FieldNode => s.kind === 'Field' && s.selectionSet === undefined && getName(s) !== '__typename'
        ) || [];

      const nestedSelections =
        node.selectionSet?.selections.filter(
          (s): s is FieldNode => s.kind === 'Field' && s.selectionSet !== undefined
        ) || [];

      return IntersectionType([
        Typename(getIoTsName(current)),
        PickType(getIoTsName(current), ...primitiveSelections.map((s) => getName(s))),
        ...nestedSelections.map((s) => ObjectType({ [getName(s)]: go(s, current) })),
      ]);
    }

    throw 'not supported yet';
  };

  const TypeConstructor = operation.operation === 'mutation' ? MutationType : QueryType;

  return TypeConstructor(
    getName(operation),
    operation.selectionSet.selections
      .filter(isField)
      .map<[string, IoTsType]>((s) => [getName(s), go(s, root)])
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
  );
};

const getProps = (node: IoTsType) => {
  if (node.tag === 'Mutation' || node.tag === 'Query' || node.tag === 'Object') return node.props;
  if (node.tag === 'Named' && node.value.tag === 'Object') return node.value.props;
  return {};
};

const getIoTsName = (type: IoTsType) => (isNamedType(type) ? type.name : '');
const getName = (node: { name: NameNode } | { name?: { value: string } } | undefined): string =>
  node?.name?.value || '';
const isField = (s: SelectionNode): s is FieldNode => s.kind === 'Field';
