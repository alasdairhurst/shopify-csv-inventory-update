import { vi } from 'vitest';
import logger from '../src/utils/logger.ts';

vi.spyOn(logger, 'debug').mockReturnValue();
vi.spyOn(logger, 'error').mockReturnValue();
vi.spyOn(logger, 'log').mockReturnValue();
vi.spyOn(logger, 'warn').mockReturnValue();
