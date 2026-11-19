import { Module } from '@nestjs/common';

import { AntiVirusService } from '@/services/anti-virus.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { XlsxController } from './xlsx.controller.js';
import { XlsxService } from './xlsx.service.js';

/** XLSX feature module: build, extract and metadata routes. */
@Module({
  controllers: [XlsxController],
  providers: [AntiVirusService, NormalizedClsService, XlsxService],
})
export class XlsxModule {}
