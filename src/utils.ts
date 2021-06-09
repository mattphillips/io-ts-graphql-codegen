import { NameNode, DefinitionNode, OperationDefinitionNode, TypeNode } from 'graphql';
import { IoTsType, QueryType, MutationType } from './IoTsType';

export const getName = ({ name }: { name: NameNode }): string => name.value;

export const isOperationDefinitionNode = (node: DefinitionNode): node is OperationDefinitionNode =>
  node.kind === 'OperationDefinition';

export const capitalizeFirstLetter = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const getQuery = (graph: Array<IoTsType>): QueryType => graph.find((node): node is QueryType => node.tag === 'Query')!;

const getMutation = (graph: Array<IoTsType>): MutationType =>
  graph.find((node): node is MutationType => node.tag === 'Mutation')!;

// NOTE: only supports mutations/queries and there must be present
export const getRoot = (operation: OperationDefinitionNode, graph: Array<IoTsType>): QueryType | MutationType =>
  operation.operation === 'mutation' ? getMutation(graph) : getQuery(graph);

export const getTypeName = (type: TypeNode): string => {
  if (type.kind === 'ListType' || type.kind === 'NonNullType') return getTypeName(type.type);
  return type.name.value;
};
