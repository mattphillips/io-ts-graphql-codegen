import {
  ObjectTypeDefinitionNode,
  UnionTypeDefinitionNode,
  NamedTypeNode,
  EnumTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  TypeNode,
  DefinitionNode,
  ScalarTypeDefinitionNode
} from 'graphql';

export type TypeDefinition =
  | ObjectTypeDefinitionNode
  | UnionTypeDefinitionNode
  | EnumTypeDefinitionNode
  | InputObjectTypeDefinitionNode
  | ScalarTypeDefinitionNode;

type Graph = ReadonlyArray<TypeDefinition>;
type InGraph = ReadonlyArray<TypeDefinition | NamedTypeNode>;
type Visited = Set<TypeDefinition>;
type State = [Visited, Graph];

export const sortGraphTypes = (graph: InGraph): Graph => {
  const goAll = (g: InGraph, initVisited: Visited, initAcc: Graph) =>
    g.reduce<State>(([visited, acc], node) => go(node, visited, acc), [initVisited, initAcc]);

  const go = (node: TypeDefinition | NamedTypeNode, visited: Visited, acc: Graph): State => {
    if ([...visited.values()].some(v => v.name.value === node.name.value)) {
      return [visited, acc];
    }

    if (node.kind === 'ObjectTypeDefinition' && node.fields!.length > 0) {
      const [updatedVisted, updatedAcc] = goAll(
        node.fields?.map(f => getType(f.type)) || [],
        new Set([...visited, node]),
        acc
      );
      return [updatedVisted, updatedAcc.concat(node)];
    }

    if (node.kind === 'UnionTypeDefinition' && node.types!.length > 0) {
      const [updatedVisted, updatedAcc] = goAll(node.types!, new Set([...visited, node]), acc);
      return [updatedVisted, updatedAcc.concat(node)];
    }

    if (node.kind === 'EnumTypeDefinition') {
      return [new Set([...visited.values(), node]), acc.concat(node)];
    }

    if (node.kind === 'InputObjectTypeDefinition') {
      const [updatedVisted, updatedAcc] = goAll(
        node.fields?.map(f => getType(f.type)) || [],
        new Set([...visited, node]),
        acc
      );
      return [updatedVisted, updatedAcc.concat(node)];
    }

    if (node.kind === 'ScalarTypeDefinition') {
      return [new Set([...visited.values(), node]), acc.concat(node)];
    }

    // Check if the current NamedType is an ObjectTypeDefinition or UnionTypeDefinition
    const maybeNode = graph.find(v => v.name.value === node.name.value);

    if (maybeNode !== undefined) {
      return go(maybeNode, visited, acc);
    }

    if (node.kind === 'NamedType') {
      return [visited, acc];
    }

    return [new Set([...visited.values(), node]), acc.concat(node)];
  };

  return goAll(graph, new Set(), [])[1];
};

const getType = (node: TypeNode): NamedTypeNode => {
  switch (node.kind) {
    case 'ListType': {
      return getType(node.type);
    }

    case 'NamedType': {
      return node;
    }

    case 'NonNullType': {
      return getType(node.type);
    }
  }
};

export const isTypeDefinition = (
  node: DefinitionNode
): node is
  | ObjectTypeDefinitionNode
  | UnionTypeDefinitionNode
  | EnumTypeDefinitionNode
  | InputObjectTypeDefinitionNode =>
  node.kind === 'ObjectTypeDefinition' ||
  node.kind === 'UnionTypeDefinition' ||
  node.kind === 'EnumTypeDefinition' ||
  node.kind === 'InputObjectTypeDefinition' ||
  node.kind === 'ScalarTypeDefinition';
