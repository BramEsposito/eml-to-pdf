# API

## `new Eml2Pdf(filename, options?)`

Creates an instance bound to a single `.eml` file.

| Parameter | Type | Description |
|---|---|---|
| `filename` | `string` | Absolute or relative path to the `.eml` file |
| `options` | `object` | Optional configuration (see below) |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `outputDir` | `string` | Same directory as the `.eml` file | Override where attachment subdirectories and renamed files are written |
| `filenameTemplate` | `function` | `null` | Custom function to generate the base filename from email metadata (see below) |
| `logger` | `function` | `null` | Receives internal log messages; pass `console.log` to enable logging |
| `pdfOptions` | `object` | `{}` | Merged into puppeteer's [`page.pdf()` options](https://pptr.dev/api/puppeteer.pdfoptions) — overrides defaults |

#### `filenameTemplate(meta) => string`

Called with an object `{ date, from: { name, address }, subject }` and must return a plain string (it will be passed through `sanitize-filename`).

```javascript
filenameTemplate: ({ date, from, subject }) => `${from.name} - ${subject}`
```

Default (when omitted): `yyyy.mm.dd - <from.name> - <subject>`

#### Default PDF options

```javascript
{ width: '280mm', height: '396mm', margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' } }
```

```javascript
import Eml2Pdf from 'eml-to-pdf'

const eml2pdf = new Eml2Pdf('path/to/message.eml', {
    outputDir: '/archive',
    logger: console.log,
    pdfOptions: { format: 'A4' },
})
```

---

## Methods

### `renameFile()` → `Promise<string>`

Renames the `.eml` file on disk using metadata from the message headers.

Default filename format: `yyyy.mm.dd - <sender name> - <subject>.eml`

If a file with that name already exists, a numeric suffix is appended: `..._1.eml`, `_2`, etc.

Returns the new base path (without the `.eml` extension).

```javascript
const newPath = await eml2pdf.renameFile()
// e.g. "/mail/2024.03.15 - Jane Smith - Project update"
```

---

### `saveAttachmentsFromEML()` → `Promise<void>`

Saves all non-text attachments from the message to a subdirectory. The subdirectory is named using the same scheme as `renameFile()` and is created under `outputDir` (or the `.eml` file's directory if `outputDir` is not set).

```javascript
await eml2pdf.saveAttachmentsFromEML()
// attachments written to e.g. "/mail/2024.03.15 - Jane Smith - Project update/"
```

---

### `convertEMLtoPDF()` → `Promise<{ filename: string }>`

Converts the email message to a PDF file. The PDF includes a rendered header block (sender, date, recipients, subject) followed by the message body. If the message has an HTML part it is used; otherwise the plain-text part is rendered as HTML. Inline CID images are embedded as base64.

The output filename is `emlfilename + ".pdf"`. Call `renameFile()` first if you want the PDF named after the message metadata.

Returns `{ filename: string }` with the path of the written PDF.

```javascript
await eml2pdf.renameFile()
const result = await eml2pdf.convertEMLtoPDF()
// result.filename => "/mail/2024.03.15 - Jane Smith - Project update.eml.pdf"
```

---

## Typical usage

```javascript
import Eml2Pdf from 'eml-to-pdf'

const eml2pdf = new Eml2Pdf('inbox/message.eml', { logger: console.log })

await eml2pdf.renameFile()
await eml2pdf.saveAttachmentsFromEML()
await eml2pdf.convertEMLtoPDF()
```

> **Note:** Each instance is stateful and bound to a single file. Create a new `Eml2Pdf` instance per file.
