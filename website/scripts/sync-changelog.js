/**
 * Sync CHANGELOG.md to docs/changelog.md with proper frontmatter
 */
const fs = require('fs');
const path = require('path');

function syncChangelog() {
  const rootChangelogPath = path.join(__dirname, '../../CHANGELOG.md');
  const docsChangelogPath = path.join(__dirname, '../docs/changelog.md');
  
  console.log('📝 Syncing CHANGELOG.md to docs...');
  
  // If the root CHANGELOG.md is missing, create a placeholder and return gracefully
  if (!fs.existsSync(rootChangelogPath)) {
    console.warn('⚠️  CHANGELOG.md not found at root; creating placeholder in docs.');
    const placeholder = `---
title: Changelog
description: Release history and version changes for Prisma Valibot Generator
sidebar_position: 100
---

# Changelog

Changelog is not available yet for Prisma Valibot Generator. Please check back later.

For updates, watch the repository:

- GitHub: https://github.com/omar-dulaimi/prisma-valibot-generator
`;
    fs.writeFileSync(docsChangelogPath, placeholder);
    console.log('✅ Placeholder changelog created.');
    return;
  }

  const changelogContent = fs.readFileSync(rootChangelogPath, 'utf8');
  
  // Parse the changelog to get the latest version
  const versionMatch = changelogContent.match(/^## \[(\d+\.\d+\.\d+)\]/m);
  const latestVersion = versionMatch ? versionMatch[1] : 'Unknown';
  
  // Create the docs version with frontmatter
  const frontmatter = `---
title: Changelog
description: Release history and version changes for Prisma Valibot Generator
sidebar_position: 100
---

# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

:::tip Latest Release
The latest version is **v${latestVersion}**. See the [GitHub Releases](https://github.com/omar-dulaimi/prisma-valibot-generator/releases) page for downloads and detailed release notes.
:::

`;

  // Add footer with links and additional info
  const footer = `

---

## Older Versions

For the complete version history including older releases, please see the [full CHANGELOG.md](https://github.com/omar-dulaimi/prisma-valibot-generator/blob/master/CHANGELOG.md) on GitHub.

## Version Support

- **Current:** v${latestVersion.split('.')[0]}.${latestVersion.split('.')[1]}.x - Full support with new features and bug fixes
- **Previous:** Previous minor versions - Security and critical bug fixes only
- **Legacy:** Older versions - Community support only

## Upgrade Guide

When upgrading between major versions, please refer to our [Upgrade Guide](./upgrade-guide.md) for breaking changes and migration instructions.

## Release Process

This project follows semantic versioning and uses automated releases via [semantic-release](https://github.com/semantic-release/semantic-release). Releases are automatically generated based on commit messages following the [Conventional Commits](https://conventionalcommits.org/) specification.

### Version Types

- **Major (x.0.0)**: Breaking changes that require code updates
- **Minor (x.y.0)**: New features that are backward compatible  
- **Patch (x.y.z)**: Bug fixes and small improvements

### Stay Updated

- 🔔 [Watch the repository](https://github.com/omar-dulaimi/prisma-valibot-generator) on GitHub for release notifications
- 📦 Subscribe to [GitHub Releases](https://github.com/omar-dulaimi/prisma-valibot-generator/releases)`;

  // Combine everything
  const finalContent = frontmatter + changelogContent + footer;
  
  // Write to docs
  fs.writeFileSync(docsChangelogPath, finalContent);
  
  console.log(`✅ Changelog synced successfully! Latest version: v${latestVersion}`);
}

// Run if called directly
if (require.main === module) {
  syncChangelog();
}

module.exports = { syncChangelog };