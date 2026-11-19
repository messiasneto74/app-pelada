import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export type InviteEmailParams = {
  to: string;
  peladaName: string;
  inviteUrl: string;
  expiresAt: Date;
};

/** Config lida direto do ambiente — nenhuma delas tem default sensível. */
function readSmtpConfigFromEnv(config: ConfigService): {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
} | null {
  const host = config.get<string>('SMTP_HOST');
  const user = config.get<string>('SMTP_USER');
  const pass = config.get<string>('SMTP_PASS');
  const from = config.get<string>('MAIL_FROM');
  if (!host || !user || !pass || !from) {
    return null;
  }
  const port = Number(config.get<string>('SMTP_PORT') ?? '587');
  return { host, port, user, pass, from };
}

/**
 * Envio de e-mail transacional (issue #179b). Sem SMTP configurado (dev sem
 * credenciais), os métodos viram no-op logado — não derruba o fluxo de
 * convite, que continua funcionando por link/QR.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string | null;

  constructor(private readonly config: ConfigService) {
    const smtp = readSmtpConfigFromEnv(config);
    if (!smtp) {
      this.transporter = null;
      this.from = null;
      return;
    }
    this.transporter = createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    this.from = smtp.from;
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendInviteEmail(params: InviteEmailParams): Promise<void> {
    if (!this.transporter || !this.from) {
      this.logger.warn(
        `SMTP não configurado — convite para ${params.to} não foi enviado por e-mail.`,
      );
      return;
    }
    const expiresLabel = params.expiresAt.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });
    await this.transporter.sendMail({
      from: this.from,
      to: params.to,
      subject: `Convite para a pelada "${params.peladaName}"`,
      text:
        `Você foi convidado para a pelada "${params.peladaName}".\n\n` +
        `Entre pelo link: ${params.inviteUrl}\n\n` +
        `Esse convite vale até ${expiresLabel}.`,
      html:
        `<p>Você foi convidado para a pelada <strong>${escapeHtml(params.peladaName)}</strong>.</p>` +
        `<p><a href="${params.inviteUrl}">Entrar na pelada</a></p>` +
        `<p>Esse convite vale até ${expiresLabel}.</p>`,
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
