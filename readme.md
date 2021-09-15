# changelog-release-by-branch

Forked from https://github.com/notlmn/release-with-changelog

<img src="./media/releases.png" align="right" width="400">

Creates reasonable enough GitHub releases for pushed tags, with the commit log as release body.

The action also has customizable release body, that support markdown, and template fields. See [template](#template) option to see how that works.

By no means is this an action with extensive configurable options except for the ones already provided. But I would love to add some more in the future.

## Usage

``` yml
jobs:
  Release:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
      with:
        fetch-depth: 50
    - uses: morsic/changelog-release-by-branch@v4.3
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
```

Or you can customize it further:

``` yml
    - uses: morsic/changelog-release-by-branch@v4.3
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        exclude: '^Meta'
        commit-template: '- {title} ← {hash}'
        template: |
          ### Changelog

          {commits}

          {range}

          ❤
```

### Clone depth

The action expects you to do a deep clone of the repository using `actions/checkout@v2` in order to get historical commits. You can use `fetch-depth: 0` for `actions/checkout` action to clone entire repository or have a reasonable number like `100` to fetch the last 100 commits.

## Inputs

### token

Required: [Personal access token](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token) used to create releases.

### template

Default:
``` yml
{commits}

{range}
```

Markdown template to be included in release notes. Available replacements:

- `{commits}` List of commits for this release, see [`commit-template`](#commit-template) below for format of each entry.
- `{range}` A link to diff on GitHub between the last and current release.

### commit-template

Default: `'- {hash} {title}'`

Markdown template for each commit entry in release notes. Available replacements:

- `{title}` A single line title of the commit.
- `{hash}` Abbreviated commit hash, gets linkified automatically in release notes.
- `{url}` Plain link to commit on GitHub.
- `{head}` Plain link to the first word of the commit title.

### exclude

Default: `''` <br>
Example: `'^Meta:'`

Regex to exclude commits based on their title (don't include the initial and final `/`).

### tag

Default: _latest tag available_

Specific tag to generate changelog against.

### tagTemplate

Default: 

Specific tag template.

### pathFilter

Default: 

Specific path filter

### grouping

Default: false

Release notes : Sort and group the commit by their titles 

## Outputs

None.

## License

[MIT](./license)
