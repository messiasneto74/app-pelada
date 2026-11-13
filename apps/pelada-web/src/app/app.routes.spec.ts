import { routes } from './app.routes';
import { devRoutesGuard } from './dev/dev-routes.guard';

describe('routes — rotas dev protegidas (Médio)', () => {
  it('a rota "dev" usa devRoutesGuard em canActivateChild', () => {
    const devRoute = routes.find((route) => route.path === 'dev');
    expect(devRoute).withContext('rota "dev" não encontrada').toBeDefined();
    expect(devRoute?.canActivateChild).toEqual([devRoutesGuard]);
    expect(devRoute?.children?.length).toBeGreaterThan(0);
  });
});
