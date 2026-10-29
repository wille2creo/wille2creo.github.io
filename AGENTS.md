# Repository Guidelines

Use [README.md](README.md) for layout, runtime versions, commands, publishing
contracts, and authoring conventions. Follow its [validation table](README.md#validation)
for the change at hand. Artwork and WeChat workflows are linked there.

## Style

Follow `.editorconfig`: UTF-8, LF, two-space indentation, final newline, no
trailing whitespace, and 80-character preferred lines. Keep Markdown front
matter valid YAML. Keep shared components in `_includes/` and styling in the
Sass modules under `_sass/site/`, forwarded by `_sass/_site.scss`.

## Commits

Use Conventional Commits: `type(scope): subject`. Preferred types include
`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, and `release`.
Keep subjects lowercase, under 72 characters, and without a period.
