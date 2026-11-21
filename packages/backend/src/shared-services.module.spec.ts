import { GLOBAL_MODULE_METADATA, MODULE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { AntiVirusService } from '@/services/anti-virus.service.js';
import { FileTypeService } from '@/services/file-type.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { SharedServicesModule } from './shared-services.module.js';

/**
 * Reads Nest's module metadata.
 * @param key - Metadata key to read from the module class.
 * @returns The stored value, or undefined when the key is absent.
 */
const metadata = (key: string): unknown =>
  Reflect.getMetadata(key, SharedServicesModule) as unknown;

describe('SharedServicesModule', () => {
  it('is global', () => {
    expect(metadata(GLOBAL_MODULE_METADATA)).toBe(true);
  });

  it('provides and exports exactly the three request-agnostic services', () => {
    const services = [AntiVirusService, FileTypeService, NormalizedClsService];
    expect(metadata(MODULE_METADATA.PROVIDERS)).toEqual(services);
    expect(metadata(MODULE_METADATA.EXPORTS)).toEqual(services);
  });
});
