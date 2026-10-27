import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BottomNavComponent } from './bottom-nav.component';

describe('BottomNavComponent', () => {
  let fixture: ComponentFixture<BottomNavComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNavComponent],
      providers: [
        provideRouter([
          { path: 'partida/sorteio', component: BottomNavComponent },
          { path: 'inicio', component: BottomNavComponent },
        ]),
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(BottomNavComponent);
    fixture.detectChanges();
  });

  it('destaca Partida em /partida/sorteio', async () => {
    await router.navigateByUrl('/partida/sorteio');
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('.pelada-bottom-nav__link');
    expect(links[1].classList.contains('pelada-bottom-nav__link--active')).toBe(true);
  });

  it('renderiza 4 abas', () => {
    const links = fixture.nativeElement.querySelectorAll('.pelada-bottom-nav__link');
    expect(links.length).toBe(4);
  });
});
