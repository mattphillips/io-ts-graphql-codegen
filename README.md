# io-ts-graphql-codegen

This plugin for [graphql code generator](https://graphql-code-generator.com) generates types and runtime codecs for a given GraphQL Schema using [io-ts](https://github.com/gcanti/io-ts) to give runtime type safety.

### Missing features:

- Custom codecs for custom Scalars
- Name aliases
- `FragmentSpread` selections
- `subscription` operation types

### Assumptions

- At least one Mutation will be present
- At least one Query will be present
- `__typename` will be generated on all types and selections automatically

### Architecture

The general flow to generate the types is as follows:

1. Parse the schema into an AST
2. Filter to Type Definitions and run topological sort on it so that dependant types appear first (this is crucial to printing the codecs in the correct order).
3. Convert sorted graph to an io-ts AST representation.
4. Build io-ts representation of all selections backing the selections with the above io-ts AST.
5. Build io-ts representation of selection variables again backed with the above io-ts AST.
6. Print all helpers to perform nested selections on codecs.
7. Pretty print all io-ts ASTs.

### Limitations

- `io-ts`'s Intersection type is bound to a minimum of 2 codecs and a maximum of 5. When performing selections and merging them with intersection types these bounds need to be honored. Currently this plugin only supports the merging of 25 codecs.
