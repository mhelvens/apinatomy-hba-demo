define([
	'jquery',
	'three-js',
	'apinatomy/D3Group',
	'apinatomy/D3Vertex',
	'./fma-to-ensg.json',
	'./ensg-to-ensp.json',
	'./ensp-to-domains.json',
	'./ColorRange.js',
	'chroma-js',
	'./p-proteins.scss'
], function ($, THREE, D3Group, D3Vertex, fmaToEnsg, ensgToEnsp, enspToDomains, ColorRange, Chroma) {
	'use strict';


	var plugin = $.circuitboard.plugin({
		name: 'proteins',
		requires: ['d3', 'three-d']
	}).modify('Tile.prototype');


	/////////////////////////////////////////////////

	var colorRange = new ColorRange();
	var colorMap = {};

	function domainColor(domain) {
		if (domain.type === 'signalp') {
			return Chroma.hex('#000');
		} else if (!domain.pfam_id) {
			return Chroma.hex('#888');
		}
		if (!colorMap[domain.pfam_id]) {
			colorMap[domain.pfam_id] = colorRange.next();
		}
		return colorMap[domain.pfam_id];
	}

	/////////////////////////////////////////////////


	plugin.insert('construct', function () {


		if (!this.model) { return }


		var graphGroup = new D3Group({
			parent: this,
			gravityFactor: 1,
			chargeFactor: 2.5
		});
		((setGraphGroupRegion) => {
			setGraphGroupRegion();
			this.on('size', setGraphGroupRegion);
			this.on('position', setGraphGroupRegion);
		})(() => {
			var AREA_MARGIN = 5;
			graphGroup.setRegion({
				top: this.position.top + AREA_MARGIN,
				left: this.position.left + AREA_MARGIN,
				height: this.size.height - 2 * AREA_MARGIN,
				width: this.size.width - 2 * AREA_MARGIN
			});
		});


		this.model.then((model) => {

			var ensps = {};
			( fmaToEnsg[model.id] || [] ).forEach((ensg) => {
				( ensgToEnsp[ensg] || [] ).forEach((ensp) => {
					ensps[ensp] = true;
				});
			});
			Object.keys(ensps).forEach((ensp) => {
				this.observeValue('visible', true, () => {

					var onHide = this.oneValue('visible', false);


					/* create the vertex */
					var protein = new D3Vertex({
						id: `${model.id}:protein:${ensp}`,
						parent: graphGroup,
						cssClass: 'example'
					});
					graphGroup.addVertex(protein);
					onHide(() => {
						protein.destroy();
						protein = undefined;
						graphGroup.removeVertex(protein);
					});


					/* create the domain visualization (kebab) */

					// Creating the kebab
					var kebab = new THREE.Object3D();
					this.circuitboard.object3D.add(kebab);
					kebab.rotation.x = THREE.Math.degToRad(-90);
					kebab.scale.y = -0.2;
					this.oneValue('visible', false, () => {
						this.circuitboard.object3D.remove(kebab);
					});

					// Creating the stick
					var stickMaterial = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
					var stickGeometry = new THREE.CylinderGeometry(1, 1, enspToDomains[ensp].length, 32);
					var kebabStick = new THREE.Mesh(stickGeometry, stickMaterial);
					kebabStick.translateY(enspToDomains[ensp].length / 2);
					kebab.add(kebabStick);

					// Populating the kebab
					enspToDomains[ensp].domains.forEach((domain) => {
						var domainGeometry = new THREE.CylinderGeometry(3, 3, 1, 32);
						var domainMaterial = new THREE.MeshLambertMaterial({ color: domainColor(domain).hex() });
						var domainObject = new THREE.Mesh(domainGeometry, domainMaterial);
						domainObject.translateY(0.5 * domain.start + 0.5 * domain.end);
						domainObject.scale.y = (domain.end - domain.start);
						kebab.add(domainObject);
					});

					// synchronize the kebab with the protein
					protein.observe('x', (x) => { kebab.position.x = x }).unsubscribeOn(onHide);
					protein.observe('y', (y) => { kebab.position.y = y }).unsubscribeOn(onHide);


				});
			});
		});


	});
});
