define([
	'jquery',
	'three-js',
	'./util/OBJLoader.js'
], function ($, THREE) {
	'use strict';


	/* the plugin */
	var plugin = $.circuitboard.plugin({
		name: 'three-d-geometric-models-obj',
		requires: ['three-d-geometric-models']
	});


	/* the loader */
	plugin.add('Circuitboard.threeJsLoaders.obj', THREE.OBJLoader);


});
