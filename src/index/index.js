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
	//'apinatomy/p-three-d-geometric-models',
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
		'proteins'
		//'three-d-geometric-models-stl',
		//'vascularization'
	]);


	/* need to load this after plugin-selection */
	var getFmaModels = require('apinatomy/fma-model');


	/* instantiate the circuit-board */
	$('#circuitboard').circuitboard({
		model: getFmaModels(['24tile:60000000'])[0],
		tileSpacing: 1,
		tilemapMargin: 0,
		weightWhenOpen: 8,
		threeDCanvasElement: $('#three-d-canvas')
	}).circuitboard('instance').then(function (circuitboard) {

		console.info('circuitboard loaded');

	});




});
