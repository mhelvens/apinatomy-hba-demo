require('./index.scss');
require('apinatomy/circuitboard');


/* the application itself */
require([
	'jquery',
	'bluebird',

	/* plugins */
	'apinatomy/p-core',
	'apinatomy/p-tile-skin',
	'apinatomy/p-tile-spacing',
	'apinatomy/p-tile-click-to-open',
	'apinatomy/p-tile-weight',
	'apinatomy/p-tile-active',
	'apinatomy/p-tile-open',
	'apinatomy/p-tile-grow-when-open',
	'apinatomy/p-tile-open-active',
	'apinatomy/p-tile-skin-grow-when-open',
	'apinatomy/p-position-tracking',
	'apinatomy/p-transition-position-tracking',
	'apinatomy/p-tile-hidden',
	'apinatomy/p-tile-maximized',
	'apinatomy/p-tile-middleclick-to-maximize',
	'apinatomy/p-d3',
	'apinatomy/p-three-d',
	'apinatomy/p-three-d-geometric-models',
	'./p-three-d-geometric-models-obj.js',
	'./p-three-d-geometric-models-json.js',
	//'apinatomy/p-three-d-geometric-models-stl',
	'apinatomy/p-d3-three-d',
	'./p-proteins.js'
], function ($, P) {
	'use strict';


	/* select ApiNATOMY plugins */
	$.circuitboard.plugin([
		'tile-skin',
		'tile-click-to-open',
		'tile-grow-when-open',
		'tile-middleclick-to-maximize',
		'tile-spacing',
		'tile-active',
		'three-d',
		'proteins',
		'three-d-geometric-models-obj',
		'three-d-geometric-models-json'
		//'three-d-geometric-models-stl',
		//'vascularization'
	]);


	/* need to load this after plugin-selection */
	var getFmaModels = require('./restricted-fma-model.js');


	/* instantiate the circuit-board */
	$('#circuitboard').circuitboard({
		model: getFmaModels(['24tile:60000000'])[0],
		tileSpacing: 1,
		tilemapMargin: 0,
		weightWhenOpen: 8,
		threeDCanvasElement: $('#three-d-canvas'),
		threeDModels: {
			'fma:7148':  [ require('./3d-models/FMA7148_Stomach.obj') ],
			'fma:7197':  [ require('./3d-models/FMA7197_Liver.obj') ],
			'fma:7203':  [ require('./3d-models/FMA7204_Right_Kidney.obj') ],
			'fma:67944': [ require('./3d-models/FMA67944_Cerebellum.obj') ]//,
			//'fma:9462':  [ require('./3d-models/contracting-heart-2.3d.json') ]
		}
	}).circuitboard('instance').then(function (circuitboard) {

		console.info('circuitboard loaded');

		$('#checkbox-3d-protein-domains').on('change', function () {
			circuitboard.proteinDomainsVisible = $(this).prop('checked');
		});

		$('#checkbox-3d-geometric-models').on('change', function () {
			circuitboard.geometricModelsVisible = $(this).prop('checked');
		});

	});




});
