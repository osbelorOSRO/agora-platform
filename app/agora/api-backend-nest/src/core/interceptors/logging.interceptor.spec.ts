import { of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

const makeContext = (method = 'GET', url = '/test') =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ method, url }),
      getResponse: () => ({ statusCode: 200, setHeader: jest.fn() }),
    }),
  }) as any;

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  it('pasa la respuesta sin modificarla', (done) => {
    const next = { handle: () => of({ data: 'ok' }) } as any;
    interceptor.intercept(makeContext(), next).subscribe((val) => {
      expect(val).toEqual({ data: 'ok' });
      done();
    });
  });

  it('no bloquea el observable con rutas diferentes', (done) => {
    const next = { handle: () => of(42) } as any;
    interceptor
      .intercept(makeContext('POST', '/sales-record'), next)
      .subscribe((val) => {
        expect(val).toBe(42);
        done();
      });
  });
});
