import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

const sendMailMock = jest.fn().mockResolvedValue(undefined);

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: sendMailMock })),
}));

function configWith(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('MailService (issue #179b)', () => {
  beforeEach(() => {
    sendMailMock.mockClear();
  });

  it('isConfigured() é false sem SMTP_HOST/USER/PASS/MAIL_FROM no ambiente', () => {
    const service = new MailService(configWith({}));
    expect(service.isConfigured()).toBe(false);
  });

  it('sendInviteEmail() não lança e não envia nada sem SMTP configurado', async () => {
    const service = new MailService(configWith({}));
    await service.sendInviteEmail({
      to: 'jogador@example.com',
      peladaName: 'Pelada dos Amigos',
      inviteUrl: 'https://app.example.com/convite/token123',
      expiresAt: new Date('2026-11-20T00:00:00.000Z'),
    });
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('isConfigured() é true com SMTP completo e sendInviteEmail() chama sendMail', async () => {
    const service = new MailService(
      configWith({
        SMTP_HOST: 'smtp.sendgrid.net',
        SMTP_PORT: '587',
        SMTP_USER: 'apikey',
        SMTP_PASS: 'SG.fake-key',
        MAIL_FROM: 'no-reply@app-pelada.example.com',
      }),
    );
    expect(service.isConfigured()).toBe(true);

    await service.sendInviteEmail({
      to: 'jogador@example.com',
      peladaName: 'Pelada dos Amigos',
      inviteUrl: 'https://app.example.com/convite/token123',
      expiresAt: new Date('2026-11-20T00:00:00.000Z'),
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const call = sendMailMock.mock.calls[0][0];
    expect(call.to).toBe('jogador@example.com');
    expect(call.from).toBe('no-reply@app-pelada.example.com');
    expect(call.subject).toContain('Pelada dos Amigos');
    expect(call.text).toContain('https://app.example.com/convite/token123');
    expect(call.html).toContain('https://app.example.com/convite/token123');
  });

  it('escapa HTML no nome da pelada', async () => {
    const service = new MailService(
      configWith({
        SMTP_HOST: 'smtp.sendgrid.net',
        SMTP_PORT: '587',
        SMTP_USER: 'apikey',
        SMTP_PASS: 'SG.fake-key',
        MAIL_FROM: 'no-reply@app-pelada.example.com',
      }),
    );
    await service.sendInviteEmail({
      to: 'jogador@example.com',
      peladaName: '<script>alert(1)</script>',
      inviteUrl: 'https://app.example.com/convite/token123',
      expiresAt: new Date('2026-11-20T00:00:00.000Z'),
    });
    const call = sendMailMock.mock.calls[0][0];
    expect(call.html).not.toContain('<script>');
  });
});
