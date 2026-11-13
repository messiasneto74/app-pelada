import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import {
  ACTIVE_PELADA_STORAGE_KEY,
  type StoredActivePelada,
} from '../../core/pelada/active-pelada.model';
import { InicioEmptyPreviewComponent } from './inicio-empty-preview.component';

describe('InicioEmptyPreviewComponent', () => {
  let fixture: ComponentFixture<InicioEmptyPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioEmptyPreviewComponent],
      providers: [
        provideRouter([]),
        {
          provide: OAuthService,
          useValue: { getIdentityClaims: () => ({ sub: 'user-preview' }) },
        },
      ],
    }).compileComponents();
  });

  it('mostra estados vazios sem gravar pelada fake no sessionStorage', () => {
    const key = `${ACTIVE_PELADA_STORAGE_KEY}:user-preview`;
    const real: StoredActivePelada = {
      id: 'pelada-real',
      name: 'Pelada Real',
      defaultWeekday: 3,
      defaultLocation: 'Campo A',
    };
    sessionStorage.setItem(key, JSON.stringify(real));
    const setItem = spyOn(sessionStorage, 'setItem').and.callThrough();

    fixture = TestBed.createComponent(InicioEmptyPreviewComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma partida marcada');
    expect(fixture.nativeElement.textContent).toContain('Elenco vazio');

    const devWrites = setItem.calls
      .all()
      .filter((c) => String(c.args[1] ?? '').includes('dev-empty-evidence'));
    expect(devWrites.length).withContext('setItem dev-empty-evidence').toBe(0);

    const stored = JSON.parse(sessionStorage.getItem(key)!) as StoredActivePelada;
    expect(stored.id).toBe('pelada-real');
  });
});
