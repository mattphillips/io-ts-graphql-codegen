import { IoTsType, NamedType, isNamedType, InputObjectType, MutationType, QueryType, OptionType } from './IoTsType';

const chunkArray = <A>(n: number, as: Array<A>): Array<Array<A>> =>
  as.reduce((acc, a) => {
    const tail = acc[acc.length - 1];

    if (tail && tail.length < n) {
      return [...acc.slice(0, acc.length - 1), [...tail, a]];
    }
    return [...acc, [a]];
  }, [] as Array<Array<A>>);

const mkPrinter = (optionPrinter: (ast: OptionType) => string) => (ast: IoTsType): string => {
  const print = mkPrinter(optionPrinter);

  switch (ast.tag) {
    case 'Array': {
      if (isNamedType(ast.value)) return `t.array(${ast.value.name})`;
      return `t.array(${print(ast.value)})`;
    }

    // NOTE: Currently this doesn't support > 25 types
    case 'Intersection': {
      if (ast.types.length > 5) {
        const chunks = ast.types.length % 5 === 1 ? 4 : 5;
        return `t.intersection([${chunkArray(chunks, ast.types)
          .map(types => `t.intersection([${types.map(print).join(', ')}])`)
          .join(', ')}])`;
      }
      return `t.intersection([${ast.types.map(print).join(', ')}])`;
    }
    case 'Literal': {
      return `t.literal('${ast.value}')`;
    }
    case 'Object':
    case 'Query':
    case 'Mutation':
    case 'Input': {
      return `t.type({ ${Object.entries(ast.props)
        .map(([key, value]) => {
          if (isNamedType(value) && value.name !== '') return `${key}: ${value.name}`;
          return `${key}: ${print(value)}`;
        })
        .join(',\n')}})`;
    }
    case 'Pick': {
      return `Pick(${ast.type}.props, ${ast.fields.map(f => `'${f}'`).join(',')})`;
    }
    case 'Union': {
      return `t.union([${ast.types
        .map(n => {
          if (isNamedType(n)) return n.name;
          return print(n);
        })
        .join(', ')}])`;
    }
    case 'Scalar': {
      return 't.any';
    }
    case 'Option': {
      return optionPrinter(ast);
    }
    case 'Enum': {
      if (ast.cases.length === 1) return `t.literal('${ast.cases[0]}')`;
      return `t.union([${ast.cases.map(c => `t.literal('${c}')`).join(',')}])`;
    }
    case 'String': {
      return 't.string';
    }
    case 'Int': {
      // TODO: should this be t.Int?
      return 't.number';
    }
    case 'Float': {
      return 't.number';
    }
    case 'Boolean': {
      return 't.boolean';
    }
    case 'ID': {
      return 't.string';
    }
    case 'Named': {
      if (ast.value.tag === 'Object') {
        return `t.type({ 
          __typename: t.literal('${ast.name}'),
          ${Object.entries(ast.value.props)
            .map(([key, value]) => {
              if (isNamedType(value) && value.name !== '') return `${key}: ${value.name}`;
              return `${key}: ${print(value)}`;
            })
            .join(',\n')}
        })`;
      }
      return print(ast.value);
    }
  }
};

export const print = mkPrinter((ast: OptionType): string => {
  if (isNamedType(ast.value)) return `optionFromNullable(${ast.value.name})`;
  return `optionFromNullable(${print(ast.value)})`;
});

export const printNamedType = (ast: NamedType): string => {
  if (ast.tag === 'Input') return printVariables(ast);
  return `
    export const ${ast.name} = ${print(ast)};
    export type ${ast.name} = t.TypeOf<typeof ${ast.name}>;
  `;
};

export const printSelection = (ast: MutationType | QueryType): string =>
  `
    export const ${ast.name}${ast.tag} = t.type({ data: ${print(ast)} });
    export type ${ast.name}${ast.tag} = t.TypeOf<typeof ${ast.name}${ast.tag}>['data'];
  `;

export const printVariables = (ast: InputObjectType): string => {
  const optionPrinter = (ast: OptionType): string => {
    if (isNamedType(ast.value)) return `t.union([t.null, ${ast.value.name}])`;
    return `t.union([t.null, ${print(ast.value)}])`;
  };

  return `
    export const ${ast.name} = ${mkPrinter(optionPrinter)(ast)};
    export type ${ast.name} = t.TypeOf<typeof ${ast.name}>;
  `;
};
