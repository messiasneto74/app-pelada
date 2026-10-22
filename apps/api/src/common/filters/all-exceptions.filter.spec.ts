import { ArgumentsHost, HttpException, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  function mockHost(url = '/missing') {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const request = { url };
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => request,
      }),
    } as ArgumentsHost;
    return { host, status, json, request };
  }

  it('formats HttpException with statusCode and path', () => {
    const { host, status, json } = mockHost('/foo');
    filter.catch(new NotFoundException('Route not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        error: 'Not Found',
        message: 'Route not found',
        path: '/foo',
        timestamp: expect.any(String),
      }),
    );
  });

  it('formats unknown errors as 500', () => {
    const { host, status, json } = mockHost();
    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
      }),
    );
  });
});
