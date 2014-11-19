'use strict';

var path = require('path');

exports.port = 80;
exports.rootDir = path.resolve(__dirname + '/..');
exports.clientDir = exports.rootDir + '/dist/index';
exports.serverDir  = exports.rootDir + '/server';

