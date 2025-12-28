# Changesets

This directory contains changesets for managing versioning and changelogs using [@changesets/cli](https://github.com/changesets/changesets).

## Usage

To create a new changeset:

```bash
npx changeset
```

This will prompt you to:
1. Select which packages have changed
2. Choose the type of change (major, minor, patch)
3. Describe the changes

## Version Workflow

1. Make your changes
2. Create a changeset: `npx changeset`
3. Commit the changeset file
4. When ready to release, run: `npx changeset version`
5. Commit the version changes
6. Publish: `npx changeset publish`

## CI/CD Integration

Changesets can be integrated with CI/CD to automate the release process. See the GitHub workflow in `.github/workflows/release.yml` for an example.
