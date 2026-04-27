export default {
  displayName: 'llm-providers',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: { '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }] },
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory: '../../coverage/libs/llm-providers',
  // Transform ESM-only packages so Jest can process them
  transformIgnorePatterns: ['node_modules/(?!(@mistralai|@google)/)'],
  moduleNameMapper: {
    '^@custom-ai-chatbot/shared-types$': '<rootDir>/../../libs/shared-types/src/index.ts',
  },
};
