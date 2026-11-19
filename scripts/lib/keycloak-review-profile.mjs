/**
 * Admin REST API do Keycloak: desativa o passo "Review Profile" (tela
 * "Update Account Information") no fluxo "first broker login", usado pelo
 * login federado (Google). Google já fornece nome/sobrenome/e-mail — não há
 * motivo pra pedir confirmação numa tela hospedada pelo Keycloak; telefone
 * já é coletado pela tela própria do app (`/entrar/completar`).
 */

const REVIEW_PROFILE_PROVIDER_ID = 'idp-review-profile';

export async function getAdminToken({ fetchFn, baseUrl, adminUser, adminPass }) {
  const res = await fetchFn(
    `${baseUrl}/realms/master/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: adminUser,
        password: adminPass,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Falha ao autenticar no Keycloak Admin: HTTP ${res.status}`);
  }
  const body = await res.json();
  if (!body.access_token) {
    throw new Error('Resposta do Keycloak Admin sem access_token.');
  }
  return body.access_token;
}

/** Acha a execução "Review Profile" numa lista de execuções do fluxo. */
export function findReviewProfileExecution(executions) {
  return (
    executions.find((exec) => exec.providerId === REVIEW_PROFILE_PROVIDER_ID) ??
    null
  );
}

export function isDisabled(execution) {
  return execution?.requirement === 'DISABLED';
}

/** Desativa "Review Profile" no fluxo informado (padrão: "first broker login"). */
export async function disableReviewProfile({
  fetchFn,
  baseUrl,
  realm,
  token,
  flowAlias = 'first broker login',
  log = () => {},
}) {
  const executionsUrl = `${baseUrl}/admin/realms/${encodeURIComponent(realm)}/authentication/flows/${encodeURIComponent(flowAlias)}/executions`;

  const listRes = await fetchFn(executionsUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok) {
    throw new Error(
      `Falha ao listar execuções do fluxo "${flowAlias}": HTTP ${listRes.status}`,
    );
  }
  const executions = await listRes.json();
  const reviewProfile = findReviewProfileExecution(executions);
  if (!reviewProfile) {
    throw new Error(
      `Execução "Review Profile" não encontrada no fluxo "${flowAlias}" (realm "${realm}").`,
    );
  }
  if (isDisabled(reviewProfile)) {
    log(`Review Profile já estava desativado no fluxo "${flowAlias}".`);
    return { changed: false };
  }

  const putRes = await fetchFn(executionsUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...reviewProfile, requirement: 'DISABLED' }),
  });
  if (!putRes.ok) {
    throw new Error(
      `Falha ao desativar Review Profile no fluxo "${flowAlias}": HTTP ${putRes.status}`,
    );
  }
  log(`Review Profile desativado no fluxo "${flowAlias}".`);
  return { changed: true };
}
