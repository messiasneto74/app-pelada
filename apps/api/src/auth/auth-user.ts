/** Claims usados após validar JWT Keycloak ou bypass dev. */
export type AuthUserPayload = {
  sub: string;
  email?: string;
  /** Nome de exibição vindo do IdP (claim `name`/`given_name`), quando houver. */
  name?: string;
};
