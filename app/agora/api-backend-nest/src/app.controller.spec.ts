import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: { getHello: jest.fn().mockReturnValue('Hello World!') },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  describe('GET /', () => {
    it('returns 200 with Hello World!', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });
  });
});
