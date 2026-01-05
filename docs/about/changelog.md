# Changelog

All notable changes to Vokal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial documentation site
- Comprehensive API documentation
- User guides and examples

## [1.0.0] - 2025-01-02

### Added
- Initial release of Vokal
- Voice bot testing framework
- Google Cloud Speech-to-Text integration
- Extensible STT provider system
- Audio recording and playback
- Audio mixing with background noise
- AI-powered response evaluation
- CLI interface for running tests
- Configuration validation
- Retry logic with exponential backoff
- Structured logging
- TypeScript type definitions
- Example configurations and scripts

### Features
- Multi-provider STT support
- Real-time audio streaming
- Background noise simulation
- Semantic response comparison
- Comprehensive test reporting
- Configurable test scenarios

### Developer Experience
- TypeScript-first API
- Detailed error messages
- Extensive code documentation
- Example implementations
- Testing utilities

## Version History

### Versioning Strategy

Vokal follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

### Upgrade Guides

#### From 0.x to 1.0

If you were using pre-release versions:

1. Update configuration format (see [Configuration Guide](../getting-started/configuration.md))
2. Update import paths if changed
3. Review breaking changes in API
4. Update custom STT handlers to match new interface

## Release Notes

### v1.0.0 - Initial Release

This is the first stable release of Vokal, a production-ready voice bot testing framework.

**Highlights:**

- ✨ Complete voice bot testing solution
- 🎯 Multiple STT provider support
- 🔊 Advanced audio processing
- 🤖 AI-powered evaluation
- 📊 Comprehensive reporting
- 🛠️ Easy-to-use CLI
- 📚 Full documentation

**Getting Started:**

```bash
npm install @juspay/vokal
```

See the [Quick Start Guide](../getting-started/quick-start.md) for more information.

## Future Releases

### Planned for v1.1.0

- [ ] Additional STT providers (AWS, Azure, etc.)
- [ ] TTS integration for automated prompt generation
- [ ] Web-based test runner interface
- [ ] Performance optimization for parallel testing
- [ ] Enhanced audio processing capabilities

### Planned for v1.2.0

- [ ] Database integration for test results
- [ ] Historical trend analysis
- [ ] Advanced reporting features
- [ ] Plugin system for custom extensions
- [ ] Real-time test monitoring dashboard

### Planned for v2.0.0

- [ ] Major architectural improvements
- [ ] Distributed testing support
- [ ] Cloud-native deployment options
- [ ] Enhanced AI evaluation models
- [ ] Video bot testing support

## Contributing

We welcome contributions! See our [Contributing Guide](../development/contributing.md) for details.

## Stay Updated

- Watch the [GitHub repository](https://github.com/juspay/vokal) for updates
- Check the [releases page](https://github.com/juspay/vokal/releases) for new versions
- Follow our [changelog](https://github.com/juspay/vokal/blob/release/CHANGELOG.md) for all changes

## Support

For questions or issues, please:

- Check the [documentation](https://juspay.github.io/vokal/)
- Search [existing issues](https://github.com/juspay/vokal/issues)
- Open a [new issue](https://github.com/juspay/vokal/issues/new) if needed

---

**Legend:**

- `Added` - New features
- `Changed` - Changes to existing functionality
- `Deprecated` - Features that will be removed
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security improvements
