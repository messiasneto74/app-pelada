import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../auth/auth-user';
import { MeService } from '../me/me.service';
import { PrismaService } from '../prisma/prisma.service';

/** Issue #233 — só quem é da pelada recebe os avisos dela (403 antes de abrir o fluxo). */
@Injectable()
export class LiveMemberGuard implements CanActivate {
  constructor(
    private readonly me: MeService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<{ user: AuthUserPayload; params: { peladaId: string }; liveUserId?: string }>();
    const user = await this.me.getOrCreateUser(req.user);
    const member = await this.prisma.peladaMember.findUnique({
      where: { peladaId_userId: { peladaId: req.params.peladaId, userId: user.id } },
    });
    if (!member) {
      throw new ForbiddenException('Você não participa desta pelada.');
    }
    // O fluxo confere de novo a cada aviso (quem sai da pelada para de receber).
    req.liveUserId = user.id;
    return true;
  }
}
