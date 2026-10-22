/** Alinhado a .env.example na raiz do monorepo — ver docs/ambiente-dev-auth.md */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  keycloak: {
    url: 'http://localhost:8080',
    realm: 'pelada',
    clientId: 'pelada-web',
  },
};
