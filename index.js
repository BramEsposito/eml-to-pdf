import fs from 'node:fs'
import path from 'node:path'
import sanitize from 'sanitize-filename'
import dateFormat from 'dateformat'
import cid from 'npm-cid'
import { encode } from 'html-entities'
import Envelope from 'envelope'
import puppeteer from 'puppeteer'

const DEFAULT_PDF_OPTIONS = {
    width: '280mm',
    height: '396mm',
    margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
}

export default class Eml2Pdf {

    constructor(filename, options = {}) {
        this.emlfilename = filename
        this.options = {
            outputDir: options.outputDir ?? null,
            filenameTemplate: options.filenameTemplate ?? null,
            logger: options.logger ?? null,
            pdfOptions: options.pdfOptions ?? {},
        }
        this.email = null
        this.emailheader = null
        this.textmessage = null
        this.htmlmessage = null
        this.attachments = []
    }

    _log(msg) {
        if (this.options.logger) this.options.logger(msg)
    }

    getEnvelope() {
        if (this.email != null) return
        let data = fs.readFileSync(this.emlfilename).toString()
        if (!data.includes('\r\n')) {
            data = data.replace(/\n/g, '\r\n')
        }
        this.email = new Envelope(data)
    }

    getEmlPath() {
        const dir = this.options.outputDir ?? path.dirname(this.emlfilename)
        let basename
        if (this.options.filenameTemplate) {
            basename = sanitize(this.options.filenameTemplate({
                date: this.email.header.get('date'),
                from: this.email.header.get('from')[0],
                subject: this.email.header.get('subject'),
            }))
        } else {
            basename = sanitize(
                dateFormat(this.email.header.get('date'), 'yyyy.mm.dd') + ' - '
                + this.email.header.get('from')[0].name + ' - '
                + this.email.header.get('subject')
            )
        }
        return path.join(dir, basename)
    }

    async renameFile() {
        this.getEnvelope()
        let newname = this.getEmlPath()

        if (this.emlfilename !== newname + '.eml') {
            if (fs.existsSync(newname + '.eml')) {
                let i = 1
                while (fs.existsSync(`${newname}_${i}.eml`)) i++
                newname = `${newname}_${i}`
            }
            fs.renameSync(this.emlfilename, newname + '.eml')
            this.emlfilename = newname + '.eml'
        }

        return newname
    }

    _parseEnvelope(envelope, callback) {
        return new Promise((resolve) => {
            let started = 0
            let finished = 0

            const done = () => { if (started === finished) resolve() }

            const iterate = (env) => {
                if (env.header.get('content-type').type === undefined) {
                    this.textmessage = env[0]
                    done()
                    return
                }

                const { header: _, body: __, ...rest } = env

                if (Object.keys(rest).length === 0) {
                    started++
                    callback(env).then(() => { finished++; done() })
                    return
                }

                for (const prop of Object.keys(rest)) {
                    if (env[prop]?.header !== undefined) {
                        if (env[prop][0] instanceof Envelope) {
                            iterate(env[prop])
                        } else {
                            started++
                            callback(env[prop]).then(() => { finished++; done() })
                        }
                    }
                }
            }

            iterate(envelope)
        })
    }

    async saveAttachmentsFromEML() {
        this.getEnvelope()
        await this._parseEnvelope(this.email, (env) => this._checkForAttachment(env))
    }

    _checkForAttachment(envelope) {
        return new Promise((resolve, reject) => {
            const type = envelope.header.get('content-type').type

            if (['text/html', 'text/plain', 'multipart/related'].includes(type)) {
                resolve()
                return
            }

            const disposition = envelope.header.get('content-disposition')
            const filename = disposition?.parameters?.filename
                ?? envelope.header.get('content-type')?.name

            if (!filename) {
                this._log(`Skipping attachment with no filename (type: ${type})`)
                resolve()
                return
            }

            const dir = this.getEmlPath()
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

            fs.writeFile(path.join(dir, filename), envelope.body.toString(), 'base64', (err) => {
                if (err) { console.error(err); reject(err) } else resolve()
            })
        })
    }

    async convertEMLtoPDF() {
        this.getEnvelope()
        this.attachments = []
        this.htmlmessage = undefined
        this.textmessage = undefined

        await this._parseEnvelope(this.email, (env) => this._getMessageByFormat(env))

        let rawsource
        if (this.htmlmessage === undefined) {
            this._log('Falling back to plain text version')
            rawsource = '<p>' + encode(this.textmessage).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>'
        } else {
            rawsource = this._inlineImages()
        }

        this.generateEmailHeader()
        const html = this.emailheader + rawsource
        const pdffilename = this.emlfilename + '.pdf'

        return this._writepdffile(html, pdffilename)
    }

    _decodeBody(envelope) {
        const cte = envelope.header.get('content-transfer-encoding')?.toLowerCase().trim()
        const raw = envelope.body.toString()
        if (cte === 'base64') {
            return Buffer.from(raw.replace(/\s/g, ''), 'base64').toString('utf8')
        }
        return raw
    }

    _getMessageByFormat(envelope) {
        return new Promise((resolve) => {
            const contentType = envelope.header.get('content-type')
            this._log('MIME type: ' + contentType.type)

            switch (contentType.type) {
                case 'text/plain':
                    this.textmessage = this._decodeBody(envelope)
                    break
                case 'text/html':
                    this.htmlmessage = this._decodeBody(envelope)
                    break
                default:
                    if (contentType.type?.startsWith('image/')) {
                        const contentId = envelope.header.get('content-id')
                        this.attachments.push({
                            fileName: contentType.parameters?.name ?? contentId?.replace(/[<>]/g, ''),
                            contentId: contentId?.replace(/[<>]/g, ''),
                            content: envelope.body.toString(),
                        })
                    } else {
                        this._log('Unknown MIME type: ' + contentType.type)
                    }
            }

            resolve()
        })
    }

    generateEmailHeader() {
        const esc = (s) => encode(String(s ?? ''))

        const from = esc(this.email.header.get('from')[0].address)
        const date = esc(this.email.header.get('date'))
        const to = esc(this.email.header.get('to')[0].address)
        const subject = esc(this.email.header.get('subject'))

        const ccList = this.email.header.get('cc')
        const cc = ccList?.length ? ccList.map(c => esc(c.address)).join(', ') : null

        const replyToList = this.email.header.get('reply-to')
        const replyTo = replyToList?.length ? replyToList.map(c => esc(c.address)).join(', ') : null

        this.emailheader = `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;font-size:15px;line-height: 1.3em">
        <div>${from}</div>
        <div style="font-size:12px;color:silver;">${date}</div>
        <div style="font-size:12px;color:silver;">To: ${to}</div>
        ${cc ? `<div style="font-size:12px;color:silver;">Cc: ${cc}</div>` : ''}
        ${replyTo ? `<div style="font-size:12px;color:silver;">Reply-To: ${replyTo}</div>` : ''}
        <div style="font-size:12px;">${subject}</div>
        <hr style="border:none; border-top:1px solid silver;">
    </div>`
    }

    _inlineImages() {
        this._log(`Inlining ${this.attachments.length} image(s)`)
        if (this.attachments.length > 0) {
            return cid(this.htmlmessage, this.attachments.map((a, i) => ({
                ...a,
                fileName: a.fileName || String(i),
            })))
        }
        return this.htmlmessage
    }

    async _writepdffile(html, filename) {
        const options = { ...DEFAULT_PDF_OPTIONS, ...this.options.pdfOptions }
        const browser = await puppeteer.launch()
        try {
            const page = await browser.newPage()
            await page.setContent(html, { waitUntil: 'networkidle0' })
            await page.pdf({ path: filename, ...options })
        } finally {
            await browser.close()
        }
        return { filename }
    }
}
