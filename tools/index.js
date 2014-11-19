'use strict';


var fs = require('fs');
var csv = require('csv');


var fmaToENSGs = {};


csv.parse(fs.readFileSync('./filtered-pairs.csv'), { columns: true, trim: true }, function (err, data) {

	if (err) {
		console.error(err);
		debugger;
	}

	data.forEach(function (item) {
		[1, 2].forEach(function (nr) {
			item['EnsemblID' + nr + '.tissueTypes'].split(';').forEach(function (fma) {
				if (!fmaToENSGs[fma]) { fmaToENSGs[fma] = []; }
				fmaToENSGs[fma].push(item['EnsemblID' + nr]);
			});
		});
	});

	fs.writeFileSync('./fma-to-ensg.json', JSON.stringify(fmaToENSGs, null, '    '));
});


