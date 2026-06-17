/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** GraphQL API endpoint. Defaults to http://localhost:3000/graphql. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
