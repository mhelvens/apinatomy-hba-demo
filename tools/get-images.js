'use strict';

/////////////////////////////////////////////////////////

var fs = require('fs');
var http = require('http');
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var Q = require('q');
var P = require('bluebird');

var fmaToEnsg = JSON.parse(fs.readFileSync('./mappings/fma-to-ensg.json'));
var ensgToEnsp = JSON.parse(fs.readFileSync('./mappings/ensg-to-ensp.json'));
var fmaToName = JSON.parse(fs.readFileSync('./mappings/fma-to-name.json'));
var fmaNameToId = JSON.parse(fs.readFileSync('./mappings/fma-name-to-id.json'));

/////////////////////////////////////////////////////////

var fmaNames = Object.keys(fmaNameToId);
var ensgs = Object.keys(ensgToEnsp);

/////////////////////////////////////////////////////////

function getEnsgDoc(ensg) {
	return new P(function (resolve, reject) {
		http.get("http://www.proteinatlas.org/" + ensg + ".xml", function (res) {
			var xmlText = "";
			res.on('data', function (chunk) {
				xmlText += chunk;
			}).on('error', function (err) {
				reject(err);
			}).on('end', function () {
				var result = new dom().parseFromString(xmlText);
				result.ensg = ensg;
				resolve(result);
			});
		});
	});
}

function docToImageUrl(doc, fmaName) {
	return xpath.select(
			"//tissueExpression[@assayType='tissue']"    +
			"/image[./tissue[text()='" + fmaName + "']]" +
			"/imageUrl"                                  +
			"/text()", doc).toString();
}

/////////////////////////////////////////////////////////


var ensgToFmaToImageUrl = {};

P.resolve(ensgs).map(getEnsgDoc).each(function (doc) {

	console.log('---------- ' + doc.ensg);

	ensgToFmaToImageUrl[doc.ensg] = {};

	fmaNames.forEach(function (fmaName) {
		var url = docToImageUrl(doc, fmaName);
		if (url.length > 0) {

			console.log('- ' + fmaName);

			ensgToFmaToImageUrl[doc.ensg][fmaNameToId[fmaName]] = url;

		}
	});

}).then(function () {

	fs.writeFileSync('ensg-to-fma-to-imageurl.json', JSON.stringify(ensgToFmaToImageUrl, null, '    '));

});


//
//getEnsgDoc('ENSG00000121410').then(function (doc) {
//
//	console.log(docToImageUrl(doc, 'liver'));
//
//});
//




