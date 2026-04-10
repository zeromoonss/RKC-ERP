import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS — allow localhost and local network
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      // Allow localhost and local network IPs
      const allowed = [
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
        /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
        /^https?:\/\/.*\.vercel\.app$/,
        /^https?:\/\/.*\.onrender\.com$/,
        /^https?:\/\/.*\.railway\.app$/,
      ];
      const webUrl = configService.get<string>('WEB_URL', '');
      if (webUrl && origin === webUrl) return callback(null, true);
      if (allowed.some(re => re.test(origin))) return callback(null, true);
      callback(null, true); // Allow all for now during development
    },
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = configService.get<number>('API_PORT', 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 RKC ERP API is running on http://0.0.0.0:${port}/api`);
}
bootstrap();

