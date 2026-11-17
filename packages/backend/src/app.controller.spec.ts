import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CLS_REQ, CLS_RES, ClsService } from 'nestjs-cls';

import { CLS_FILE_SCAN, CLS_FILE_SIGNATURE } from '@/constants/cls.js';

import { AppController } from './app.controller.js';
import { AntiVirusService } from './services/anti-virus.service.js';
import { FileTypeService } from './services/file-type.service.js';
import { NormalizedClsService } from './services/normalized-cls.service.js';

describe('AppController', () => {
  let appController: AppController;
  let store: Map<symbol, unknown>;

  beforeEach(async () => {
    store = new Map<symbol, unknown>([
      [CLS_REQ, { id: 'request' }],
      [CLS_RES, { id: 'response' }],
    ]);
    const clsStub = {
      get: <T>(key: symbol) => store.get(key) as T,
      set: (key: symbol, value: unknown) => {
        store.set(key, value);
      },
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: ClsService, useValue: clsStub }, AntiVirusService, FileTypeService, NormalizedClsService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('signatureGet returns the stored signature (GET and POST)', () => {
    store.set(CLS_FILE_SIGNATURE, { ext: 'png', mime: 'image/png' });
    expect(appController.signatureGet()).toEqual({ ext: 'png', mime: 'image/png' });
    expect(appController.signaturePost()).toEqual({ ext: 'png', mime: 'image/png' });
  });

  it('signatureGet throws when no signature is stored', () => {
    expect(() => appController.signatureGet()).toThrow(ServiceUnavailableException);
    expect(() => appController.signaturePost()).toThrow(ServiceUnavailableException);
  });

  it('virusScanGet returns the stored verdict (GET and POST)', () => {
    store.set(CLS_FILE_SCAN, { isInfected: false, viruses: [] });
    expect(appController.virusScanGet()).toEqual({ isInfected: false, viruses: [] });
    expect(appController.virusScanPost()).toEqual({ isInfected: false, viruses: [] });
  });

  it('virusScanGet throws when no scan result is stored', () => {
    expect(() => appController.virusScanGet()).toThrow(ServiceUnavailableException);
    expect(() => appController.virusScanPost()).toThrow(ServiceUnavailableException);
  });
});
