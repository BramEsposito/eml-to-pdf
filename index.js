#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const Eml2Pdf = require("./eml-to-pdf");

if (require.main === module) {
  const emlPath = process.argv[2];

  if (!fs.existsSync(emlPath)) {
    console.error(
      "Please specify a valid EML file path, or a directory path containing EML files"
    );
    process.exit(1);
  }

  if (fs.lstatSync(emlPath).isDirectory()) {
    const files = fs.readdirSync(emlPath);
    const emlFiles = files
      .filter(Boolean)
      .filter((file) => file.endsWith(".eml"))
      .map((file) => path.join(emlPath, file));
    recurseDir(emlFiles);
  } else {
    convertToPDF(emlPath);
  }
} else {
  module.exports = Eml2Pdf;
}

function recurseDir(files) {
  const emlFile = files[0];
  if (emlFile) {
    console.log(`Processing ${emlFile}`);

    convertToPDF(emlFile).finally(() => {
      recurseDir(files.slice(1));
    });
  }
}

function convertToPDF(emlFile) {
  var eml2pdf = new Eml2Pdf(emlFile);

  return eml2pdf
    .convertEMLtoPDF()
    .then((output) => {
      console.log(output);
    })
    .catch((err) => {
      console.error(err);
    });
}
