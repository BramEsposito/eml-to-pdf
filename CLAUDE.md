# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install           # install dependencies (includes puppeteer which downloads Chromium)
npx eslint .          # lint
npm test              # run tests (vitest)
npm run test:watch    # vitest watch mode
npm run test:coverage # coverage report (text + lcov + html in coverage/)
```

No build step — this is a plain ESM Node.js library published directly from source.

## Architecture

A single-file ESM library (`index.js`) exporting one `class Eml2Pdf`. Callers instantiate it with a path to an `.eml` file and an optional options object, then call methods on the instance.

### Public methods

- **`renameFile()`** — reads email headers via `envelope`, builds a filename as `yyyy.mm.dd - from.name - subject.eml`, and renames the file on disk. Collisions get a `_N` suffix. Filename format is overridable via `options.filenameTemplate`.
- **`saveAttachmentsFromEML()`** — walks the MIME tree and writes non-text parts to a subdirectory named after the email. Output directory overridable via `options.outputDir`.
- **`convertEMLtoPDF()`** — extracts the HTML (or plain-text fallback) body, inlines CID images as base64, prepends a template-literal email header, and renders to PDF via `puppeteer`. PDF options overridable via `options.pdfOptions`.

### Internal methods (prefixed `_`)

- **`_parseEnvelope(envelope, callback)`** — recursive MIME tree iterator. Calls `callback` on each leaf `Envelope` node. Skips `header`/`body` keys; recurses into sub-envelopes that contain further child envelopes.
- **`_getMessageByFormat(envelope)`** — callback used by `convertEMLtoPDF`; extracts text/html/image content from a leaf node.
- **`_checkForAttachment(envelope)`** — callback used by `saveAttachmentsFromEML`; writes non-text parts to disk.
- **`_writepdffile(html, filename)`** — launches a puppeteer browser, renders HTML, writes PDF.

### Key dependencies
| Package | Role |
|---|---|
| `envelope` | MIME parsing of `.eml` files |
| `puppeteer` | HTML → PDF via headless Chrome |
| `npm-cid` | Inline CID images into HTML |
| `sanitize-filename` | Safe filenames from email metadata |
| `dateformat` | Date formatting for filenames |
| `html-entities` | HTML-escape header values in the PDF header block |

### Key constraints
- Apple Mail `.eml` files use `\n` only — `getEnvelope()` normalises to `\r\n` before parsing (the `envelope` package requires CRLF).
- The module uses `"type": "module"` (ESM); all imports must use ESM syntax.
- `puppeteer` installs a bundled Chromium binary (~300 MB). The binary path and other launch options can be passed via `options.pdfOptions` if needed.
- `getEnvelope()` and `generateEmailHeader()` are public (not prefixed) because tests call them directly; they are not part of the documented API.
