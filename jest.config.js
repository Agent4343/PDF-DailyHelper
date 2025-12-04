module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  clearMocks: true,
  collectCoverageFrom: ['routes/**/*.js', 'services/**/*.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/services/openaiClient.js', '/services/supabaseClient.js'],
  moduleFileExtensions: ['js', 'json']
};
