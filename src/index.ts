import { Types } from '@graphql-codegen/plugin-helpers';
import { GraphQLSchema, printSchema, parse, DefinitionNode } from 'graphql';
import { format } from 'prettier';

import { renderHelpers } from './helpers';
import { make, isNamedType, InputObjectType, ScalarType, PrimitiveType, DEFAULT_SCALARS, EnumType } from './IoTsType';
import { printNamedType, printSelection, printVariables } from './print';
import { make as makeSelection } from './selection';
import { sortGraphTypes, isTypeDefinition } from './sort';
import { isOperationDefinitionNode, getRoot } from './utils';
import { make as makeVariable } from './variable';

export const plugin = (schema: GraphQLSchema, documents: Types.DocumentFile[]): string => {
  const printedSchema = printSchema(schema);
  const { definitions } = parse(printedSchema);

  const documentDefinitions = documents
    .reduce<ReadonlyArray<DefinitionNode>>((acc, { document }) => [...acc, ...document!.definitions], [])
    .filter(isOperationDefinitionNode);

  const graph = sortGraphTypes(definitions.filter(isTypeDefinition));
  const namedTypes = graph.reduce((acc, type) => acc.set(type.name.value, type), new Map());
  const ioTsAst = graph.map((n) => make(n, namedTypes)).filter(isNamedType);

  const selections = documentDefinitions.map((def) => makeSelection(def, getRoot(def, ioTsAst)));

  const namedInputs = ioTsAst
    .filter(
      (ast): ast is ScalarType | InputObjectType | EnumType =>
        ast.tag === 'Scalar' || ast.tag === 'Input' || ast.tag === 'Enum'
    )
    .reduce(
      (acc, node) => acc.set(node.name, node),
      new Map<string, ScalarType | InputObjectType | PrimitiveType | EnumType>(DEFAULT_SCALARS.entries())
    );

  const variables = documentDefinitions.filter(isOperationDefinitionNode).map(makeVariable(namedInputs));

  return format(
    `
    ${renderHelpers}

    ${ioTsAst.map(printNamedType).join('\n')}

    ${variables.map(printVariables).join('\n')}

    ${selections.map(printSelection).join('\n')}
  `,
    { parser: 'typescript', printWidth: 120 }
  );
};
