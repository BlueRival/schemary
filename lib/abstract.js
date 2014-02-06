"use strict";

var assert = require( 'assert' );
var SchemaryAbstract = function ( config ) {

	this._config = config || {};

	for ( var method in assert ) {
		if ( assert.hasOwnProperty( method ) && typeof assert[method] === 'function' ) {
			this['_' + method] = assert[method];
		}
	}

};

SchemaryAbstract.prototype._checkType = function ( type ) {

	if ( !type || !(type instanceof SchemaryAbstract) ) {
		this._assert( 'type was not an instance of schemary type' );
	}

};

SchemaryAbstract.prototype.check = function () {
	throw new Error( 'failed to override the check() method' );
};

SchemaryAbstract.prototype._assert = function ( message, field ) {
	var error = new Error( message );

	if ( field ) {
		error.path = field;
	}

	throw error;
};

SchemaryAbstract.prototype._loadType = function ( type ) {

	type = type.replace( /[^A-za-z]*/g, '' ).replace( /^schemary/i, '' ).toLowerCase();

	try {
		var TypeClass = require( './' + type );
		type = new TypeClass();
	} catch ( e ) {
		type = null;
	}

	return type;

};

module.exports = SchemaryAbstract;
