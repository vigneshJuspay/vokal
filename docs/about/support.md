# Support

Need help with Vokal? Here are several ways to get support.

## Documentation

Start with our comprehensive documentation:

- **[Getting Started](../getting-started/installation.md)** - Installation and setup
- **[User Guide](../user-guide/overview.md)** - Features and usage
- **[API Reference](../api/overview.md)** - Complete API documentation
- **[Examples](../user-guide/examples.md)** - Code examples and tutorials

## Community Support

### GitHub Discussions

For general questions and discussions:

- [Ask a Question](https://github.com/juspay/vokal/discussions/new?category=q-a)
- [Share Ideas](https://github.com/juspay/vokal/discussions/new?category=ideas)
- [Show Your Work](https://github.com/juspay/vokal/discussions/new?category=show-and-tell)

### Stack Overflow

Tag your questions with `vokal` and `voice-testing`:

- [Ask on Stack Overflow](https://stackoverflow.com/questions/tagged/vokal)
- [Browse existing questions](https://stackoverflow.com/questions/tagged/vokal)

## Bug Reports

Found a bug? Please help us fix it!

### Before Reporting

1. Check [existing issues](https://github.com/juspay/vokal/issues) to avoid duplicates
2. Update to the latest version to see if it's fixed
3. Try to reproduce with a minimal example

### How to Report

[Open a new issue](https://github.com/juspay/vokal/issues/new?template=bug_report.md) with:

- **Clear title** - Brief description of the issue
- **Vokal version** - Output of `npm list @juspay/vokal`
- **Node.js version** - Output of `node --version`
- **Operating system** - Windows, macOS, Linux
- **Steps to reproduce** - Minimal code example
- **Expected behavior** - What should happen
- **Actual behavior** - What actually happens
- **Error messages** - Full error logs if applicable

**Example:**

```markdown
## Bug Report

**Vokal Version:** 1.0.0
**Node.js Version:** 18.19.0
**OS:** macOS 14.0

### Steps to Reproduce

1. Create config file with...
2. Run `vokal test -c config.json`
3. See error...

### Expected Behavior

Should successfully transcribe audio.

### Actual Behavior

Throws "STT provider not found" error.

### Error Message

```
Error: STT provider 'google-ai' not found
    at STTHandlerManager.getHandler (stt-handler-manager.ts:45)
```
```

## Feature Requests

Have an idea for a new feature?

[Open a feature request](https://github.com/juspay/vokal/issues/new?template=feature_request.md) with:

- **Use case** - Why is this feature needed?
- **Proposed solution** - How should it work?
- **Alternatives** - Other approaches you've considered
- **Examples** - Code examples if applicable

## Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead, email security concerns to: security@juspay.in

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours.

## Commercial Support

For enterprise support, custom development, or consulting:

- Email: opensource@juspay.in
- Website: [juspay.io](https://juspay.io)

### Enterprise Support Includes

- ✅ Priority bug fixes
- ✅ Feature development
- ✅ Architecture consulting
- ✅ Training and onboarding
- ✅ SLA guarantees
- ✅ Custom integrations

## Contributing

Want to contribute? We'd love your help!

See our [Contributing Guide](../development/contributing.md) for:

- Development setup
- Code style guidelines
- Testing requirements
- Pull request process

## Resources

### Links

- **GitHub Repository**: [github.com/juspay/vokal](https://github.com/juspay/vokal)
- **NPM Package**: [@juspay/vokal](https://www.npmjs.com/package/@juspay/vokal)
- **Documentation**: [juspay.github.io/vokal](https://juspay.github.io/vokal)
- **Changelog**: [CHANGELOG.md](changelog.md)

### Related Projects

- [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text)
- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)

## FAQ

### General Questions

**Q: Is Vokal free to use?**

A: Yes, Vokal is open source under the MIT License. See [License](license.md).

**Q: What STT providers are supported?**

A: Currently Google Cloud Speech-to-Text, with more providers coming soon.

**Q: Can I use Vokal in production?**

A: Yes! Vokal is production-ready and battle-tested.

**Q: Does Vokal support real-time voice interaction?**

A: Yes, Vokal supports both streaming and batch audio processing.

### Technical Questions

**Q: What Node.js versions are supported?**

A: Node.js 20.x and higher.

**Q: Can I add custom STT providers?**

A: Yes! See the [STT Provider Guide](../user-guide/examples.md#custom-stt-provider).

**Q: How do I handle audio files in different formats?**

A: Vokal supports multiple audio formats. See [Audio Configuration](../getting-started/configuration.md#audio-settings).

**Q: Can I run tests in parallel?**

A: Yes, configure parallel execution in your test configuration.

### Troubleshooting

**Q: Why is my STT provider not working?**

A: Check:
1. API credentials are correct
2. Provider is properly registered
3. Audio format is supported
4. Network connectivity

**Q: Audio recording fails on Linux**

A: Install required audio packages:
```bash
sudo apt-get install sox libsox-fmt-all
```

**Q: Tests are timing out**

A: Increase timeout in configuration:
```json
{
  "timeout": 30000
}
```

## Response Times

- **Bug reports**: 1-2 business days
- **Feature requests**: 1 week for initial review
- **Security issues**: 48 hours
- **Pull requests**: 3-5 business days

## Community Guidelines

Please be:

- **Respectful** - Treat everyone with respect
- **Constructive** - Provide helpful feedback
- **Patient** - Maintainers are volunteers
- **Clear** - Communicate clearly and concisely

See our [Code of Conduct](https://github.com/juspay/vokal/blob/release/CODE_OF_CONDUCT.md).

## Stay Connected

- ⭐ Star us on [GitHub](https://github.com/juspay/vokal)
- 🐦 Follow updates on Twitter: [@juspay](https://twitter.com/juspay)
- 💼 Connect on [LinkedIn](https://www.linkedin.com/company/juspay)

---

**Need immediate help?** Join our [community discussions](https://github.com/juspay/vokal/discussions) or check the [documentation](https://juspay.github.io/vokal/).
