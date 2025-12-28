# Single Commit Policy

> Guidelines for maintaining clean commit history in vokal

## Overview

This document outlines the single commit policy for the vokal repository to ensure a clean, readable, and maintainable git history.

## Policy Statement

All pull requests to the main branch must be merged using **squash and merge** to maintain a single commit per feature/fix.

## Benefits

### Clean History
- Each feature/fix becomes a single commit
- Easy to identify what each commit does
- Simple to revert if needed

### Better Tracking
- Clear correlation between issues and commits
- Easier code archaeology
- Simplified release notes generation

### Improved Reviews
- Focus on the complete change set
- No intermediate "fix typo" or "WIP" commits
- Professional commit history

## Implementation

### Required Settings

#### Repository Settings
1. Go to **Settings** → **General** → **Pull Requests**
2. ✅ **Allow squash merging**
3. ❌ **Allow merge commits** (disable)
4. ❌ **Allow rebase merging** (disable)
5. ✅ **Always suggest updating pull request branches**
6. ✅ **Automatically delete head branches**

#### Branch Protection Rules
- Require pull request reviews before merging
- Require status checks to pass before merging
- Require branches to be up to date before merging

### Commit Message Format

When squashing commits, use the following format:

```
<type>(<scope>): <description>

<body>

<footer>
```

#### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

#### Examples

```
feat(auth): add OAuth2 integration

- Implement OAuth2 authentication flow
- Add support for Google and GitHub providers
- Update user model to include OAuth fields
- Add comprehensive tests for auth flows

Closes #123
```

```
fix(api): resolve memory leak in request handler

- Fix memory leak caused by unclosed database connections
- Add proper connection pooling
- Update error handling to ensure cleanup

Fixes #456
```

## Workflow

### For Contributors

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make Multiple Commits** (during development)
   ```bash
   git commit -m "WIP: initial implementation"
   git commit -m "add tests"
   git commit -m "fix typo"
   git commit -m "address review comments"
   ```

3. **Create Pull Request**
   - Ensure all commits are related to the same feature/fix
   - Write a clear PR description
   - Reference relevant issues

4. **Squash and Merge**
   - Maintainer will squash all commits into a single commit
   - Provide a clean, descriptive commit message
   - Delete the feature branch

### For Maintainers

1. **Review the PR**
   - Ensure all commits are related
   - Check that tests pass
   - Verify code quality

2. **Squash and Merge**
   - Use the "Squash and merge" button
   - Edit the commit message to follow our format
   - Include relevant issue numbers

3. **Clean Up**
   - Delete the feature branch
   - Update issue status
   - Notify contributors if needed

## Exceptions

### When NOT to Squash

- **Multiple unrelated changes**: Split into separate PRs
- **Emergency hotfixes**: May use direct commits to main (with approval)
- **Release commits**: Keep as separate commits for tracking

### Emergency Procedures

For critical hotfixes that need immediate deployment:

1. Create hotfix branch from main
2. Make minimal necessary changes
3. Get emergency approval from team lead
4. Merge directly (document the exception)
5. Create follow-up PR to address properly

## Monitoring

### Metrics to Track

- Percentage of squashed merges vs direct merges
- Average commits per PR before squashing
- Time from PR creation to merge

### Regular Reviews

- **Weekly**: Check for policy violations
- **Monthly**: Review commit message quality
- **Quarterly**: Assess policy effectiveness

## Tools and Automation

### GitHub Settings

Configure repository to enforce squash merging:

```bash
# Via GitHub CLI
gh api repos/juspay/vokal \
  --method PATCH \
  --field allow_squash_merge=true \
  --field allow_merge_commit=false \
  --field allow_rebase_merge=false
```

### Git Hooks

Use pre-receive hooks to enforce policy:

```bash
#!/bin/bash
# Pre-receive hook to check commit messages
# Place in .git/hooks/pre-receive
```

### Commit Message Validation

Use commitlint to validate commit messages:

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

## Training

### New Contributors

1. Review this policy document
2. Practice creating squash merges
3. Understand commit message conventions
4. Know when to ask for help

### Resources

- [Git Documentation](https://git-scm.com/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Squash Merge](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/about-merge-methods-on-github#squashing-your-merge-commits)

## Contact

For questions about this policy:
- Team Lead: opensource@juspay.in
- Documentation: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Issues: https://github.com/juspay/vokal/issues
