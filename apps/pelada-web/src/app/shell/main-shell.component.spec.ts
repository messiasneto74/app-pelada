import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MainShellComponent } from './main-shell.component';

describe('MainShellComponent (issue #224)', () => {
  it('tem o atalho "Meu perfil" apontando pra /perfil', async () => {
    await TestBed.configureTestingModule({
      imports: [MainShellComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(MainShellComponent);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a[aria-label="Meu perfil"]') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/perfil');
  });
});
