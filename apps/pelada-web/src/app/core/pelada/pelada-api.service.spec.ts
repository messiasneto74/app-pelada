import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PeladaApiService } from './pelada-api.service';

describe('PeladaApiService', () => {
  let service: PeladaApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(PeladaApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('POST /peladas as multipart', () => {
    service
      .createPelada({
        name: 'Pelada',
        defaultWeekday: 2,
        defaultLocation: 'Campo',
        photoFile: null,
      })
      .subscribe();

    const req = http.expectOne(`${environment.apiUrl}/peladas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    req.flush({ id: 'p1', name: 'Pelada', photoUrl: null, defaultWeekday: 2, defaultLocation: 'Campo' });
  });
});
