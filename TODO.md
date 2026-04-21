# TODO

## Bugs / correctness

- [x] Fix `parseEnvelope` race: added empty-`rest` guard so non-multipart envelopes resolve immediately instead of hanging
- [ ] Add null guards in `checkForAttachment` for missing `content-disposition` and missing `filename` parameter
- [ ] Reset `this.attachments = []` at the start of `convertEMLtoPDF` to prevent stale state on repeated calls
- [ ] Handle `image/jpeg`, `image/gif`, `image/webp` (and `image/*` generally) in `getMessagebyFormat` — not just `image/png`
- [x] Fix `renameFile` / `emlfilename` inconsistency — `emlfilename` now always stored with `.eml` extension

## Dead code / debug output

- [ ] Remove `saveAttachmentsFromEML_old`
- [ ] Remove `fs.writeFile(... + ".txt", ...)` debug dump in `convertEMLtoPDF`
- [ ] Remove `console.log(rawsource)` in `convertEMLtoPDF`
- [x] Remove commented-out `console.log` and `dumpToFile` lines in `parseEnvelope`
- [ ] Replace `debug()` with an opt-in logger (accept a `logger` option or check `DEBUG` env var)

## API / design

- [ ] Convert export to `class` with explicit class declaration
- [ ] Accept an options object in the constructor: `{ outputDir, filenameTemplate, logger }`
- [ ] Make filename format configurable (noted in README)
- [ ] Make PDF options (page size, margins) configurable via constructor options
- [ ] Allow caller to specify attachment output directory (noted in README)

## Dependencies

- [ ] Replace `html-pdf` + PhantomJS with `puppeteer` (maintained, fixes HiDPI bug, supports modern CSS)
- [ ] Remove `handlebars`; replace `generateEmailHeader` with a plain template literal
- [ ] Remove `path` npm package; use Node's built-in `node:path` directly

## Testing

- [x] Add a test suite (vitest) with fixture `.eml` files covering plain-text, HTML-only, multipart/alternative, attachments, LF-only (Apple Mail), duplicate filename collision — 15 tests, 82% statement coverage
- [ ] Add fixture for multipart with inline PNG to cover `inlineImages` / `writepdffile` paths (currently uncovered)
