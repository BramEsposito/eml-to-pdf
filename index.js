import fs from 'fs' ;
import pdf from 'html-pdf' ;
import Envelope from 'envelope';
import path from 'path';
import sanitize from "sanitize-filename";
import dateFormat from 'dateformat';
import cid from 'npm-cid';
import Handlebars from 'handlebars';
// const Entities = require('html-entities').AllHtmlEntities;
import {encode} from 'html-entities';

const debug = function(msg) {
    console.log(msg)
}

export default function (filename) {

    var eml2pdf = this;
    this.email;
    this.emlfilename = filename;
    this.emailheader;
    this.textmessage;
    this.htmlmessage;
    this.attachments = Array();

    this.getEnvelope = function() {
        if (eml2pdf.email != undefined) return;
        var data = fs.readFileSync(this.emlfilename);
        data = data.toString();
        if (data.indexOf("\r\n") === -1) {
            // fix newlines in eml files from apple mail app
            data = data.replace(/\n/gi,"\r\n");
        }

        eml2pdf.email = new Envelope(data);
    }

    this.getEmlPath = function() {
        return path.dirname(eml2pdf.emlfilename) + "/"
            + sanitize(
                dateFormat(eml2pdf.email['header'].get('date'), "yyyy.mm.dd") + " - "
                + eml2pdf.email['header'].get('from')[0].name + " - "
                + eml2pdf.email['header'].get('subject')
            );
    }

    this.renameFile = function() {
        return new Promise((resolve) => {
            eml2pdf.getEnvelope();

            let newname = eml2pdf.getEmlPath();

            if (this.emlfilename !== newname + ".eml") {

                if (fs.existsSync(newname + ".eml")) {
                    let i = 1;
                    while (fs.existsSync(newname + "_" + i + ".eml")) {
                        i++;
                    }
                    newname = newname + "_" + i;
                }

                fs.renameSync(this.emlfilename, newname + ".eml");
                this.emlfilename = newname;
                resolve(newname);
            } else {
                this.emlfilename = newname;
                resolve(newname);
            }
        });
    }

    this.parseEnvelope = function(envelope,callback) {
        return new Promise((resolveParseEnvelope) => {
            let callbacksStarted = 0;
            let callbacksProcessed = 0;



            const done = function () {
                if (callbacksStarted === callbacksProcessed) resolveParseEnvelope();
            };
            var iterator = function(envelope,callback) {
                // for (const prop in envelope) {
                //     dumpToFile(envelope[prop],prop+".txt");
                // }

                // console.log("Content-type:", envelope.header.get('content-type') );
                // console.log("name", envelope.header.get('content-type').name);
                if (envelope.header.get('content-type').type === undefined) {
                    // plaintext only mail
                    eml2pdf.textmessage = envelope[0];
                    done();
                } else {
                    // most likely multipart mail
                    // console.log(Object.keys(envelope));
                    // Do not parse the header and body of the Envelope
                    const {header: _, body: __, ...rest} = envelope;
                    for (let prop in rest) {

                        if (Object.keys(envelope).length > 2 && prop !== "body") {
                            // console.log("prop", prop);

                            if (envelope[prop]['header'] !== undefined) {
                                // console.log("ENVELOPE HEADER", envelope[prop].header);
                                // if this Envelope contains more Envelopes
                                if (envelope[prop]['0'] instanceof Envelope) {
                                    iterator(envelope[prop], callback);
                                } else {
                                    callbacksStarted++;
                                    // run callback when no child Envelopes in this Envelope
                                    callback(envelope[prop]).then(function () {
                                        callbacksProcessed++;
                                        done();
                                    });

                                }
                            } else {
                                console.log("No header on this envelope prop:", prop)
                                console.log(envelope[prop]);
                            }
                        } else {
                            callback(envelope).then(function () {
                                done();
                            });
                        }
                    }
                }
            };
            iterator(envelope,callback);
        });
    };

    this.saveAttachmentsFromEML = async () => {
        await eml2pdf.getEnvelope();
        await eml2pdf.parseEnvelope(eml2pdf.email,eml2pdf.checkForAttachment)
    }

    this.saveAttachmentsFromEML_old = function() {
        return new Promise((resolve) => {
            eml2pdf.getEnvelope();

            eml2pdf.parseEnvelope(eml2pdf.email,eml2pdf.checkForAttachment).then(function() {
                resolve();
            });
        });
    };

    this.checkForAttachment = function(envelope) {
        return new Promise((resolve,reject) => {
            debug(eml2pdf.attachments);
            if (!["text/html", "text/plain", "multipart/related"].includes(envelope.header.get('content-type').type)) {
                console.log("name", envelope.header);
                var filename = envelope.header.get('content-disposition').parameters.filename;
                var filepath = eml2pdf.getEmlPath() + "/";

                if (!fs.existsSync(filepath)) {
                    fs.mkdirSync(filepath);
                }

                fs.writeFile(filepath + filename, envelope.body.toString(), 'base64', function (err) {
                    if (err) {
                        console.log(err);
                        reject();
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    };

     this.convertEMLtoPDF = function(){
        return new Promise((resolve) => {
            eml2pdf.getEnvelope();


            function getMessagebyFormat(envelope) {
                return new Promise((resolve) => {
                    console.log("MIME type: "+JSON.stringify(envelope.header.get('content-type')));
                    debug(envelope)
                    switch (envelope.header.get('content-type').type) {
                        case "text/plain":
                            eml2pdf.textmessage = envelope.body.toString();
                            break;
                        case "text/html":
                            eml2pdf.htmlmessage = envelope.body.toString();
                            break;

                        case "multipart/related":
                            eml2pdf.htmlmessage = envelope[0].body.toString();
                            break;

                        case "image/png":
                            eml2pdf.attachments.push({
                                fileName: envelope.header.get('content-id'),
                                contentId: envelope.header.get('content-id').replace('>', '').replace('<', ''),
                                content: envelope.body.toString()
                            })
                            break;
                        default:
                            debug ("Unknown MIME type: "+envelope.header.get('content-type').type);
                    }
                    if (
                        envelope.header.contentDisposition &&
                        ["attachment", "inline"].includes(envelope.header.contentDisposition.mime) &&
                        envelope['header']['contentId']
                        ) {
                        eml2pdf.attachments.push({
                            fileName: envelope.header.get('content-type').name,
                            contentId: envelope['header']['contentId'].replace('>', '').replace('<', ''),
                            content: envelope['0']
                        });
                    }
                    resolve();
                });
            }
            if (eml2pdf.email.length > 1 && eml2pdf.email[1].length > 1) {
                console.log(eml2pdf.email[1][0].body.toString())
            }
            // console.log(eml2pdf.email[1][1].body.toString());

            eml2pdf.parseEnvelope(eml2pdf.email, getMessagebyFormat).then(() => {
                let rawsource = "";
                if (eml2pdf.htmlmessage === undefined) {
                    debug("Falling back to txt version of message");
                    // settle with plain text version of message
                    rawsource = '<p>' + encode(eml2pdf.textmessage).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>") + '</p>';
                    ;
                } else {
                    // we have a formatted html message
                    // inline images in the message
                    rawsource = eml2pdf.inlineImages();
                }
                console.log(rawsource)
                eml2pdf.generateEmailHeader();
                var message = eml2pdf.emailheader;

                message = message.concat(rawsource);

                var options = {
                    // format: 'A4',
                    // zoomFactor: "1",
                    width: "280mm", // * 4/3, // avoid pantomjs bug
                    height: "396mm", // * 4/3 // avoid pantomjs bug
                    border: "1cm"
                };
                let pdffilename = eml2pdf.emlfilename + ".pdf";

                fs.writeFile(eml2pdf.emlfilename + ".txt", message, function(){});

                eml2pdf.writepdffile(message, pdffilename, options).then((result) => {
                    resolve(result);
                });
            });
        });
    };

    this.generateEmailHeader = function() {
        var source = `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;font-size:15px;line-height: 1.3em">
        <div>{{from}}</div>
        <div style="font-size:12px;color:silver;">{{date}}</div>
        <div style="font-size:12px;color:silver;">To: {{to}}</div>
        {{#if cc}}
        <div style="font-size:12px;color:silver;">Cc: {{cc}}</div>
        {{/if}}
        {{#if replyTo}}
        <div style="font-size:12px;color:silver;">Reply-To: {{replyTo}}</div>
        {{/if}}
        <div style="font-size:12px;">{{subject}}</div>
        <hr style="border:none; border-top:1px solid silver;">
    </div>`;

        var template = Handlebars.compile(source);
        var data = {
            from: eml2pdf.email.header.get('from')[0].address,
            date: eml2pdf.email.header.get('date'),
            to: eml2pdf.email.header.get('to')[0].address,
            subject: eml2pdf.email.header.get('subject'),
        };
        if (eml2pdf.email.header.cc) {
            data.cc = eml2pdf.email.header.cc.address;
        }

        if (eml2pdf.email.header.replyTo) {
            data.replyTo = eml2pdf.email.header.replyTo.address;
        }

        eml2pdf.emailheader = template(data);
    }

    this.inlineImages = function() {
        debug("Number of attachments for this message: "+eml2pdf.attachments.length);
        if (eml2pdf.attachments.length > 0){
            return cid(eml2pdf.htmlmessage, eml2pdf.attachments.map((attachment, i) => ({ ...attachment, fileName: attachment.fileName || i.toString() })));
        } else {
            return eml2pdf.htmlmessage;
        }
    };

    this.writepdffile = function(html,pdffilename,options) {
        return new Promise((resolve, reject) => {
            // Generate PDF
            pdf.create(html, options).toFile(pdffilename, function (err, res) {
                if (err) return reject(err);
                resolve(res);
            });
        });
    }
}
