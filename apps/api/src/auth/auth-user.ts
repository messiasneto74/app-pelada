/** Claims usados após validar JWT Keycloak ou bypass dev. */
export type AuthUserPayload = {
  sub: string;
  email?: string;
};
