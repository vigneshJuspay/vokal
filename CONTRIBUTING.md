# Contributing to Vokal

We welcome contributions to vokal! This document outlines guidelines to help you contribute effectively.

## Code of Conduct

Please review and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inclusive environment for everyone.

## How to Contribute

There are several ways you can contribute to vokal:

*   **Bug Reports:** If you find a bug, please submit a detailed issue describing the problem, steps to reproduce it, and the expected behavior.
*   **Feature Requests:** Suggest new features or improvements by opening an issue with a clear description of the desired functionality and its use case.
*   **Documentation:** Help improve our documentation by submitting pull requests with corrections, clarifications, or new content.
*   **Code Contributions:** Contribute bug fixes, new features, or improvements to existing code by submitting pull requests.

## Development Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/juspay/vokal.git
    cd vokal
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Build the project:**

    ```bash
    npm run build
    ```

4.  **Set up credentials:**

    Create a `.env` file:
    ```bash
    GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
    # OR
    GOOGLE_AI_API_KEY=your_api_key_here
    ```

5.  **Test your changes:**

    ```bash
    npm run lint
    npm run format
    npm run typecheck
    npm run build
    ```

## Pull Request Process

1.  **Fork the repository:** Create your own fork of the vokal repository.
2.  **Create a branch:** Create a new branch for your changes. Use a descriptive name, such as `fix/bug-description` or `feature/new-feature`.

    ```bash
    git checkout -b fix/my-bug-fix
    ```

3.  **Make your changes:** Implement your bug fix, feature, or documentation update.
4.  **Test your changes:** Ensure your changes are working correctly and haven't introduced any new issues.
5.  **Commit your changes:** Write clear and concise commit messages. Follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

    ```bash
    git commit -m "feat: Add new feature"
    git commit -m "fix: Resolve issue with STT streaming"
    git commit -m "docs: Update README with CLI examples"
    ```

6.  **Push your branch:** Push your branch to your forked repository.

    ```bash
    git push origin fix/my-bug-fix
    ```

7.  **Submit a pull request:** Create a pull request from your branch to the `main` branch of the vokal repository. Provide a clear title and description of your changes.
8.  **Code Review:** Your pull request will be reviewed by project maintainers. Address any feedback and make necessary changes.
9.  **Merge:** Once your pull request is approved, it will be merged into the `main` branch.

## Coding Standards and Style Guide

*   We use TypeScript for development.
*   Follow the existing code style and patterns.
*   Use ESLint and Prettier for code formatting (run `npm run format` and `npm run lint`).
*   Use consistent indentation (2 spaces).
*   Write clear and concise code with meaningful variable and function names.
*   Add JSDoc comments to explain complex logic and public APIs.
*   Keep functions and components small and focused.

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build process, etc.)
- `ci`: CI/CD changes

### Examples

```bash
feat(stt): add support for multiple STT providers
fix(audio): resolve memory leak in audio recording
docs(readme): update installation instructions
refactor(voice-test): simplify TTS generation logic
```

## Testing Requirements

*   Ensure all existing functionality continues to work.
*   Test your changes thoroughly before submitting a pull request.
*   Run the linter and formatter:

    ```bash
    npm run lint
    npm run format
    npm run typecheck
    ```

*   Verify the build succeeds:

    ```bash
    npm run build
    ```

## Project Structure

```
vokal/
├── src/
│   ├── services/       # Core voice services
│   ├── providers/      # Provider implementations
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── constants/      # Configuration constants
│   ├── errors/         # Custom error classes
│   └── cli/            # Command-line interface
├── examples/           # Example configurations
├── assets/             # Background audio files
├── tests/              # Test files (coming soon)
└── docs/               # Documentation (coming soon)
```

## Adding New Providers

To add a new STT or TTS provider:

1. Create a new handler in `src/providers/`
2. Implement the `STTHandler` interface
3. Register the provider in `stt-handler-manager.ts`
4. Add configuration options in type definitions
5. Update documentation

Example:

```typescript
// src/providers/my-provider-stt.handler.ts
export class MyProviderSTTHandler implements STTHandler {
  startStreaming(config, onResult, onSpeechStart, onSpeechEnd, onError) {
    // Implementation
  }
  stopStreaming() {
    // Implementation
  }
}

// Register in stt-handler-manager.ts
STTHandlerManager.registerHandler('my-provider', MyProviderSTTHandler);
```

## Community Guidelines

*   Be respectful and considerate of others.
*   Provide constructive feedback.
*   Be patient and understanding.
*   Assume good intentions.
*   Help others and share your knowledge.

## Questions?

If you have questions about contributing:

- Open an issue for discussion
- Email: opensource@juspay.in
- Check existing issues and pull requests

Thank you for contributing to vokal!
