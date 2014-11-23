define(['bluebird'], function (P) {
	'use strict';

	return function defer() {
		var resolve, reject;
		var promise = new P(function() {
			resolve = arguments[0];
			reject = arguments[1];
		});
		//noinspection JSUnusedAssignment
		return {
			resolve: resolve,
			reject: reject,
			promise: promise
		};
	};

});
