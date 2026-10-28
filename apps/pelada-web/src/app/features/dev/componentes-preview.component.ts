import { Component, model } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PeladaAvatarComponent } from '../../ui/avatar.component';
import { PeladaButtonComponent } from '../../ui/button.component';
import { PeladaCardComponent } from '../../ui/card.component';
import { PeladaChipComponent } from '../../ui/chip.component';
import { PeladaFieldComponent } from '../../ui/field.component';
import { PeladaInputDirective } from '../../ui/input.directive';
import { PeladaProgressComponent } from '../../ui/progress.component';
import { PeladaSegmentComponent } from '../../ui/segment.component';
import { PeladaSwitchComponent } from '../../ui/switch.component';

@Component({
  selector: 'app-componentes-preview',
  standalone: true,
  imports: [
    RouterLink,
    PeladaCardComponent,
    PeladaChipComponent,
    PeladaAvatarComponent,
    PeladaProgressComponent,
    PeladaSwitchComponent,
    PeladaSegmentComponent,
    PeladaFieldComponent,
    PeladaInputDirective,
    PeladaButtonComponent,
  ],
  template: `
    <main class="pelada-shell preview">
      <p class="pelada-muted label">T2 · componentes base</p>
      <h1>Kit Resenha</h1>

      <pelada-card title="Chips e avatares">
        <div class="row">
          <pelada-chip>Neutro</pelada-chip>
          <pelada-chip variant="green">Confirmado</pelada-chip>
          <pelada-chip variant="orange">Pendente</pelada-chip>
          <pelada-chip variant="red">Recusado</pelada-chip>
        </div>
        <div class="row avatars">
          <pelada-avatar name="Ana Costa" />
          <pelada-avatar name="Bruno Lima" tone="lime" size="small" />
        </div>
      </pelada-card>

      <pelada-card title="Progresso">
        <pelada-progress [value]="72" startLabel="Recebido" endLabel="72%" />
      </pelada-card>

      <pelada-card title="Formulário">
        <pelada-switch [(checked)]="notifOn">Notificar confirmações</pelada-switch>
        <pelada-segment [options]="segments" [(value)]="segment" />
        <pelada-field label="Nome do jogador" forId="nome">
          <input id="nome" peladaInput placeholder="Ex.: João Silva" />
        </pelada-field>
        <button type="button" peladaButton variant="lime" [peladaButtonBlock]="true">Salvar</button>
        <button type="button" peladaButton variant="secondary" [peladaButtonBlock]="true">
          Secundário
        </button>
      </pelada-card>

      <p class="pelada-muted footer">
        <a routerLink="/dev/tema">T1 tokens</a> · aceite 390px
      </p>
    </main>
  `,
  styles: [
    `
      .preview {
        display: flex;
        flex-direction: column;
        gap: var(--pelada-space-4);
        padding-bottom: var(--pelada-space-8);
      }
      .label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: var(--pelada-space-2);
        margin-bottom: var(--pelada-space-3);
      }
      .avatars {
        align-items: center;
      }
      .footer {
        font-size: 0.85rem;
      }
      pelada-card + pelada-card {
        margin-top: 0;
      }
      pelada-switch {
        display: block;
        margin-bottom: var(--pelada-space-4);
      }
      pelada-segment {
        display: block;
        margin-bottom: var(--pelada-space-4);
      }
    `,
  ],
})
export class ComponentesPreviewComponent {
  readonly notifOn = model(false);
  readonly segment = model('all');
  readonly segments = [
    { value: 'all', label: 'Todos' },
    { value: 'gk', label: 'GK' },
    { value: 'line', label: 'Linha' },
  ];
}
