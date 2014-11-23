define(['bluebird', 'delta-js' ], function (P, DM) {
	'use strict';


	/* tell delta.js about bluebird */
	DM.registerPromiseResolver(P.resolve);


	/* create the delta model that manages all plugins (= deltas) */
	return new DM();


});
