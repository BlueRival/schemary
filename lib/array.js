"use strict";

var SchemaryAbstract = require( './abstract' );
var SchemaryArray = function () {
	SchemaryAbstract.apply( this, arguments );

	var config = this._config;

	if ( config.hasOwnProperty( 'allowNull' ) ) {
		if ( typeof config.allowNull !== 'boolean' ) {
			this._assert( 'allowNull must be boolean' );
		}
	} else {
		config.allowNull = true;
	}

	if ( config.hasOwnProperty( 'allowUndefined' ) ) {
		if ( typeof config.allowUndefined !== 'boolean' ) {
			this._assert( 'allowUndefined must be boolean' );
		}
	} else {
		config.allowUndefined = true;
	}

	if ( config.hasOwnProperty( 'sizeMin' ) ) {
		if ( typeof config.sizeMin !== 'number' || config.sizeMin < 0 ) {
			this._assert( 'sizeMin must be a number >= zero' );
		}
	} else {
		config.sizeMin = 0;
	}

	if ( config.hasOwnProperty( 'sizeMax' ) ) {
		if ( typeof config.sizeMax !== 'number' || config.sizeMax < 0 ) {
			this._assert( 'sizeMax must be a number >= zero' );
		}
	} else {
		config.sizeMin = null;
	}

	if ( config.sizeMax !== null && config.sizeMax < config.sizeMin ) {
		this._assert( 'sizeMax must be >= sizeMin' );
	}

	if ( config.hasOwnProperty( 'type' ) ) {

		if ( typeof config.type === 'string' ) {
			config.type = this._loadType( config.type );
		}

		this._checkType( config.type );

	}

	this._allowNull = config.allowNull || true;
	this._allowUndefined = config.allowUndefined || true;
	this._sizeMin = config.sizeMin;
	this._sizeMax = config.sizeMax;
	this._type = config.type;

};
require( 'util' ).inherits( SchemaryArray, SchemaryAbstract );

SchemaryArray.prototype.check = function ( data ) {

	if ( !Array.isArray( data ) ) {
		this._assert( 'data is not an array', '' );
	}

	if ( data.length < this._sizeMin ) {
		this._assert( 'array length less than: ' + this._sizeMin, '' );
	}

	if ( this._sizeMax !== null && data.length > this._sizeMax ) {
		this._assert( 'array length greater than: ' + this._sizeMax, '' );
	}

	// if there are specific valid type
	if ( this._type ) {

		// check each entry and compare it to type, allowNull and allowUndefined
		for ( var i = 0; i < data.length; i++ ) {

			//
			if ( data[i] === null && !this._allowNull ) {

				this._assert( 'null value is not permitted', i );

			} else if ( data[i] === undefined && !this._allowUndefined ) {

				this._assert( 'undefined value is not permitted', i );

			} else {

				try {

					// now we recurse
					this._type.check( data[i] );

				} catch ( e ) {

					// ensure the path to the exception is maintained through recursion
					e.path = "['" + i + "']" + e.path;

				}

			}
		}

	}

};

module.exports = SchemaryArray;
