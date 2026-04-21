# TODO

## Bugs / correctness

- [x] Fix `parseEnvelope` race: added empty-`rest` guard so non-multipart envelopes resolve immediately instead of hanging
- [x] Add null guards in `checkForAttachment` for missing `content-disposition` and missing `filename` parameter
- [x] Reset `this.attachments = []` at the start of `convertEMLtoPDF` to prevent stale state on repeated calls
- [x] Handle `image/jpeg`, `image/gif`, `image/webp` (and `image/*` generally) in `_getMessageByFormat` — not just `image/png`
- [x] Fix `renameFile` / `emlfilename` inconsistency — `emlfilename` now always stored with `.eml` extension

## Dead code / debug output

- [x] Remove `saveAttachmentsFromEML_old`
- [x] Remove `fs.writeFile(... + ".txt", ...)` debug dump in `convertEMLtoPDF`
- [x] Remove `console.log(rawsource)` in `convertEMLtoPDF`
- [x] Remove commented-out `console.log` and `dumpToFile` lines in `parseEnvelope`
- [x] Replace `debug()` with an opt-in logger (accept a `logger` option or check `DEBUG` env var)

## API / design

- [x] Convert export to `class` with explicit class declaration
- [x] Accept an options object in the constructor: `{ outputDir, filenameTemplate, logger, pdfOptions }`
- [x] Make filename format configurable via `filenameTemplate` option
- [x] Make PDF options (page size, margins) configurable via `pdfOptions` option
- [x] Allow caller to specify attachment output directory via `outputDir` option

## Dependencies

- [x] Replace `html-pdf` + PhantomJS with `puppeteer` (maintained, fixes HiDPI bug, supports modern CSS)
- [x] Remove `handlebars`; replaced `generateEmailHeader` with a plain template literal
- [x] Remove `path` npm package; now uses Node's built-in `node:path` directly

## Testing

- [x] Add a test suite (vitest) with fixture `.eml` files covering plain-text, HTML-only, multipart/alternative, attachments, LF-only (Apple Mail), duplicate filename collision — 20 tests, 85% statement coverage
- [ ] Add fixture for multipart with inline PNG to cover `_inlineImages` / `_writepdffile` paths (currently uncovered)
