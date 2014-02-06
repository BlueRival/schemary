"use strict";

var assert = require( 'assert' );
var schemar = require( '../index' );

describe( 'Schemary', function () {

	describe( 'Array', function () {

		var array = null;

		it( 'should NOT instantiate defaults', function () {

			var defaults = {
				sizeMin:        0,
				sizeMax:        null,
				type:           null,
				allowNull:      true,
				allowUndefined: true
			};

			array = new schemary.Array( {
				sizeMin: 1
			} );
			assert.notDeepEqual( array._config, defaults );

			array = new schemary.Array( {
				sizeMax: 1
			} );
			assert.notDeepEqual( array._config, defaults );

			array = new schemary.Array( {
				type: [ 'string' ]
			} );
			assert.notDeepEqual( array._config, defaults );

			array = new schemary.Array( {
				sizeMin: 10,
				sizeMax: 12,
				type:    [ 'string' ]
			} );
			assert.notDeepEqual( array._config, defaults );

		} );

		it( 'should fail to instantiate', function () {

			var go = failInstantiation( schemary.Array );

			go( { sizeMin: 10, sizeMax: 9 } );
			go( { type: 'missing' } );
			go( { type: [ 'otherone' ] } );
			go( { type: [
				{}
			] } );
			go( { type: [
				[]
			] } );
			go( { type: [
				Array
			] } );
			go( { type: [
				1
			] } );
			go( { type: [
				1.5
			] } );

		} );

		it( 'should fail check()', function () {

			var check = failCheck( new schemary.Array( {
				sizeMin: 2
			} ) );
			check( [] );

		} );

	} );

} );

function failCheck( validator ) {
	return function ( data ) {

		var asserted = false;

		try {
			validator.check( data );
		} catch ( e ) {
			console.error( 'e', e );
			asserted = true;
		}

		if ( !asserted ) {
			assert.ifError( new Error( 'failed to raise an exception with bad validation data: ' + JSON.stringify( data ) ) );
		}

	};
}

function failInstantiation( Class ) {
	return function ( config ) {
		var asserted = false;
		try {
			var instance = new Class( config );
		} catch ( e ) {
			// NO-OP
			asserted = true;
		}
		if ( !asserted ) {
			assert.ifError( new Error( 'failed to raise an exception with a bad config: ' + JSON.stringify( config ) ) );
		}
	};
}
