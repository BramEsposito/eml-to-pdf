# eml-to-pdf
Convert EML email files to PDF.

[EML files](http://forensicswiki.org/wiki/EML) are email messages in MIME RFC 822 standard format.

## Usage

This module is usable in three related use cases:

- rename the EML file to a recognisable file
- save attachments from the message to disk
- save the message to a PDF file, with an email header

## Rename the email message 

Rename the eml file using data from the email message in this format: ```yyyy.mm.dd - from.name - subject.eml```

Files with the same filename will receive a trailing counter, eg: ```yyyy.mm.dd - from.name - subject_1.eml```.

```javascript
var eml2pdf = new Eml2Pdf("filename.eml");

eml2pdf.renameFile();
```

**TODO**: allow custom filename formatting

## Save attachments to disk

Save the attachments in the email message to disk. These will be saved along the EML file in a subdirectory named with the naming scheme from ```renameFile```.

```javascript
var eml2pdf = new Eml2Pdf("filename.eml");

eml2pdf.saveAttachmentsFromEML();
```

**TODO**: accept a default directory as parameter where attachments will be saved

## Convert email message to PDF

A pdf file will be saved to disk with the naming scheme from ```renameFile``` . It will have a header containing time, sender, receiver, Reply-to, CC and subject.

```javascript
var eml2pdf = new Eml2Pdf("filename.eml");

eml2pdf.convertEMLtoPDF();
```

- **TODO**: add a table with attachments info at the end of the pdf 
- **TODO**: provide ability to set scaling options for the PDF
- **TODO**: reduce the impact from message CSS on the header layout

**KNOWN ISSUES**: the PDF will be scaled on HiDPI screens. 

## Installation

Clone this repository or run 

```
npm install eml-to-pdf
```

## License

ISC

## Feedback 

Feedback and pull requests are welcome
