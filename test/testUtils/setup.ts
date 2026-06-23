import { vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import logger from '../../src/utils/logger.ts';

window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.spyOn(logger, 'debug').mockReturnValue();
vi.spyOn(logger, 'error').mockReturnValue();
vi.spyOn(logger, 'log').mockReturnValue();
vi.spyOn(logger, 'warn').mockReturnValue();

afterEach(() => {
  cleanup();
  logger.clear();
});
