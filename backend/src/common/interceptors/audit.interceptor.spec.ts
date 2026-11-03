import { AuditInterceptor } from './audit.interceptor';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    interceptor = new AuditInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });
});
