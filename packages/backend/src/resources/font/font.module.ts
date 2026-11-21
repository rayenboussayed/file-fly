import { Module } from '@nestjs/common';

import { FontController } from './font.controller.js';
import { FontService } from './font.service.js';

/** Font feature module: metadata, extract, shape and subset routes. */
@Module({
  controllers: [FontController],
  providers: [FontService],
})
export class FontModule {}
