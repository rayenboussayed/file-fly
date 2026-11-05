import { Test, TestingModule } from '@nestjs/testing';

import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { WorkerService } from '@/services/worker.service.js';

import { ImageService } from './image.service.js';

describe('ImageService', () => {
  let service: ImageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageService,
        { provide: WorkerService, useValue: {} },
        { provide: NormalizedClsService, useValue: {} },
      ],
    }).compile();

    service = module.get<ImageService>(ImageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});