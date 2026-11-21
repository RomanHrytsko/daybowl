import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// globals: false — RTL не реєструє автоочищення сам
afterEach(() => cleanup());
