import { MeService } from './me.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('MeService', () => {
  const prisma = {
    user: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  const service = new MeService(prisma);
  const auth = { sub: 'kc-sub-1', email: 'a@b.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('JIT user on getMe via upsert', async () => {
    prisma.user.upsert = jest.fn().mockResolvedValue({
      id: 'u1',
      keycloakSub: 'kc-sub-1',
      email: 'a@b.com',
      phone: null,
    });

    const result = await service.getMe(auth);

    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { keycloakSub: 'kc-sub-1' },
        create: { keycloakSub: 'kc-sub-1', email: 'a@b.com' },
      }),
    );
    expect(result).toEqual({
      id: 'u1',
      keycloakSub: 'kc-sub-1',
      email: 'a@b.com',
      phone: null,
    });
  });

  it('patchMe updates phone', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      id: 'u1',
      keycloakSub: 'kc-sub-1',
      email: 'a@b.com',
      phone: null,
    });
    prisma.user.update = jest.fn().mockResolvedValue({
      id: 'u1',
      keycloakSub: 'kc-sub-1',
      email: 'a@b.com',
      phone: '11999990000',
    });

    const result = await service.patchMe(auth, { phone: '11999990000' });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { keycloakSub: 'kc-sub-1' },
      data: { phone: '11999990000' },
    });
    expect(result.phone).toBe('11999990000');
  });
});
