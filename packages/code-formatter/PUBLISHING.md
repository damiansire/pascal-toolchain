# Publishing

`pascal-code-formatter` is **not** published by hand. Versioning and publishing
for every package in this monorepo are driven by [Changesets](https://github.com/changesets/changesets)
through CI — see the **Releasing** section of the repo-root [`AGENTS.md`](../../AGENTS.md).

Do **not** run `npm version` or `npm publish` locally: that would bypass the
verified pipeline (lint, build, ordered test, type-tests) and desync the version
bumps that Changesets coordinates across sibling packages.

## To ship a change

1. Describe the user-facing change and its bump:
   ```bash
   npm run changeset
   ```
2. Commit the generated `.changeset/*.md` with your change and open a PR.
3. When it merges, the release workflow opens a **Version Packages** PR that
   applies the bumps and updates changelogs. Merging that PR publishes the
   affected packages to npm and tags the release automatically.
