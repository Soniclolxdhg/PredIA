import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function iniciarServidor() {
  const registrador = new Logger('InicioPredIA');
  const aplicacion = await NestFactory.create(AppModule);

  aplicacion.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  aplicacion.setGlobalPrefix('api');

  aplicacion.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const puerto = process.env.PORT || 3000;
  await aplicacion.listen(puerto);
  registrador.log(`Servidor API PredIA escuchando en http://localhost:${puerto}`);
}

iniciarServidor();
