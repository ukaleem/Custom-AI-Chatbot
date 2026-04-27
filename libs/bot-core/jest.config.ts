export default {
  displayName: 'bot-core',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: { '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }] },
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory: '../../coverage/libs/bot-core',
  transformIgnorePatterns: ['node_modules/(?!(@mistralai|@google|langchain|@langchain)/)'],
  moduleNameMapper: {
    '^@custom-ai-chatbot/shared-types$': '<rootDir>/../../libs/shared-types/src/index.ts',
    '^@custom-ai-chatbot/llm-providers$': '<rootDir>/../../libs/llm-providers/src/index.ts',
  },
};
