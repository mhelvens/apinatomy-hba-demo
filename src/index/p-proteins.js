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


	////////// utility functions ///////////////////////////////////////

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
		/* creating the kebab */
		var kebab = new THREE.Object3D();
		kebab.rotation.x = THREE.Math.degToRad(-90);

		/* creating the stick */
		var stickMaterial = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
		var stickGeometry = new THREE.CylinderGeometry(1, 1, enspToDomains[ensp].length, 32);
		var kebabStick = new THREE.Mesh(stickGeometry, stickMaterial);
		kebabStick.translateY(enspToDomains[ensp].length / 2);
		kebab.add(kebabStick);

		/* populating the kebab */
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

	function idPrefix(id) {
		return id.substr(0, id.indexOf(':'));
	}

	function idWithoutPrefix(id) {
		return id.substr(id.indexOf(':') + 1);
	}

	////////////////////////////////////////////////////////////////////


	/* add proteins and kebabs  */
	plugin.insert('Tile.prototype.construct', function () {


		/* only interested in fma tiles with a model */
		if (!this.model || this.model.type !== 'fma') { return }


		/* gather proteins to show kebabs for */
		var ensps = {};
		( fmaToEnsg[this.model.id] || [] ).forEach((ensg) => {
			if (ensgToEnsp[ensg]) { ensps[ensgToEnsp[ensg][0]] = true } // show only one protein per gene
		});

		/* stop now if there are no proteins to show */
		if (Object.keys(ensps).length === 0) { return }


		/* the graph group for this tile */
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


		Object.keys(ensps).forEach((ensp) => {
			this.observeValue('visible', true, () => {

				/* create the vertex */
				var protein = new D3Vertex({
					id: `${this.model.id}:${ensp}`,
					parent: graphGroup,
					cssClass: 'protein'
				});
				graphGroup.addVertex(protein);
				this.oneValue('visible', false, () => {
					protein.destroy();
					protein = undefined;
					graphGroup.removeVertex(protein);
				});
				this.oneValue('visible', false, this.observe('open', (open) => {
					protein.visible = !open;
				}));


				/* create the domain visualization (kebab) */
				var kebab = createKebab(ensp);
				this.circuitboard.object3D.add(kebab);
				kebab.scale.y = -0.2; // negative because of the y axis flip of the circuitboard object
				this.oneValue('visible', false, () => {
					this.circuitboard.object3D.remove(kebab);
				});
				this.oneValue('visible', false, this.observe('open', (open) => {
					kebab.visible = !open && this.circuitboard.proteinDomainsVisible;
				}));
				this.circuitboard.observe('proteinDomainsVisible', (visible) => {
					kebab.visible = visible && !this.open;
				}); // TODO: Bacon.js property combining awesomeness

				/* synchronize the kebab with the protein */
				this.oneValue('visible', false, protein.observe('x', (x) => { kebab.position.x = x }));
				this.oneValue('visible', false, protein.observe('y', (y) => { kebab.position.y = y }));


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
		var result = [];
		var enspsWeAlreadyHave = {};
		( fmaToEnsg[this.id] || [] ).forEach((ensg) => {
			if (enspsWeAlreadyHave[ensgToEnsp[ensg]]) { return }
			enspsWeAlreadyHave[ensgToEnsp[ensg]] = true;
			result.push(ensg);
		});
		if (result.length === 0) { // only show normal (partonomy/subclass) children if there are no gene children
			result = original.call(this);
		}
		return result;
	});


	plugin.replaceAround('FmaModel.prototype.getModels', (original) => function (ids) {
		var fmaIds = ids.filter((id) => idPrefix(id) === 'fma' || idPrefix(id) === '24tile');
		var result = original.call(this, fmaIds);

		var geneIds = ids.filter((id) => idPrefix(id) === 'gene');
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


	/* give gene tiles a pretty picture and tooltip text */
	plugin.append('Tile.prototype.construct', function () {
		if (this.model && this.model.type === 'gene') {

			P.all([this.model, this.parent.model]).then(([ensgModel, fmaModel]) => {

				var imageUrl = ensgToFmaToImageUrl[ensgModel.id] && ensgToFmaToImageUrl[ensgModel.id][fmaModel.id];

				if (!imageUrl) {
					this.observeValue('visible', true, () => { this.visible = false });
				}

				this.element.children('header').css(imageUrl ? {
					backgroundImage: `url(${imageUrl})`,
					backgroundSize: 'cover'
				} : {
					backgroundColor: 'red'
				}).attr('title', idWithoutPrefix(ensgModel.id));

			});


		}
	});

	/* give gene tiles their very own kebab */
	plugin.append('Tile.prototype.construct', function () {
		if (this.model && this.model.type === 'gene' && ensgToEnsp[this.model.id]) {

			var ensp = ensgToEnsp[this.model.id][0]; // show only one protein per gene

			this.observeValue('visible', true, () => {

				/* create the domain visualization (kebab) */
				var kebab = createKebab(ensp);
				this.object3D.add(kebab);
				kebab.scale.y = 0.2;
				kebab.rotation.x = THREE.Math.degToRad(90);
				this.oneValue('visible', false, () => {
					this.object3D.remove(kebab);
				});
				this.oneValue('visible', false, this.observe('open', (open) => {
					kebab.visible = !open && this.circuitboard.proteinDomainsVisible;
				}));
				this.circuitboard.observe('proteinDomainsVisible', (visible) => {
					kebab.visible = visible && !this.open;
				}); // TODO: Bacon.js property combining awesomeness


			});

		}
	});

	/* show protein-domain kebabs? */
	plugin.append('Circuitboard.prototype.construct', function () {
		this.newObservable('proteinDomainsVisible', {
			initial: false,
			validate: (v) => !!v
		});
	});



});
