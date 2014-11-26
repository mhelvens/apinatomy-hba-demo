define(['jquery', 'bluebird', './util/misc.js', './util/defer.js', './24tiles.json'], ($, P, U, defer, tfTiles) => {
	'use strict';


	// This module implements an interface to the FMA database on the old prototype
	// server, implementing the interface expected by ApiNATOMY. It creates a linked
	// object structure that preserves the original DAG structure. It does so by
	// maintaining a cache that maps each id to its corresponding object.
	//
	// The implementation of this module assumes that the database returns models
	// with the following structure:
	//
	// ModelType = {
	//     _id: string
	//     sub: [{  entity: { _id: string }  }]
	// }


	/* the class of FMA models, implementing the interface expected by ApiNATOMY */
	var FmaModel = $.circuitboard.plugin.dm.vp('FmaModel', U.newClass(function (fields) {
		U.extend(this, fields);
	}, {
		get type() { return 'fma' }, // <-- includes '24tiles' categorization models, though
		get id() { return this._id },
		getChildIds()  { return this.sub.map((sub) => sub.entity._id) },
		getModels(ids) { return getFmaModels(ids) }
	}));


	/* storing and retrieving 'deferreds' to models */
	var _getDeferred = (() => {
		var _deferredCache = {};
		return (id) => {
			if (!_deferredCache[id]) { _deferredCache[id] = defer() }
			return _deferredCache[id];
		};
	})();


	/* to retrieve an array of promises to models, given an array of ids */
	function getFmaModels(ids) {

		/* gather the ids that we have not requested from the server before */
		var newIds = [];
		ids.forEach((id) => {
			if (!_getDeferred(id).alreadyRequested) {
				_getDeferred(id).alreadyRequested = true;

				/* make some info available from the promise itself */
				_getDeferred(id).promise.id = id;
				_getDeferred(id).promise.type = 'fma';

				if (id.substr(0, id.indexOf(':')) === '24tile') {
					/* immediately resolve */
					_getDeferred(id).resolve(new FmaModel(tfTiles[id]));
				} else {
					/* register to be requested from the server */
					newIds.push(id);
				}
			}
		});

		if (newIds.length > 0) {

			/* request and build the model objects belonging to those ids */
			P.resolve($.ajax({
				url: `http://open-physiology.org:20080/apinatomy/${newIds.join(',')}`,
				dataType: 'jsonp'
			})).each((modelObj) => {

				/*  remove references to children that are not actually   */
				/*  in the database (the FMA database is messy that way)  */
				for (var i = modelObj.sub.length - 1; i >= 0; i -= 1) {
					if (modelObj.sub[i].entity === null) {
						modelObj.sub.splice(i);
					}
				}

				/* create the new model object based on the prototype */
				var newModel = new FmaModel(modelObj);

				/* remove counter from name */
				var match = newModel.name.match(/^(.*)\(\d+\)$/);
				if (match) { newModel.name = match[1] }

				/* resolve the corresponding promise */
				_getDeferred(newModel.id).resolve(newModel);

			});

		}

		/* return an array of promises to all requested ids */
		return ids.map((id) => _getDeferred(id).promise);

	}

	return getFmaModels;

});
