# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install dependencies
npx eslint .       # lint (no test suite configured)
```

No build step — this is a plain ESM Node.js library published directly from source.

## Architecture

This is a single-file npm library (`index.js`) that exports one constructor function. Callers instantiate it with a path to an `.eml` file and call methods on the instance:

- **`renameFile()`** — reads email headers via `envelope`, builds a filename as `yyyy.mm.dd - from.name - subject.eml`, and renames the file on disk. Handles collisions with a `_N` suffix.
- **`saveAttachmentsFromEML()`** — walks the MIME tree and writes non-text parts to a subdirectory named after the email.
- **`convertEMLtoPDF()`** — extracts the HTML (or plain-text fallback) body, inlines CID images as base64, prepends a Handlebars-rendered email header block, and renders to PDF via `html-pdf` (which uses PhantomJS under the hood).

The MIME tree is traversed by `parseEnvelope()`, a recursive iterator that skips `header` and `body` keys and calls a provided callback on each leaf `Envelope` node.

### Key dependencies
| Package | Role |
|---|---|
| `envelope` | MIME parsing of `.eml` files |
| `html-pdf` | HTML → PDF via PhantomJS |
| `handlebars` | Email header template |
| `npm-cid` | Inline CID images into HTML |
| `sanitize-filename` | Safe filenames from email metadata |
| `dateformat` | Date formatting for filenames |

### Known constraints
- `html-pdf` uses PhantomJS; PDF output is scaled on HiDPI screens (known issue).
- Apple Mail `.eml` files use `\n` only — `getEnvelope()` normalises these to `\r\n` before parsing.
- The module uses `"type": "module"` (ESM); all imports must use ESM syntax.
