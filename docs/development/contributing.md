# Contributing to Vokal

Thank you for your interest in contributing to Vokal! This guide will help you get started.

## Code of Conduct

Please be respectful and follow professional conduct standards when contributing to this project.

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 20.x or higher
- npm 9.x or higher
- Git
- A GitHub account

### Setting Up Development Environment

1. **Fork and Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/vokal.git
   cd vokal
   ```

2. **Install Dependencies**

   ```bash
   npm ci
   ```

3. **Build the Project**

   ```bash
   npm run build
   ```

4. **Run Tests**

   ```bash
   npm test
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names:

- `feature/add-new-stt-provider` - New features
- `fix/audio-recording-issue` - Bug fixes
- `docs/update-api-reference` - Documentation updates
- `refactor/simplify-stt-manager` - Code refactoring

### Making Changes

1. **Create a Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**

   - Write clean, readable code
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Run Linting**

   ```bash
   npm run lint
   ```

4. **Run Tests**

   ```bash
   npm test
   ```

5. **Commit Your Changes**

   We use [Conventional Commits](https://www.conventionalcommits.org/):

   ```bash
   git commit -m "feat: add new STT provider"
   git commit -m "fix: resolve audio recording issue"
   git commit -m "docs: update API documentation"
   ```

   Commit types:
   - `feat`: New feature
   - `fix`: Bug fix
   - `docs`: Documentation changes
   - `style`: Code style changes (formatting, etc.)
   - `refactor`: Code refactoring
   - `test`: Adding or updating tests
   - `chore`: Maintenance tasks

6. **Push Your Changes**

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**

   - Go to the repository on GitHub
   - Click "New Pull Request"
   - Provide a clear description of your changes
   - Reference any related issues

## Code Style

### TypeScript

- Use TypeScript for all new code
- Provide proper type annotations
- Avoid `any` types when possible
- Use interfaces for object shapes

### Linting and Formatting

We use **ESLint** for linting and **Prettier** for code formatting:

**Linting:**
```bash
# Check for linting errors
npm run lint

# Fix linting errors automatically
npm run lint:fix
```

**Formatting:**
```bash
# Format code
npm run format

# Check formatting without modifying files
npm run format:check
```

**Pre-commit hooks** automatically run both linting and formatting via Husky.

### Naming Conventions

- **Files**: kebab-case (`audio-mixer.ts`)
- **Classes**: PascalCase (`AudioMixer`)
- **Functions/Methods**: camelCase (`mixAudio`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_SAMPLE_RATE`)
- **Interfaces/Types**: PascalCase (`AudioSettings`)

## Testing

### Writing Tests

- Place tests in `test/` directory
- Name test files with `.test.ts` or `.spec.ts`
- Use descriptive test names
- Test both success and error cases

Example:

```typescript
describe('AudioMixer', () => {
  it('should mix audio with background noise', async () => {
    const result = await mixAudio({
      sourceAudio: testAudio,
      backgroundNoise: 'cafe-ambience.wav',
      noiseLevel: 0.3
    });

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should throw error for invalid noise level', async () => {
    await expect(mixAudio({
      sourceAudio: testAudio,
      backgroundNoise: 'cafe-ambience.wav',
      noiseLevel: 1.5
    })).rejects.toThrow();
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage
```

## Adding New Features

### Adding a New STT Provider

1. Create a new file in `src/providers/`
2. Implement the `STTHandler` interface
3. Register the provider in `stt-registry.ts`
4. Add tests
5. Update documentation

Example:

```typescript
// src/providers/my-stt-provider.ts
import { STTHandler } from '../types';

export class MySTTProvider implements STTHandler {
  async transcribe(audio: Buffer): Promise<string> {
    // Implementation
  }

  supports = {
    streaming: true,
    languageCodes: ['en-US'],
    encoding: ['LINEAR16']
  };
}
```

### Adding Configuration Options

1. Update type definitions in `src/types/`
2. Update validation in `src/utils/validation.ts`
3. Update configuration documentation
4. Add example to `examples/`

## Documentation

### Updating Documentation

- Keep documentation up to date with code changes
- Use clear, concise language
- Provide code examples
- Update API reference for new methods/types

### Building Documentation

```bash
npm run docs:build
npm run docs:serve
```

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] New tests added for new functionality
- [ ] Documentation updated
- [ ] Commit messages follow Conventional Commits
- [ ] No linting errors

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe testing performed

## Related Issues
Fixes #123
```

## Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged
4. Your contribution will be included in the next release

## Release Process

Releases are automated using semantic versioning:

- `fix` commits trigger patch releases (1.0.x)
- `feat` commits trigger minor releases (1.x.0)
- Breaking changes trigger major releases (x.0.0)

## Getting Help

- **Questions**: Open a discussion on GitHub
- **Bugs**: Open an issue with reproduction steps
- **Features**: Open an issue to discuss first

## Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

Thank you for contributing to Vokal! 🎉
