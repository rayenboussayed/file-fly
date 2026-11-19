import { Module } from '@nestjs/common';

import { AntiVirusService } from '@/services/anti-virus.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { FontController } from './font.controller.js';
import { FontService } from './font.service.js';

/** Font feature module: metadata, extract, shape and subset routes. */
@Module({
  controllers: [FontController],
  providers: [AntiVirusService, FontService, NormalizedClsService],
})
export class FontModule {}
