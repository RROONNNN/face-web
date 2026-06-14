import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

type RootResponse = {
  success: boolean;
  data: string;
  timestamp: string;
};

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((response) => {
        const body = response.body as RootResponse;

        expect(body.success).toBe(true);
        expect(body.data).toBe('Hello World!');
        expect(typeof body.timestamp).toBe('string');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
