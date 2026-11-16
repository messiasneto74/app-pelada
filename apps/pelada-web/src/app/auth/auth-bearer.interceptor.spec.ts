import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { environment } from '../../environments/environment';
import { authBearerInterceptor } from './auth-bearer.interceptor';

const apiMe = `${environment.apiUrl.replace(/\/$/, '')}/me`;

describe('authBearerInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let oauth: { getAccessToken: jasmine.Spy; logOut: jasmine.Spy };
  let router: { url: string; navigateByUrl: jasmine.Spy };

  beforeEach(() => {
    oauth = {
      getAccessToken: jasmine.createSpy('getAccessToken'),
      logOut: jasmine.createSpy('logOut'),
    };
    router = {
      url: '/inicio',
      navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authBearerInterceptor])),
        provideHttpClientTesting(),
        { provide: OAuthService, useValue: oauth },
        { provide: Router, useValue: router },
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

  it('on 401 with a token attached, logs out and redirects to /entrar', () => {
    oauth.getAccessToken.and.returnValue('jwt-expired');
    http.get(apiMe).subscribe({ error: () => {} });
    const req = httpMock.expectOne(apiMe);
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(oauth.logOut).toHaveBeenCalledWith(true);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/entrar');
  });

  it('on 401 already at /entrar, does not redirect again', () => {
    router.url = '/entrar';
    oauth.getAccessToken.and.returnValue('jwt-expired');
    http.get(apiMe).subscribe({ error: () => {} });
    const req = httpMock.expectOne(apiMe);
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(oauth.logOut).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('on non-401 error, does not log out or redirect', () => {
    oauth.getAccessToken.and.returnValue('jwt-abc');
    http.get(apiMe).subscribe({ error: () => {} });
    const req = httpMock.expectOne(apiMe);
    req.flush({ message: 'Server error' }, { status: 500, statusText: 'Server Error' });

    expect(oauth.logOut).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
