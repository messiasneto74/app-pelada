/**
 * Variante de `environment.development.ts` pra testar em dispositivo físico
 * (celular na mesma rede) ou no login com Google, que recusa IPs de LAN crus
 * como redirect URI — só aceita `localhost` ou um domínio "de verdade". Usa
 * um serviço de DNS curinga (`<ip>.nip.io`) que resolve pro próprio IP da
 * LAN, então o Keycloak (com `KC_HOSTNAME_STRICT=false`) devolve o mesmo host
 * que o cliente usou.
 *
 * Troque `192.168.1.6` pelo IP atual da sua máquina na rede (ele muda).
 * Esse mesmo host precisa estar cadastrado como redirect URI no client OAuth
 * do Google Cloud Console. Ver docs/ambiente-dev-auth.md.
 */
const LAN_HOST = '192.168.1.6.nip.io';

export const environment = {
  production: false,
  apiUrl: `http://${LAN_HOST}:3000`,
  keycloak: {
    url: `http://${LAN_HOST}:8080`,
    realm: 'pelada',
    clientId: 'pelada-web',
  },
};
