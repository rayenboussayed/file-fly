import {
  Controller,
  Get,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';

import { UseMediaPipeline } from '@/interceptors/pipeline.decorator.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

/**
 * Reads the file signature from CLS.
 * @param normalizedCls - CLS facade carrying the scanned request's signature.
 * @returns The file signature's extension and MIME type.
 * @throws ServiceUnavailableException When no file signature is available in CLS.
 */
const signatureOf = (normalizedCls: NormalizedClsService) => {
  const signature = normalizedCls.fileSignature().get();
  if (!signature) throw new ServiceUnavailableException('File signature not available');
  return { ext: signature.ext, mime: signature.mime };
};

/**
 * Reads the antivirus scan result from CLS.
 * @param normalizedCls - CLS facade carrying the scan verdict.
 * @returns Whether the file is infected and the list of detected viruses.
 * @throws ServiceUnavailableException When no scan result is available in CLS (antivirus not configured).
 */
const virusScanOf = (normalizedCls: NormalizedClsService) => {
  const result = normalizedCls.fileScan().get();
  if (!result) throw new ServiceUnavailableException('Antivirus is not configured');
  return { isInfected: result.isInfected, viruses: result.viruses };
};

/**
 Root routes: signature and antivirus verdicts for scanned payloads.
 */
@Controller()
export class AppController {
  constructor(
    private readonly normalizedCls: NormalizedClsService,
  ) {}

  /**
   * Returns the detected signature of the scanned file (GET).
   * @returns The file signature's extension and MIME type.
   */
  @Get('signature')
  @UseMediaPipeline()
  signatureGet() {
    return signatureOf(this.normalizedCls);
  }

  /**
   * Returns the detected signature of the scanned file (POST).
   * @returns The file signature's extension and MIME type.
   */
  @Post('signature')
  @UseMediaPipeline()
  signaturePost() {
    return signatureOf(this.normalizedCls);
  }

  /**
   * Returns the antivirus scan result for the scanned file (GET).
   * @returns Whether the file is infected and the list of detected viruses.
   */
  @Get('virus-scan')
  @UseMediaPipeline()
  virusScanGet() {
    return virusScanOf(this.normalizedCls);
  }

  /**
   * Returns the antivirus scan result for the scanned file (POST).
   * @returns Whether the file is infected and the list of detected viruses.
   */
  @Post('virus-scan')
  @UseMediaPipeline()
  virusScanPost() {
    return virusScanOf(this.normalizedCls);
  }
}
