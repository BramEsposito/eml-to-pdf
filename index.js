var fs = require( 'fs' )
var pdf = require( 'html-pdf' );
var Envelope = require( 'envelope' )
var utf8 = require('utf8');
var quotedPrintable = require('quoted-printable');
 
// Read email into a buffer 
var data = fs.readFileSync( './test.eml' )
 
// Construct envelope 
var email = new Envelope( data );
var html =  utf8.decode(quotedPrintable.decode(email['1']['0']));

var options = { format: 'A4' };

// Generate PDF
pdf.create(html, options).toFile('./test.pdf', function(err, res) {
  if (err) return console.log(err);
  console.log(res); // { filename: '/app/test.pdf' }
});