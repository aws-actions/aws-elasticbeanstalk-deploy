// Jest setup file for global test configuration

// Mock fs.promises to prevent destructuring errors
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
    readdir: jest.fn(),
  },
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  statSync: jest.fn(),
  createReadStream: jest.fn(),
  createWriteStream: jest.fn(),
}));

// Mock environment variables
process.env.GITHUB_SHA = 'abc123def456';
process.env.GITHUB_REPOSITORY = 'test-org/test-repo';
process.env.GITHUB_WORKFLOW = 'Deploy to EB';
process.env.GITHUB_RUN_ID = '123456789';

// Global test timeout
jest.setTimeout(30000);

// Suppress console output during tests unless explicitly needed
const originalConsole = console;
beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});
