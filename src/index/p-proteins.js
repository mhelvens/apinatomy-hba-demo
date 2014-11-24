define([
	'jquery',
	'bluebird',
	'./util/misc.js',
	'three-js',
	'apinatomy/D3Group',
	'apinatomy/D3Vertex',
	'./fma-to-ensg.json',
	'./ensg-to-ensp.json',
	'./ensp-to-domains.json',
	'./ensg-to-fma-to-imageurl.json',
	'./util/ColorRange.js',
	'chroma-js',
	'./p-proteins.scss'
], function ($, P, U, THREE, D3Group, D3Vertex, fmaToEnsg, ensgToEnsp, enspToDomains, ensgToFmaToImageUrl, ColorRange, Chroma) {
	'use strict';


	var plugin = $.circuitboard.plugin({
		name: 'proteins',
		requires: ['d3', 'three-d', 'tile-skin']
	});


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

	function createKebab(ensp) {
		// Creating the kebab
		var kebab = new THREE.Object3D();
		kebab.rotation.x = THREE.Math.degToRad(-90);

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

		return kebab;
	}

	/////////////////////////////////////////////////


	plugin.insert('Tile.prototype.construct', function () {


		if (!this.model) { return }


		var graphGroup = new D3Group({
			parent: this,
			gravityFactor: 1,
			chargeFactor: 2
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


		var ensps = {};
		( fmaToEnsg[this.model.id] || [] ).forEach((ensg) => {
			( ensgToEnsp[ensg] || [] ).forEach((ensp) => {
				ensps[ensp] = true;
			});
		});
		Object.keys(ensps).forEach((ensp) => {
			this.observeValue('visible', true, () => {

				/* create the vertex */
				var protein = new D3Vertex({
					id: `${this.model.id}:${ensp}`,
					parent: graphGroup,
					cssClass: 'protein'
				});
				graphGroup.addVertex(protein);
				this.oneValue('visible', false)(() => {
					protein.destroy();
					protein = undefined;
					graphGroup.removeVertex(protein);
				});
				this.observe('open', (open) => {
					protein.visible = !open;
				});


				/* create the domain visualization (kebab) */
				var kebab = createKebab(ensp);
				this.circuitboard.object3D.add(kebab);
				kebab.scale.y = -0.2; // negative because of the y axis flip of the circuitboard object
				this.oneValue('visible', false)(() => {
					this.circuitboard.object3D.remove(kebab);
				});
				this.observe('open', (open) => {
					kebab.visible = !open;
				});

				/* synchronize the kebab with the protein */
				protein.observe('x', (x) => { kebab.position.x = x }).unsubscribeOn(this.oneValue('visible', false));
				protein.observe('y', (y) => { kebab.position.y = y }).unsubscribeOn(this.oneValue('visible', false));


			});
		});
	});


	var GeneModel = U.newClass(function (options) {
		U.extend(this, options);
	}, {
		get id() { return this._id },
		get type() { return 'gene' }
	});


	var ProteinModel = U.newClass(function (options) {
		U.extend(this, options);
	}, {
		get id() { return this._id },
		get type() { return 'protein' }
	});


	plugin.replaceAround('FmaModel.prototype.getChildIds', (original) => function () {
		var result = original.call(this);
		( fmaToEnsg[this.id] || [] ).forEach((ensg) => {
			//( ensgToEnsp[ensg] || [] ).forEach((ensp) => {
			//	result.push(ensp);
			//	U.object(this, '_enspToEnsg')[ensp] = ensg; // choosing only one ENSG per ENSP
			//});
			result.push(ensg);
		});
		return result;
	});


	plugin.replaceAround('FmaModel.prototype.getModels', (original) => function (ids) {
		var fmaIds = ids.filter((id) => id.substring(0, 4) === 'fma:' || id.substring(0, 7) === '24tile:');
		var result = original.call(this, fmaIds);

		var geneIds = ids.filter((id) => id.substring(0, 5) === 'gene:');
		var proteinModels = geneIds.map((id) => {
			var promise = P.resolve(new GeneModel({
				_id: id,
				name: '' // TODO: temporary, to not show any name in the tile
			}));
			promise.id = id;
			promise.type = 'gene';
			return promise;
		});
		[].push.apply(result, proteinModels);

		return result;
	});


	/* don't allow gene tiles to be opened */
	plugin.append('Tile.prototype.construct', function () {
		if (this.model && this.model.type === 'gene') {
			this.observeValue('open', true, () => { this.open = false });
		}
	});


	/* give gene tiles a pretty picture */
	plugin.append('Tile.prototype.construct', function () {
		if (this.model && this.model.type === 'gene') {

			P.all([this.model, this.parent.model]).then(([ensgModel, fmaModel]) => {

				if (ensgToFmaToImageUrl[ensgModel.id] && ensgToFmaToImageUrl[ensgModel.id][fmaModel.id]) {

					console.log(ensgToFmaToImageUrl[ensgModel.id][fmaModel.id]);

					this.element.children('header').css({
						backgroundImage: `url(${ensgToFmaToImageUrl[ensgModel.id][fmaModel.id]})`,
						backgroundSize: 'cover'
					});
				} else {
					this.element.children('header').css({
						backgroundColor: 'red'
					});
				}

			});


		}
	});

	/* give gene tiles their very own kebab */
	plugin.append('Tile.prototype.construct', function () {
		if (this.model && this.model.type === 'gene') {


			var graphGroup = new D3Group({
				parent: this,
				gravityFactor: 1.2,
				chargeFactor: 1
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


			var ensps = {};
			( ensgToEnsp[this.model.id] || [] ).forEach((ensp) => {
				ensps[ensp] = true;
			});
			Object.keys(ensps).forEach((ensp) => {
				this.observeValue('visible', true, () => {

					/* create the vertex */
					var protein = new D3Vertex({
						id: `${this.model.id}:${ensp}`,
						parent: graphGroup,
						cssClass: 'protein'
					});
					graphGroup.addVertex(protein);
					this.oneValue('visible', false)(() => {
						protein.destroy();
						protein = undefined;
						graphGroup.removeVertex(protein);
					});
					this.observe('open', (open) => {
						protein.visible = !open;
					});


					/* create the domain visualization (kebab) */
					var kebab = createKebab(ensp);
					this.circuitboard.object3D.add(kebab);
					kebab.scale.y = -0.2; // negative because of the y axis flip of the circuitboard object
					this.oneValue('visible', false)(() => {
						this.circuitboard.object3D.remove(kebab);
					});
					this.observe('open', (open) => {
						kebab.visible = !open;
					});

					/* synchronize the kebab with the protein */
					protein.observe('x', (x) => { kebab.position.x = x }).unsubscribeOn(this.oneValue('visible', false));
					protein.observe('y', (y) => { kebab.position.y = y }).unsubscribeOn(this.oneValue('visible', false));


				});
			});









			//this.observeValue('visible', true, () => {
			//
			//
			//	//var kebab = createKebab(this.model.id);
			//	//kebab.scale.y = 0.2;
			//	//kebab.rotation.x = THREE.Math.degToRad(90);
			//	//this.object3D.add(kebab);
			//	//this.oneValue('visible', false)(() => {
			//	//	this.object3D.remove(kebab);
			//	//});
			//	//this.observe('open', (open) => {
			//	//	kebab.visible = !open;
			//	//});
			//
			//
			//
			//
			//
			//	/* create the vertex */
			//	var protein = new D3Vertex({
			//		id: `${this.model.id}:${ensp}`,
			//		parent: graphGroup,
			//		cssClass: 'protein'
			//	});
			//	graphGroup.addVertex(protein);
			//	this.oneValue('visible', false)(() => {
			//		protein.destroy();
			//		protein = undefined;
			//		graphGroup.removeVertex(protein);
			//	});
			//	this.observe('open', (open) => {
			//		protein.visible = !open;
			//	});
			//
			//
			//	/* create the domain visualization (kebab) */
			//	var kebab = createKebab(ensp);
			//	this.circuitboard.object3D.add(kebab);
			//	kebab.scale.y = -0.2; // negative because of the y axis flip of the circuitboard object
			//	this.oneValue('visible', false)(() => {
			//		this.circuitboard.object3D.remove(kebab);
			//	});
			//	this.observe('open', (open) => {
			//		kebab.visible = !open;
			//	});
			//
			//	/* synchronize the kebab with the protein */
			//	protein.observe('x', (x) => { kebab.position.x = x }).unsubscribeOn(this.oneValue('visible', false));
			//	protein.observe('y', (y) => { kebab.position.y = y }).unsubscribeOn(this.oneValue('visible', false));
			//
			//
			//
			//
			//
			//
			//
			//});
		}
	});




});
