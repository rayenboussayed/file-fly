import {
  Controller,
  Get,
  Post,
  ServiceUnavailableException,
  UseInterceptors,
} from '@nestjs/common';

import { FileParserInterceptor } from '@/interceptors/file-parser.interceptor.js';
import { FileScannerInterceptor } from '@/interceptors/file-scanner.interceptor.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

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
  @UseInterceptors(FileScannerInterceptor, FileParserInterceptor)
  signatureGet() {
    return this.signature();
  }

  /**
   * Returns the detected signature of the scanned file (POST).
   * @returns The file signature's extension and MIME type.
   */
  @Post('signature')
  @UseInterceptors(FileScannerInterceptor, FileParserInterceptor)
  signaturePost() {
    return this.signature();
  }

  /**
   * Returns the antivirus scan result for the scanned file (GET).
   * @returns Whether the file is infected and the list of detected viruses.
   */
  @Get('virus-scan')
  @UseInterceptors(FileScannerInterceptor, FileParserInterceptor)
  virusScanGet() {
    return this.virusScan();
  }

  /**
   * Returns the antivirus scan result for the scanned file (POST).
   * @returns Whether the file is infected and the list of detected viruses.
   */
  @Post('virus-scan')
  @UseInterceptors(FileScannerInterceptor, FileParserInterceptor)
  virusScanPost() {
    return this.virusScan();
  }

  /**
   * Reads the file signature from CLS.
   * @returns The file signature's extension and MIME type.
   * @throws ServiceUnavailableException When no file signature is available in CLS.
   */
  private signature() {
    const signature = this.normalizedCls.fileSignature().get();
    if (!signature) throw new ServiceUnavailableException('File signature not available');
    return { ext: signature.ext, mime: signature.mime };
  }

  /**
   * Reads the antivirus scan result from CLS.
   * @returns Whether the file is infected and the list of detected viruses.
   * @throws ServiceUnavailableException When no scan result is available in CLS (antivirus not configured).
   */
  private virusScan() {
    const result = this.normalizedCls.fileScan().get();
    if (!result) throw new ServiceUnavailableException('Antivirus is not configured');
    return { isInfected: result.isInfected, viruses: result.viruses };
  }
}
