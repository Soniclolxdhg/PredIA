import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('PredIA API (e2e)', () => {
  let aplicacion: INestApplication;

  beforeAll(async () => {
    const fixtureModulo: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    aplicacion = fixtureModulo.createNestApplication();
    await aplicacion.init();
  });

  afterAll(async () => {
    await aplicacion.close();
  });

  it('debe inicializar el módulo raíz correctamente', () => {
    expect(aplicacion).toBeDefined();
  });
});
