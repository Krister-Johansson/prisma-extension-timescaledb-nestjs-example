import type { CodegenConfig } from '@graphql-codegen/cli';

const shared = {
  useTypeImports: true,
  enumsAsTypes: true,
  scalars: { DateTime: 'string', ID: 'string' },
};

/**
 * Generates typed GraphQL artifacts from our *.gql files against the API's
 * committed schema. Shared schema types go to src/gql/schema-types.ts; each
 * operation gets a colocated <name>.generated.ts (via near-operation-file) that
 * imports those shared types — so enums aren't duplicated. Apollo Client 4
 * consumes the generated documents via useQuery(Document).
 */
const config: CodegenConfig = {
  schema: '../api/src/schema.gql',
  documents: ['src/**/*.gql'],
  ignoreNoDocuments: true,
  generates: {
    'src/gql/schema-types.ts': {
      plugins: ['typescript'],
      config: shared,
    },
    'src/': {
      preset: 'near-operation-file',
      presetConfig: {
        extension: '.generated.ts',
        baseTypesPath: 'gql/schema-types.ts',
      },
      plugins: ['typescript-operations', 'typed-document-node'],
      config: shared,
    },
  },
};

export default config;
