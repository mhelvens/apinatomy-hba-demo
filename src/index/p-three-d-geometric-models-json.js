define([
	'jquery',
	'three-js'
], function ($, THREE) {
	'use strict';


	/* the plugin */
	var plugin = $.circuitboard.plugin({
		name: 'three-d-geometric-models-json',
		requires: ['three-d-geometric-models']
	});


	/* the loader */
	plugin.add('Circuitboard.threeJsLoaders.json', THREE.JSONLoader);


});
