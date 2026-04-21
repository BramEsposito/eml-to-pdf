# API

## `new Eml2Pdf(filename)`

Creates an instance bound to a single `.eml` file.

| Parameter | Type | Description |
|---|---|---|
| `filename` | `string` | Absolute or relative path to the `.eml` file |

```javascript
import Eml2Pdf from 'eml-to-pdf';
const eml2pdf = new Eml2Pdf('path/to/message.eml');
```

---

## Methods

### `renameFile()` → `Promise<string>`

Renames the `.eml` file on disk using metadata from the message headers.

New filename format: `yyyy.mm.dd - <sender name> - <subject>.eml`

If a file with that name already exists, a numeric suffix is appended: `yyyy.mm.dd - <sender name> - <subject>_1.eml`, `_2`, etc.

Returns the new base path (without the `.eml` extension).

```javascript
const newPath = await eml2pdf.renameFile();
// e.g. "/mail/2024.03.15 - Jane Smith - Project update"
```

---

### `saveAttachmentsFromEML()` → `Promise<void>`

Saves all attachments from the message to a subdirectory next to the `.eml` file. The subdirectory is named using the same scheme as `renameFile()`.

The directory is created if it does not exist.

```javascript
await eml2pdf.saveAttachmentsFromEML();
// attachments written to e.g. "/mail/2024.03.15 - Jane Smith - Project update/"
```

---

### `convertEMLtoPDF()` → `Promise<{ filename: string }>`

Converts the email message to a PDF file saved next to the `.eml` file.

The PDF includes a rendered header block (sender, date, recipients, subject) followed by the message body. If the message has an HTML part it is used; otherwise the plain-text part is rendered as HTML. Inline CID images are embedded as base64.

The output filename is the current value of `emlfilename` with `.pdf` appended. Call `renameFile()` first if you want the PDF named after the message metadata.

Returns the object passed back by `html-pdf`: `{ filename: string }`.

```javascript
await eml2pdf.renameFile();
const result = await eml2pdf.convertEMLtoPDF();
// result.filename => "/mail/2024.03.15 - Jane Smith - Project update.pdf"
```

---

## Typical usage

```javascript
import Eml2Pdf from 'eml-to-pdf';

const eml2pdf = new Eml2Pdf('inbox/message.eml');

await eml2pdf.renameFile();
await eml2pdf.saveAttachmentsFromEML();
await eml2pdf.convertEMLtoPDF();
```

> **Note:** Each instance is stateful. Do not reuse an instance across multiple `.eml` files — create a new `Eml2Pdf` instance per file.
