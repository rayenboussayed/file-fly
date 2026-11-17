import { Test, TestingModule } from '@nestjs/testing';
import { CLS_REQ, CLS_RES, ClsService } from 'nestjs-cls';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AntiVirusService } from './services/anti-virus.service.js';
import { FileTypeService } from './services/file-type.service.js';
import { NormalizedClsService } from './services/normalized-cls.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const store = new Map<symbol, unknown>();
    store.set(CLS_REQ, { id: 'request' });
    store.set(CLS_RES, { id: 'response' });
    const clsStub = {
      get: <T>(key: symbol) => store.get(key) as T,
      set: (key: symbol, value: unknown) => store.set(key, value),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: ClsService, useValue: clsStub },
        AntiVirusService,
        FileTypeService,
        NormalizedClsService,
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
