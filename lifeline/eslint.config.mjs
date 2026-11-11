import next from 'eslint-config-next';

const config = [
  ...next,
  { ignores: ['.next/**', 'node_modules/**', '.data/**', 'test-results/**', 'playwright-report/**'] },
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      // Pages load their data in effects (fetch, then setState). There is no client cache library by design.
      'react-hooks/set-state-in-effect': 'off',
      // Full page loads are intended after sign-in, sign-out and recovery, so no signed-in state survives in memory.
      '@next/next/no-location-assign-relative-destination': 'off',
    },
  },
];
export default config;
