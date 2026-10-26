import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OAuthService } from 'angular-oauth2-oidc';
import { environment } from '../../environments/environment';
import { authBearerInterceptor } from './auth-bearer.interceptor';

const apiMe = `${environment.apiUrl.replace(/\/$/, '')}/me`;

describe('authBearerInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let oauth: { getAccessToken: jasmine.Spy };

  beforeEach(() => {
    oauth = { getAccessToken: jasmine.createSpy('getAccessToken') };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authBearerInterceptor])),
        provideHttpClientTesting(),
        { provide: OAuthService, useValue: oauth },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds Bearer for API URLs when token exists', () => {
    oauth.getAccessToken.and.returnValue('jwt-abc');
    http.get(apiMe).subscribe();
    const req = httpMock.expectOne(apiMe);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-abc');
    req.flush({});
  });

  it('does not add Bearer without token', () => {
    oauth.getAccessToken.and.returnValue('');
    http.get(apiMe).subscribe();
    const req = httpMock.expectOne(apiMe);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does not add Bearer for non-API URLs', () => {
    oauth.getAccessToken.and.returnValue('jwt-abc');
    http.get('/assets/config.json').subscribe();
    const req = httpMock.expectOne('/assets/config.json');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('adds Bearer when API path has trailing slash on base URL', () => {
    oauth.getAccessToken.and.returnValue('jwt-xyz');
    const withSlash = `${environment.apiUrl}/me`;
    http.get(withSlash).subscribe();
    const req = httpMock.expectOne(withSlash);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-xyz');
    req.flush({});
  });
});
