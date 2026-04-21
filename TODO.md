# TODO

## Bugs / correctness

- [ ] Fix `parseEnvelope` race: `done()` fires immediately when `callbacksStarted === 0`; rewrite traversal as a proper async recursive function
- [ ] Add null guards in `checkForAttachment` for missing `content-disposition` and missing `filename` parameter
- [ ] Reset `this.attachments = []` at the start of `convertEMLtoPDF` to prevent stale state on repeated calls
- [ ] Handle `image/jpeg`, `image/gif`, `image/webp` (and `image/*` generally) in `getMessagebyFormat` — not just `image/png`
- [ ] Fix `renameFile` / `emlfilename` inconsistency — stored path sometimes includes `.eml`, sometimes not

## Dead code / debug output

- [ ] Remove `saveAttachmentsFromEML_old`
- [ ] Remove `fs.writeFile(... + ".txt", ...)` debug dump in `convertEMLtoPDF`
- [ ] Remove `console.log(rawsource)` in `convertEMLtoPDF`
- [ ] Remove commented-out `console.log` and `dumpToFile` lines in `parseEnvelope`
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

- [ ] Add a test suite (`node:test` or `vitest`) with fixture `.eml` files covering:
  - plain-text only
  - HTML-only
  - multipart with inline PNG
  - multipart with attachments
  - Apple Mail newline format (`\n` only)
  - duplicate filename collision
