import { TestBed } from '@angular/core/testing';
import { PeladaContextService } from './pelada-context.service';
import { ACTIVE_PELADA_STORAGE_KEY } from './active-pelada.model';

describe('PeladaContextService', () => {
  let service: PeladaContextService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PeladaContextService);
  });

  afterEach(() => {
    service.clearActivePelada();
  });

  it('persists metadata in sessionStorage', () => {
    service.setActivePelada({
      id: 'p1',
      name: 'Pelada Teste',
      defaultWeekday: 3,
      defaultLocation: 'Campo',
      photoPreviewUrl: null,
    });
    expect(service.hasActivePelada()).toBe(true);
    const raw = sessionStorage.getItem(ACTIVE_PELADA_STORAGE_KEY);
    expect(raw).toContain('Pelada Teste');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const reloaded = TestBed.inject(PeladaContextService);
    expect(reloaded.getActivePelada()?.name).toBe('Pelada Teste');
  });

  it('ignora JSON inválido ou incompleto no sessionStorage', () => {
    sessionStorage.setItem('pelada:active-v1', '{bad');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(TestBed.inject(PeladaContextService).hasActivePelada()).toBe(false);

    sessionStorage.setItem('pelada:active-v1', JSON.stringify({ id: '', name: '' }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(TestBed.inject(PeladaContextService).hasActivePelada()).toBe(false);
  });
});
