import { Module } from '@nestjs/common';

import { XlsxController } from './xlsx.controller.js';
import { XlsxService } from './xlsx.service.js';

/**
XLSX feature module: build, extract and metadata routes.
 */
@Module({
  controllers: [XlsxController],
  providers: [XlsxService],
})
export class XlsxModule {}
