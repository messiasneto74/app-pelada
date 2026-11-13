import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { BottomNavComponent } from './bottom-nav.component';

/** Raiz com outlet para rotas filhas (partida/sorteio precisa de hierarquia com rota pai sem componente ou outro outlet). */
@Component({
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class NavTestHostComponent {}

describe('BottomNavComponent', () => {
  let fixture: ComponentFixture<NavTestHostComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNavComponent, NavTestHostComponent],
      providers: [
        provideRouter([
          {
            path: '',
            component: NavTestHostComponent,
            children: [
              { path: 'inicio', component: BottomNavComponent },
              {
                path: 'partida',
                children: [{ path: 'sorteio', component: BottomNavComponent }],
              },
            ],
          },
        ]),
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(NavTestHostComponent);
    fixture.detectChanges();
  });

  it('destaca Partida em /partida/sorteio', async () => {
    await router.navigateByUrl('/partida/sorteio');
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('pelada-bottom-nav');
    expect(nav).toBeTruthy();
    const links = nav!.querySelectorAll('.pelada-bottom-nav__link');
    expect(links[1].classList.contains('pelada-bottom-nav__link--active')).toBe(true);
  });

  it('renderiza 4 abas', async () => {
    await router.navigateByUrl('/inicio');
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('pelada-bottom-nav');
    expect(nav).toBeTruthy();
    const links = nav!.querySelectorAll('.pelada-bottom-nav__link');
    expect(links.length).toBe(4);
  });
});
