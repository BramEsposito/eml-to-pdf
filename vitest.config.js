import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['index.js'],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 70,
        functions: 80,
      },
    },
  },
})
