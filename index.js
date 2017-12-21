var fs = require( 'fs' );
var pdf = require( 'html-pdf' );
var Envelope = require( 'envelope' );
var path = require('path');
var sanitize = require("sanitize-filename");
var dateFormat = require('dateformat');
var cid = require('npm-cid');
var Handlebars = require('handlebars');
const Entities = require('html-entities').AllHtmlEntities;

module.exports = Eml2Pdf = function (filename) {
    const entities = new Entities();
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
        eml2pdf.email = new Envelope(data);
    }

    this.getEmlPath = function() {
        return path.dirname(eml2pdf.emlfilename) + "/"
            + sanitize(
                dateFormat(eml2pdf.email['header']['date'], "yyyy.mm.dd") + " - " 
                + eml2pdf.email['header']['from']['name'] + " - " 
                + eml2pdf.email['header']['subject']
            );
    }

    this.renameFile = function() {
        return new Promise((resolve,reject) => {
            eml2pdf.getEnvelope();

            newname = eml2pdf.getEmlPath();
            
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
        return new Promise((resolveParseEnvelope,reject) => {
            let callbacksStarted = 0;
            let callbacksProcessed = 0;



            const done = function () {
                if (callbacksStarted === callbacksProcessed) resolveParseEnvelope();
            };
            var iterator = function(envelope,callback) {
                for (let prop in envelope) {
                    if (envelope[prop]['header'] !== undefined) {
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
                    }
                }
            };
            iterator(envelope,callback);
        });
    };

    this.saveAttachmentsFromEML = function() {
        return new Promise((resolve,reject) => {
            eml2pdf.getEnvelope();

            eml2pdf.parseEnvelope(eml2pdf.email,eml2pdf.checkForAttachment).then(function() {
                resolve();
            });
        });
    };

    this.checkForAttachment = function(envelope) {
        return new Promise((resolve,reject) => {
            if (envelope.header.contentType.name) {
                var filename = envelope.header.contentType.name;
                var filepath = eml2pdf.getEmlPath() + "/";

                if (!fs.existsSync(filepath)) {
                    fs.mkdirSync(filepath);
                }

                fs.writeFile(filepath + filename, envelope['0'], function (err) {
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
        return new Promise((resolve,reject) => {
            eml2pdf.getEnvelope();


            function getMessagebyFormat(envelope) {
                return new Promise((resolve, reject) => {
                    switch (envelope.header.contentType.mime) {
                        case "text/plain":
                            eml2pdf.textmessage = envelope[0];
                            break;
                        case "text/html":
                            eml2pdf.htmlmessage = envelope[0];
                            break;
                    }
                    if (
                        envelope.header.contentDisposition &&
                        ["attachment", "inline"].includes(envelope.header.contentDisposition.mime) &&
                        envelope['header']['contentId']
                        ) {
                        eml2pdf.attachments.push({
                            fileName: envelope['header']['contentType']['name'],
                            contentId: envelope['header']['contentId'].replace('\>', '').replace('\<', ''),
                            content: envelope['0']
                        });
                    }
                    resolve();
                });
            }

            eml2pdf.parseEnvelope(eml2pdf.email, getMessagebyFormat).then(() => {
                if (eml2pdf.htmlmessage === undefined) {
                    // settle with plain text version of message
                    rawsource = '<p>' + entities.encode(eml2pdf.textmessage).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>") + '</p>';
                    ;
                } else {
                    // we have a formatted html message
                    // inline images in the message
                    rawsource = eml2pdf.inlineImages();
                }
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
                let pdffilename = eml2pdf.getEmlPath() + ".pdf";

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
            from: eml2pdf.email.header.from.address,
            date: eml2pdf.email.header.date,
            to: eml2pdf.email.header.to.address,
            subject: eml2pdf.email.header.subject,
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
        if (eml2pdf.attachments.length > 0){
            return cid(eml2pdf.htmlmessage, eml2pdf.attachments);
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