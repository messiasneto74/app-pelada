import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScreenHeaderComponent } from './screen-header.component';
import { Component } from '@angular/core';
import { PeladaButtonComponent } from './button.component';

@Component({
  standalone: true,
  imports: [ScreenHeaderComponent, PeladaButtonComponent],
  template: `
    <pelada-screen-header eyebrow="Partida" title="Presença" subtitle="Lista do dia">
      <button type="button" headerActions peladaButton variant="lime">Fechar</button>
    </pelada-screen-header>
  `,
})
class HostComponent {}

describe('ScreenHeaderComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('exibe rótulo, título e ação projetada', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.pelada-screen-header__eyebrow')?.textContent).toContain('Partida');
    expect(root.querySelector('.pelada-screen-header__title')?.textContent).toContain('Presença');
    expect(root.querySelector('[headerActions]')?.textContent).toContain('Fechar');
  });
});
