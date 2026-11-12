import { of } from 'rxjs';
import { MultipartPlayerPatchInterceptor } from './multipart-player-patch.interceptor';

describe('MultipartPlayerPatchInterceptor', () => {
  const interceptor = new MultipartPlayerPatchInterceptor();

  it('normaliza isFixedList antes dos pipes', () => {
    const req = { body: { isFixedList: 'false' } };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as never;

    interceptor.intercept(ctx, { handle: () => of(null) }).subscribe();

    expect(req.body.isFixedList).toBe(false);
  });
});
