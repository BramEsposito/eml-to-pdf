import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

// Hoisted before all imports — vitest lifts vi.mock to the top of the module
vi.mock('html-pdf', () => ({
  default: {
    create: vi.fn(() => ({
      toFile: vi.fn((filename, cb) => cb(null, { filename })),
    })),
  },
}))

import Eml2Pdf from '../index.js'
import pdf from 'html-pdf'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.join(__dirname, 'fixtures')

let tmpDir

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eml-test-'))
  vi.clearAllMocks()
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function fixture(name) {
  const dest = path.join(tmpDir, name)
  fs.copyFileSync(path.join(FIXTURES, name), dest)
  return dest
}

// ---------------------------------------------------------------------------
// renameFile
// ---------------------------------------------------------------------------

describe('renameFile', () => {
  it('renames the file using date, sender name, and subject', async () => {
    const eml = new Eml2Pdf(fixture('plain-text.eml'))
    await eml.renameFile()
    expect(fs.existsSync(path.join(tmpDir, '2024.03.15 - Jane Smith - Hello World.eml'))).toBe(true)
  })

  it('original filename no longer exists after rename', async () => {
    const src = fixture('plain-text.eml')
    const eml = new Eml2Pdf(src)
    await eml.renameFile()
    expect(fs.existsSync(src)).toBe(false)
  })

  it('appends _1 suffix on first collision', async () => {
    // rename a first copy to claim the target name
    const first = fixture('plain-text.eml')
    await new Eml2Pdf(first).renameFile()

    // rename a second copy — should get the _1 suffix
    const src2 = path.join(tmpDir, 'copy.eml')
    fs.copyFileSync(path.join(FIXTURES, 'plain-text.eml'), src2)
    await new Eml2Pdf(src2).renameFile()

    expect(fs.existsSync(path.join(tmpDir, '2024.03.15 - Jane Smith - Hello World_1.eml'))).toBe(true)
  })

  it('is a no-op when the file is already correctly named', async () => {
    const eml = new Eml2Pdf(fixture('plain-text.eml'))
    const basePath = await eml.renameFile()
    const mtime = fs.statSync(basePath + '.eml').mtimeMs

    await eml.renameFile()

    expect(fs.statSync(basePath + '.eml').mtimeMs).toBe(mtime)
  })
})

// ---------------------------------------------------------------------------
// generateEmailHeader
// ---------------------------------------------------------------------------

describe('generateEmailHeader', () => {
  it('includes from address, to address, and subject', () => {
    const eml = new Eml2Pdf(fixture('plain-text.eml'))
    eml.getEnvelope()
    eml.generateEmailHeader()
    expect(eml.emailheader).toContain('jane@example.com')
    expect(eml.emailheader).toContain('john@example.com')
    expect(eml.emailheader).toContain('Hello World')
  })

  it('includes a CC line when the header is present', () => {
    const eml = new Eml2Pdf(fixture('with-cc.eml'))
    eml.getEnvelope()
    eml.generateEmailHeader()
    expect(eml.emailheader).toContain('Cc:')
    expect(eml.emailheader).toContain('cc@example.com')
  })

  it('omits the CC line when there is no CC header', () => {
    const eml = new Eml2Pdf(fixture('plain-text.eml'))
    eml.getEnvelope()
    eml.generateEmailHeader()
    expect(eml.emailheader).not.toContain('Cc:')
  })

  it('produces a non-empty HTML string', () => {
    const eml = new Eml2Pdf(fixture('plain-text.eml'))
    eml.getEnvelope()
    eml.generateEmailHeader()
    expect(typeof eml.emailheader).toBe('string')
    expect(eml.emailheader.length).toBeGreaterThan(0)
    expect(eml.emailheader).toContain('<div')
  })
})

// ---------------------------------------------------------------------------
// saveAttachmentsFromEML
// ---------------------------------------------------------------------------

describe('saveAttachmentsFromEML', () => {
  it('saves the attachment file into a named subdirectory', async () => {
    const eml = new Eml2Pdf(fixture('with-attachment.eml'))
    await eml.saveAttachmentsFromEML()
    const attachDir = path.join(tmpDir, '2024.03.15 - Jane Smith - Email with Attachment')
    expect(fs.existsSync(path.join(attachDir, 'document.txt'))).toBe(true)
  })

  it('does not create a directory for plain-text emails with no attachments', async () => {
    const eml = new Eml2Pdf(fixture('plain-text.eml'))
    await eml.saveAttachmentsFromEML()
    const attachDir = path.join(tmpDir, '2024.03.15 - Jane Smith - Hello World')
    expect(fs.existsSync(attachDir)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// convertEMLtoPDF
// ---------------------------------------------------------------------------

describe('convertEMLtoPDF', () => {
  it('resolves with an object containing the pdf filename', async () => {
    const eml = new Eml2Pdf(fixture('html-only.eml'))
    const result = await eml.convertEMLtoPDF()
    expect(result.filename).toMatch(/\.pdf$/)
  })

  it('calls html-pdf create with the composed HTML', async () => {
    const eml = new Eml2Pdf(fixture('html-only.eml'))
    await eml.convertEMLtoPDF()
    expect(pdf.create).toHaveBeenCalledOnce()
    const [html] = pdf.create.mock.calls[0]
    expect(html).toContain('HTML body')
    expect(html).toContain('jane@example.com') // from the header block
  })

  it('falls back to encoded plain text when there is no HTML part', async () => {
    const eml = new Eml2Pdf(fixture('plain-text.eml'))
    await eml.convertEMLtoPDF()
    expect(pdf.create).toHaveBeenCalledOnce()
    const [html] = pdf.create.mock.calls[0]
    expect(html).toContain('plain text body')
  })

  it('uses the HTML part from a multipart/alternative message', async () => {
    const eml = new Eml2Pdf(fixture('multipart-alternative.eml'))
    await eml.convertEMLtoPDF()
    expect(pdf.create).toHaveBeenCalledOnce()
    const [html] = pdf.create.mock.calls[0]
    expect(html).toContain('HTML version')
  })
})

// ---------------------------------------------------------------------------
// Apple Mail LF-only normalisation
// ---------------------------------------------------------------------------

describe('LF-only newline normalisation', () => {
  it('parses a file with LF-only line endings (Apple Mail format)', () => {
    // All fixture files are written with LF only, so every fixture exercises
    // this path — this test makes the behaviour explicit.
    const src = path.join(FIXTURES, 'plain-text.eml')
    const raw = fs.readFileSync(src, 'utf8')
    expect(raw).not.toContain('\r\n') // confirm the fixture really is LF-only

    const eml = new Eml2Pdf(fixture('plain-text.eml'))
    eml.getEnvelope()
    expect(eml.email).toBeDefined()
    expect(eml.email.header.get('subject')).toBe('Hello World')
  })
})
