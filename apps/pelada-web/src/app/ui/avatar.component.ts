import { Component, computed, input } from '@angular/core';
import { avatarInitials } from './avatar-initials';

@Component({
  selector: 'pelada-avatar',
  standalone: true,
  template: `<span [class]="classes" [attr.aria-label]="label()">{{ initials() }}</span>`,
  styles: [`:host { display: inline-flex; }`],
})
export class PeladaAvatarComponent {
  readonly name = input.required<string>();
  readonly size = input<'md' | 'small'>('md');
  readonly tone = input<'default' | 'lime'>('default');
  readonly label = input<string>();

  readonly initials = computed(() => avatarInitials(this.name()));

  get classes(): string {
    const parts = ['pelada-avatar'];
    if (this.size() === 'small') parts.push('pelada-avatar--small');
    if (this.tone() === 'lime') parts.push('pelada-avatar--lime');
    return parts.join(' ');
  }
}
