
/***********************************************************************************************************************************
Module from https://github.com/mrdoob/three.js/blob/master/examples/jsm/renderers/CSS2DRenderer.js
Copy/pasted/modified here to avoid CORS issues & to avoid setting up a web server 
***********************************************************************************************************************************/
	var CSS2DObject = function ( element ) {
	THREE.Object3D.call( this );
	this.element = element || document.createElement( 'div' );
	this.element.style.position = 'absolute';
	this.addEventListener( 'removed', function () {
		this.traverse( function ( object ) {
			if ( object.element instanceof Element && object.element.parentNode !== null ) {
				object.element.parentNode.removeChild( object.element );
			}
		} );
	} );
};

CSS2DObject.prototype = Object.assign( Object.create( THREE.Object3D.prototype ), {
	constructor: CSS2DObject,
	copy: function ( source, recursive ) {
		THREE.Object3D.prototype.copy.call( this, source, recursive );
		this.element = source.element.cloneNode( true );
		return this;
	}
} );

var CSS2DRenderer = function () {
	var _this = this;
	var _width, _height;
	var _widthHalf, _heightHalf;
	var vector = new THREE.Vector3();
	var viewMatrix = new THREE.Matrix4();
	var viewProjectionMatrix = new THREE.Matrix4();
	var cache = {
		objects: new WeakMap()
	};
	var domElement = document.createElement( 'div' );
	domElement.style.overflow = 'hidden';
	this.domElement = domElement;
	this.getSize = function () {
		return {
			width: _width,
			height: _height
		};

	};
	this.setSize = function ( width, height ) {
		_width = width;
		_height = height;
		_widthHalf = _width / 2;
		_heightHalf = _height / 2;
		domElement.style.width = width + 'px';
		domElement.style.height = height + 'px';

	};
	var renderObject = function ( object, scene, camera ) {
		if ( object instanceof CSS2DObject ) {
			object.onBeforeRender( _this, scene, camera );
			vector.setFromMatrixPosition( object.matrixWorld );
			vector.applyMatrix4( viewProjectionMatrix );
			var element = object.element;
			var style = 'translate(-50%,-50%) translate(' + ( vector.x * _widthHalf + _widthHalf ) + 'px,' + ( - vector.y * _heightHalf + _heightHalf ) + 'px)';
			element.style.WebkitTransform = style;
			element.style.MozTransform = style;
			element.style.oTransform = style;
			element.style.transform = style;
			element.style.display = ( object.visible && vector.z >= - 1 && vector.z <= 1 ) ? '' : 'none';
			var objectData = {
				distanceToCameraSquared: getDistanceToSquared( camera, object )
			};
			cache.objects.set( object, objectData );
			if ( element.parentNode !== domElement ) {
				domElement.appendChild( element );
			}
			object.onAfterRender( _this, scene, camera );
		}
		for ( var i = 0, l = object.children.length; i < l; i ++ ) {
			renderObject( object.children[ i ], scene, camera );
		}
	};

	var getDistanceToSquared = function () {
		var a = new THREE.Vector3();
		var b = new THREE.Vector3();
		return function ( object1, object2 ) {
			a.setFromMatrixPosition( object1.matrixWorld );
			b.setFromMatrixPosition( object2.matrixWorld );
			return a.distanceToSquared( b );
		};
	}();

	var filterAndFlatten = function ( scene ) {
		var result = [];
		scene.traverse( function ( object ) {
			if ( object instanceof CSS2DObject ) result.push( object );
		} );
		return result;
	};

	var zOrder = function ( scene ) {
		var sorted = filterAndFlatten( scene ).sort( function ( a, b ) {
			var distanceA = cache.objects.get( a ).distanceToCameraSquared;
			var distanceB = cache.objects.get( b ).distanceToCameraSquared;
			return distanceA - distanceB;
		} );
		var zMax = sorted.length;
		for ( var i = 0, l = sorted.length; i < l; i ++ ) {
			sorted[ i ].element.style.zIndex = zMax - i;
		}
	};
	this.render = function ( scene, camera ) {
		if ( scene.autoUpdate === true ) scene.updateMatrixWorld();
		if ( camera.parent === null ) camera.updateMatrixWorld();
		viewMatrix.copy( camera.matrixWorldInverse );
		viewProjectionMatrix.multiplyMatrices( camera.projectionMatrix, viewMatrix );
		renderObject( scene, scene, camera );
		zOrder( scene );
	};
};
/****************************************************************************************************************
Module from https://threejsfundamentals.org/threejs/resources/threejs/r119/examples/jsm/controls/TrackballControls.js
/****************************************************************************************************************/
var TrackballControls = function ( object, domElement ) {

	if ( domElement === undefined ) console.warn( 'THREE.TrackballControls: The second parameter "domElement" is now mandatory.' );
	if ( domElement === document ) console.error( 'THREE.TrackballControls: "document" should not be used as the target "domElement". Please use "renderer.domElement" instead.' );

	var scope = this;
	var STATE = { NONE: - 1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM_PAN: 4 };

	this.object = object;
	this.domElement = domElement;

	// API

	this.enabled = true;

	this.screen = { left: 0, top: 0, width: 0, height: 0 };

	this.rotateSpeed = 1.0;
	this.zoomSpeed = 1.2;
	this.panSpeed = 0.3;

	this.noRotate = false;
	this.noZoom = false;
	this.noPan = false;

	this.staticMoving = false;
	this.dynamicDampingFactor = 0.2;

	this.minDistance = 0;
	this.maxDistance = Infinity;

	this.keys = [ 65 /*A*/, 83 /*S*/, 68 /*D*/ ];

	this.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.ZOOM, RIGHT: THREE.MOUSE.PAN };

	// internals

	this.target = new THREE.Vector3();

	var EPS = 0.000001;

	var lastPosition = new THREE.Vector3();
	var lastZoom = 1;

	var _state = STATE.NONE,
		_keyState = STATE.NONE,

		_eye = new THREE.Vector3(),

		_movePrev = new THREE.Vector2(),
		_moveCurr = new THREE.Vector2(),

		_lastAxis = new THREE.Vector3(),
		_lastAngle = 0,

		_zoomStart = new THREE.Vector2(),
		_zoomEnd = new THREE.Vector2(),

		_touchZoomDistanceStart = 0,
		_touchZoomDistanceEnd = 0,

		_panStart = new THREE.Vector2(),
		_panEnd = new THREE.Vector2();

	// for reset

	this.target0 = this.target.clone();
	this.position0 = this.object.position.clone();
	this.up0 = this.object.up.clone();
	this.zoom0 = this.object.zoom;

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start' };
	var endEvent = { type: 'end' };


	// methods

	this.handleResize = function () {

		var box = scope.domElement.getBoundingClientRect();
		// adjustments come from similar code in the jquery offset() function
		var d = scope.domElement.ownerDocument.documentElement;
		scope.screen.left = box.left + window.pageXOffset - d.clientLeft;
		scope.screen.top = box.top + window.pageYOffset - d.clientTop;
		scope.screen.width = box.width;
		scope.screen.height = box.height;

	};

	var getMouseOnScreen = ( function () {

		var vector = new THREE.Vector2();

		return function getMouseOnScreen( pageX, pageY ) {

			vector.set(
				( pageX - scope.screen.left ) / scope.screen.width,
				( pageY - scope.screen.top ) / scope.screen.height
			);

			return vector;

		};

	}() );

	var getMouseOnCircle = ( function () {

		var vector = new THREE.Vector2();

		return function getMouseOnCircle( pageX, pageY ) {

			vector.set(
				( ( pageX - scope.screen.width * 0.5 - scope.screen.left ) / ( scope.screen.width * 0.5 ) ),
				( ( scope.screen.height + 2 * ( scope.screen.top - pageY ) ) / scope.screen.width ) // screen.width intentional
			);

			return vector;

		};

	}() );

	this.rotateCamera = ( function () {

		var axis = new THREE.Vector3(),
			quaternion = new THREE.Quaternion(),
			eyeDirection = new THREE.Vector3(),
			objectUpDirection = new THREE.Vector3(),
			objectSidewaysDirection = new THREE.Vector3(),
			moveDirection = new THREE.Vector3(),
			angle;

		return function rotateCamera() {

			moveDirection.set( _moveCurr.x - _movePrev.x, _moveCurr.y - _movePrev.y, 0 );
			angle = moveDirection.length();

			if ( angle ) {

				_eye.copy( scope.object.position ).sub( scope.target );

				eyeDirection.copy( _eye ).normalize();
				objectUpDirection.copy( scope.object.up ).normalize();
				objectSidewaysDirection.crossVectors( objectUpDirection, eyeDirection ).normalize();

				objectUpDirection.setLength( _moveCurr.y - _movePrev.y );
				objectSidewaysDirection.setLength( _moveCurr.x - _movePrev.x );

				moveDirection.copy( objectUpDirection.add( objectSidewaysDirection ) );

				axis.crossVectors( moveDirection, _eye ).normalize();

				angle *= scope.rotateSpeed;
				quaternion.setFromAxisAngle( axis, angle );

				_eye.applyQuaternion( quaternion );
				scope.object.up.applyQuaternion( quaternion );

				_lastAxis.copy( axis );
				_lastAngle = angle;

			} else if ( ! scope.staticMoving && _lastAngle ) {

				_lastAngle *= Math.sqrt( 1.0 - scope.dynamicDampingFactor );
				_eye.copy( scope.object.position ).sub( scope.target );
				quaternion.setFromAxisAngle( _lastAxis, _lastAngle );
				_eye.applyQuaternion( quaternion );
				scope.object.up.applyQuaternion( quaternion );

			}

			_movePrev.copy( _moveCurr );

		};

	}() );


	this.zoomCamera = function () {

		var factor;

		if ( _state === STATE.TOUCH_ZOOM_PAN ) {

			factor = _touchZoomDistanceStart / _touchZoomDistanceEnd;
			_touchZoomDistanceStart = _touchZoomDistanceEnd;

			if ( scope.object.isPerspectiveCamera ) {

				_eye.multiplyScalar( factor );

			} else if ( scope.object.isOrthographicCamera ) {

				scope.object.zoom *= factor;
				scope.object.updateProjectionMatrix();

			} else {

				console.warn( 'THREE.TrackballControls: Unsupported camera type' );

			}

		} else {

			factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * scope.zoomSpeed;

			if ( factor !== 1.0 && factor > 0.0 ) {

				if ( scope.object.isPerspectiveCamera ) {

					_eye.multiplyScalar( factor );

				} else if ( scope.object.isOrthographicCamera ) {

					scope.object.zoom /= factor;
					scope.object.updateProjectionMatrix();

				} else {

					console.warn( 'THREE.TrackballControls: Unsupported camera type' );

				}

			}

			if ( scope.staticMoving ) {

				_zoomStart.copy( _zoomEnd );

			} else {

				_zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;

			}

		}

	};

	this.panCamera = ( function () {

		var mouseChange = new THREE.Vector2(),
			objectUp = new THREE.Vector3(),
			pan = new THREE.Vector3();

		return function panCamera() {

			mouseChange.copy( _panEnd ).sub( _panStart );

			if ( mouseChange.lengthSq() ) {

				if ( scope.object.isOrthographicCamera ) {

					var scale_x = ( scope.object.right - scope.object.left ) / scope.object.zoom / scope.domElement.clientWidth;
					var scale_y = ( scope.object.top - scope.object.bottom ) / scope.object.zoom / scope.domElement.clientWidth;

					mouseChange.x *= scale_x;
					mouseChange.y *= scale_y;

				}

				mouseChange.multiplyScalar( _eye.length() * scope.panSpeed );

				pan.copy( _eye ).cross( scope.object.up ).setLength( mouseChange.x );
				pan.add( objectUp.copy( scope.object.up ).setLength( mouseChange.y ) );

				scope.object.position.add( pan );
				scope.target.add( pan );

				if ( scope.staticMoving ) {

					_panStart.copy( _panEnd );

				} else {

					_panStart.add( mouseChange.subVectors( _panEnd, _panStart ).multiplyScalar( scope.dynamicDampingFactor ) );

				}

			}

		};

	}() );

	this.checkDistances = function () {

		if ( ! scope.noZoom || ! scope.noPan ) {

			if ( _eye.lengthSq() > scope.maxDistance * scope.maxDistance ) {

				scope.object.position.addVectors( scope.target, _eye.setLength( scope.maxDistance ) );
				_zoomStart.copy( _zoomEnd );

			}

			if ( _eye.lengthSq() < scope.minDistance * scope.minDistance ) {

				scope.object.position.addVectors( scope.target, _eye.setLength( scope.minDistance ) );
				_zoomStart.copy( _zoomEnd );

			}

		}

	};

	this.update = function () {

		_eye.subVectors( scope.object.position, scope.target );

		if ( ! scope.noRotate ) {

			scope.rotateCamera();

		}

		if ( ! scope.noZoom ) {

			scope.zoomCamera();

		}

		if ( ! scope.noPan ) {

			scope.panCamera();

		}

		scope.object.position.addVectors( scope.target, _eye );

		if ( scope.object.isPerspectiveCamera ) {

			scope.checkDistances();

			scope.object.lookAt( scope.target );

			if ( lastPosition.distanceToSquared( scope.object.position ) > EPS ) {

				scope.dispatchEvent( changeEvent );

				lastPosition.copy( scope.object.position );

			}

		} else if ( scope.object.isOrthographicCamera ) {

			scope.object.lookAt( scope.target );

			if ( lastPosition.distanceToSquared( scope.object.position ) > EPS || lastZoom !== scope.object.zoom ) {

				scope.dispatchEvent( changeEvent );

				lastPosition.copy( scope.object.position );
				lastZoom = scope.object.zoom;

			}

		} else {

			console.warn( 'THREE.TrackballControls: Unsupported camera type' );

		}

	};

	this.reset = function () {

		_state = STATE.NONE;
		_keyState = STATE.NONE;

		scope.target.copy( scope.target0 );
		scope.object.position.copy( scope.position0 );
		scope.object.up.copy( scope.up0 );
		scope.object.zoom = scope.zoom0;

		scope.object.updateProjectionMatrix();

		_eye.subVectors( scope.object.position, scope.target );

		scope.object.lookAt( scope.target );

		scope.dispatchEvent( changeEvent );

		lastPosition.copy( scope.object.position );
		lastZoom = scope.object.zoom;

	};

	// listeners

	function keydown( event ) {

		if ( scope.enabled === false ) return;

		window.removeEventListener( 'keydown', keydown );

		if ( _keyState !== STATE.NONE ) {

			return;

		} else if ( event.keyCode === scope.keys[ STATE.ROTATE ] && ! scope.noRotate ) {

			_keyState = STATE.ROTATE;

		} else if ( event.keyCode === scope.keys[ STATE.ZOOM ] && ! scope.noZoom ) {

			_keyState = STATE.ZOOM;

		} else if ( event.keyCode === scope.keys[ STATE.PAN ] && ! scope.noPan ) {

			_keyState = STATE.PAN;

		}

	}

	function keyup() {

		if ( scope.enabled === false ) return;

		_keyState = STATE.NONE;

		window.addEventListener( 'keydown', keydown, false );

	}

	function mousedown( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		if ( _state === STATE.NONE ) {

			switch ( event.button ) {

				case scope.mouseButtons.LEFT:
					_state = STATE.ROTATE;
					break;

				case scope.mouseButtons.MIDDLE:
					_state = STATE.ZOOM;
					break;

				case scope.mouseButtons.RIGHT:
					_state = STATE.PAN;
					break;

				default:
					_state = STATE.NONE;

			}

		}

		var state = ( _keyState !== STATE.NONE ) ? _keyState : _state;

		if ( state === STATE.ROTATE && ! scope.noRotate ) {

			_moveCurr.copy( getMouseOnCircle( event.pageX, event.pageY ) );
			_movePrev.copy( _moveCurr );

		} else if ( state === STATE.ZOOM && ! scope.noZoom ) {

			_zoomStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
			_zoomEnd.copy( _zoomStart );

		} else if ( state === STATE.PAN && ! scope.noPan ) {

			_panStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
			_panEnd.copy( _panStart );

		}

		scope.domElement.ownerDocument.addEventListener( 'mousemove', mousemove, false );
		scope.domElement.ownerDocument.addEventListener( 'mouseup', mouseup, false );

		scope.dispatchEvent( startEvent );

	}

	function mousemove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		var state = ( _keyState !== STATE.NONE ) ? _keyState : _state;

		if ( state === STATE.ROTATE && ! scope.noRotate ) {

			_movePrev.copy( _moveCurr );
			_moveCurr.copy( getMouseOnCircle( event.pageX, event.pageY ) );

		} else if ( state === STATE.ZOOM && ! scope.noZoom ) {

			_zoomEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );

		} else if ( state === STATE.PAN && ! scope.noPan ) {

			_panEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );

		}

	}

	function mouseup( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		_state = STATE.NONE;

		scope.domElement.ownerDocument.removeEventListener( 'mousemove', mousemove );
		scope.domElement.ownerDocument.removeEventListener( 'mouseup', mouseup );
		scope.dispatchEvent( endEvent );

	}

	function mousewheel( event ) {

		if ( scope.enabled === false ) return;

		if ( scope.noZoom === true ) return;

		event.preventDefault();
		event.stopPropagation();

		switch ( event.deltaMode ) {

			case 2:
				// Zoom in pages
				_zoomStart.y -= event.deltaY * 0.025;
				break;

			case 1:
				// Zoom in lines
				_zoomStart.y -= event.deltaY * 0.01;
				break;

			default:
				// undefined, 0, assume pixels
				_zoomStart.y -= event.deltaY * 0.00025;
				break;

		}

		scope.dispatchEvent( startEvent );
		scope.dispatchEvent( endEvent );

	}

	function touchstart( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

		switch ( event.touches.length ) {

			case 1:
				_state = STATE.TOUCH_ROTATE;
				_moveCurr.copy( getMouseOnCircle( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
				_movePrev.copy( _moveCurr );
				break;

			default: // 2 or more
				_state = STATE.TOUCH_ZOOM_PAN;
				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				_touchZoomDistanceEnd = _touchZoomDistanceStart = Math.sqrt( dx * dx + dy * dy );

				var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
				var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
				_panStart.copy( getMouseOnScreen( x, y ) );
				_panEnd.copy( _panStart );
				break;

		}

		scope.dispatchEvent( startEvent );

	}

	function touchmove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		switch ( event.touches.length ) {

			case 1:
				_movePrev.copy( _moveCurr );
				_moveCurr.copy( getMouseOnCircle( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
				break;

			default: // 2 or more
				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				_touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy );

				var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
				var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
				_panEnd.copy( getMouseOnScreen( x, y ) );
				break;

		}

	}

	function touchend( event ) {

		if ( scope.enabled === false ) return;

		switch ( event.touches.length ) {

			case 0:
				_state = STATE.NONE;
				break;

			case 1:
				_state = STATE.TOUCH_ROTATE;
				_moveCurr.copy( getMouseOnCircle( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
				_movePrev.copy( _moveCurr );
				break;

		}

		scope.dispatchEvent( endEvent );

	}

	function contextmenu( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

	}

	this.dispose = function () {

		scope.domElement.removeEventListener( 'contextmenu', contextmenu, false );
		scope.domElement.removeEventListener( 'mousedown', mousedown, false );
		scope.domElement.removeEventListener( 'wheel', mousewheel, false );

		scope.domElement.removeEventListener( 'touchstart', touchstart, false );
		scope.domElement.removeEventListener( 'touchend', touchend, false );
		scope.domElement.removeEventListener( 'touchmove', touchmove, false );

		scope.domElement.ownerDocument.removeEventListener( 'mousemove', mousemove, false );
		scope.domElement.ownerDocument.removeEventListener( 'mouseup', mouseup, false );

		window.removeEventListener( 'keydown', keydown, false );
		window.removeEventListener( 'keyup', keyup, false );

	};

	this.domElement.addEventListener( 'contextmenu', contextmenu, false );
	this.domElement.addEventListener( 'mousedown', mousedown, false );
	this.domElement.addEventListener( 'wheel', mousewheel, false );

	this.domElement.addEventListener( 'touchstart', touchstart, false );
	this.domElement.addEventListener( 'touchend', touchend, false );
	this.domElement.addEventListener( 'touchmove', touchmove, false );

	window.addEventListener( 'keydown', keydown, false );
	window.addEventListener( 'keyup', keyup, false );

	this.handleResize();

	// force an update at start
	this.update();

};

TrackballControls.prototype = Object.create(THREE.EventDispatcher.prototype );
TrackballControls.prototype.constructor = TrackballControls;
/****************************************************************************************************************/

var globalIndex = -1; 
var controls, renderer, labelRenderer, scene, camera, uniqueAddress;
var geometryList = [], materialList = [], lineList = [];
var packetsJSON = [
 {
   "No.": 1,
   "Time": 0,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "UDP",
   "Length": 76
 },
 {
   "No.": 2,
   "Time": 0.000003,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "UDP",
   "Length": 76
 },
 {
   "No.": 3,
   "Time": 0.001005,
   "Source": "211.137.137.11",
   "Destination": "89.128.123.34",
   "Protocol": "UDP",
   "Length": 80
 },
 {
   "No.": 4,
   "Time": 0.001014,
   "Source": "192.168.2.101",
   "Destination": "228.192.164.90",
   "Protocol": "UDP",
   "Length": 68
 },
 {
   "No.": 5,
   "Time": 0.001016,
   "Source": "209.137.115.112",
   "Destination": "211.137.137.11",
   "Protocol": "UDP",
   "Length": 68
 },
 {
   "No.": 6,
   "Time": 0.001034,
   "Source": "192.168.2.101",
   "Destination": "192.66.35.30",
   "Protocol": "CMPP",
   "Length": 107
 },
 {
   "No.": 7,
   "Time": 0.001036,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "UDP",
   "Length": 107
 },
 {
   "No.": 8,
   "Time": 0.076268,
   "Source": "211.137.137.11",
   "Destination": "173.250.83.176",
   "Protocol": "UDP",
   "Length": 68
 },
 {
   "No.": 9,
   "Time": 0.790971,
   "Source": "192.168.2.101",
   "Destination": "192.66.35.30",
   "Protocol": "CMPP",
   "Length": 80
 },
 {
   "No.": 10,
   "Time": 0.790974,
   "Source": "192.66.35.30",
   "Destination": "211.137.137.11",
   "Protocol": "UDP",
   "Length": 80
 },
 {
   "No.": 11,
   "Time": 0.866288,
   "Source": "192.66.35.30",
   "Destination": "192.168.2.101",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 12,
   "Time": 1.576453,
   "Source": "148.167.18.178",
   "Destination": "192.168.2.101",
   "Protocol": "CMPP",
   "Length": 98
 },
 {
   "No.": 13,
   "Time": 1.576461,
   "Source": "209.137.115.112",
   "Destination": "89.128.123.34",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 14,
   "Time": 1.576463,
   "Source": "134.211.182.5",
   "Destination": "209.137.115.112",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 15,
   "Time": 1.57693,
   "Source": "192.168.2.101",
   "Destination": "134.211.182.5",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 16,
   "Time": 1.576931,
   "Source": "173.250.83.176",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 17,
   "Time": 1.577472,
   "Source": "173.250.83.176",
   "Destination": "10.113.43.220",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 18,
   "Time": 1.596435,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "TCP",
   "Length": 90
 },
 {
   "No.": 19,
   "Time": 3.038219,
   "Source": "10.113.43.220",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 76
 },
 {
   "No.": 20,
   "Time": 3.038221,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 76
 },
 {
   "No.": 21,
   "Time": 3.039325,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "TCP",
   "Length": 80
 },
 {
   "No.": 22,
   "Time": 3.039335,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 23,
   "Time": 3.039336,
   "Source": "10.113.43.220",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 24,
   "Time": 3.039347,
   "Source": "192.168.2.101",
   "Destination": "10.113.43.220",
   "Protocol": "CMPP",
   "Length": 107
 },
 {
   "No.": 25,
   "Time": 3.039349,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 107
 },
 {
   "No.": 26,
   "Time": 3.106431,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 27,
   "Time": 3.98135,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "CMPP",
   "Length": 80
 },
 {
   "No.": 28,
   "Time": 3.981353,
   "Source": "192.168.2.101",
   "Destination": "192.66.35.30",
   "Protocol": "TCP",
   "Length": 80
 },
 {
   "No.": 29,
   "Time": 4.056522,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 30,
   "Time": 6.647465,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "CMPP",
   "Length": 98
 },
 {
   "No.": 31,
   "Time": 6.647474,
   "Source": "192.168.2.101",
   "Destination": "192.66.35.30",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 32,
   "Time": 6.647477,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 33,
   "Time": 6.647817,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 34,
   "Time": 6.647819,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 35,
   "Time": 6.648481,
   "Source": "211.137.137.11",
   "Destination": "232.254.166.201",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 36,
   "Time": 6.667406,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "TCP",
   "Length": 90
 },
 {
   "No.": 37,
   "Time": 10.9135,
   "Source": "28.13.251.190",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 76
 },
 {
   "No.": 38,
   "Time": 10.913503,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 76
 },
 {
   "No.": 39,
   "Time": 10.91456,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "TCP",
   "Length": 80
 },
 {
   "No.": 40,
   "Time": 10.91457,
   "Source": "28.13.251.190",
   "Destination": "211.137.137.11",
   "Protocol": "UDP",
   "Length": 68
 },
 {
   "No.": 41,
   "Time": 10.914571,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "UDP",
   "Length": 68
 },
 {
   "No.": 42,
   "Time": 10.914583,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "CMPP",
   "Length": 107
 },
 {
   "No.": 43,
   "Time": 10.914585,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "UDP",
   "Length": 107
 },
 {
   "No.": 44,
   "Time": 11.016866,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "UDP",
   "Length": 68
 },
 {
   "No.": 45,
   "Time": 11.717538,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "CMPP",
   "Length": 98
 },
 {
   "No.": 46,
   "Time": 11.717543,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "UDP",
   "Length": 68
 },
 {
   "No.": 47,
   "Time": 11.717544,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 48,
   "Time": 11.717681,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "CMPP",
   "Length": 80
 },
 {
   "No.": 49,
   "Time": 11.717685,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 80
 },
 {
   "No.": 50,
   "Time": 11.717949,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 51,
   "Time": 11.717951,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "DNS",
   "Length": 68
 },
 {
   "No.": 52,
   "Time": 11.718542,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 53,
   "Time": 11.757422,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "DNS",
   "Length": 90
 },
 {
   "No.": 54,
   "Time": 16.759253,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 76
 },
 {
   "No.": 55,
   "Time": 16.759255,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 76
 },
 {
   "No.": 56,
   "Time": 16.760282,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "TCP",
   "Length": 80
 },
 {
   "No.": 57,
   "Time": 16.76029,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 58,
   "Time": 16.760292,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "DNS",
   "Length": 68
 },
 {
   "No.": 59,
   "Time": 16.760306,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "CMPP",
   "Length": 107
 },
 {
   "No.": 60,
   "Time": 16.760307,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 107
 },
 {
   "No.": 61,
   "Time": 16.827307,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "DNS",
   "Length": 68
 },
 {
   "No.": 62,
   "Time": 17.758231,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "CMPP",
   "Length": 80
 },
 {
   "No.": 63,
   "Time": 17.758234,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 80
 },
 {
   "No.": 64,
   "Time": 17.827405,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 65,
   "Time": 21.79888,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "CMPP",
   "Length": 98
 },
 {
   "No.": 66,
   "Time": 21.798888,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 67,
   "Time": 21.79889,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 68,
   "Time": 21.799188,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "DNS",
   "Length": 68
 },
 {
   "No.": 69,
   "Time": 21.79919,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 70,
   "Time": 21.799767,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 71,
   "Time": 21.818379,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "TCP",
   "Length": 90
 },
 {
   "No.": 72,
   "Time": 21.819246,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 76
 },
 {
   "No.": 73,
   "Time": 21.819248,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 76
 },
 {
   "No.": 74,
   "Time": 21.820267,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "TCP",
   "Length": 80
 },
 {
   "No.": 75,
   "Time": 21.820276,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 76,
   "Time": 21.820278,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.10",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 77,
   "Time": 21.820288,
   "Source": "192.168.3.101",
   "Destination": "211.137.137.11",
   "Protocol": "CMPP",
   "Length": 107
 },
 {
   "No.": 78,
   "Time": 21.82029,
   "Source": "192.168.2.101",
   "Destination": "212.137.137.11",
   "Protocol": "TCP",
   "Length": 107
 },
 {
   "No.": 79,
   "Time": 21.887628,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 80,
   "Time": 22.038003,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "CMPP",
   "Length": 98
 },
 {
   "No.": 81,
   "Time": 22.038007,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 82,
   "Time": 22.038009,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 83,
   "Time": 23.034542,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "CMPP",
   "Length": 80
 },
 {
   "No.": 84,
   "Time": 23.034544,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 80
 },
 {
   "No.": 85,
   "Time": 23.057772,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "CMPP",
   "Length": 81
 },
 {
   "No.": 86,
   "Time": 23.057778,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 87,
   "Time": 23.057779,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 88,
   "Time": 53.984482,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "CMPP",
   "Length": 80
 },
 {
   "No.": 89,
   "Time": 53.984484,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 80
 },
 {
   "No.": 90,
   "Time": 53.994645,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "CMPP",
   "Length": 81
 },
 {
   "No.": 91,
   "Time": 53.994652,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 92,
   "Time": 53.994653,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 93,
   "Time": 84.986436,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "CMPP",
   "Length": 80
 },
 {
   "No.": 94,
   "Time": 84.986439,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 80
 },
 {
   "No.": 95,
   "Time": 85.0124,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "CMPP",
   "Length": 81
 },
 {
   "No.": 96,
   "Time": 85.012405,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "TCP",
   "Length": 68
 },
 {
   "No.": 97,
   "Time": 85.012406,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "UDP",
   "Length": 68
 },
 {
   "No.": 98,
   "Time": 115.988375,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "CMPP",
   "Length": 80
 },
 {
   "No.": 99,
   "Time": 115.988377,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "UDP",
   "Length": 80
 },
 {
   "No.": 100,
   "Time": 116.014377,
   "Source": "211.137.137.11",
   "Destination": "192.168.2.101",
   "Protocol": "CMPP",
   "Length": 81
 },
 {
   "No.": 101,
   "Time": 116.014383,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "UDP",
   "Length": 68
 },
 {
   "No.": 102,
   "Time": 116.014384,
   "Source": "192.168.2.101",
   "Destination": "211.137.137.11",
   "Protocol": "UDP",
   "Length": 68
 }
]

/**
	Event Listeners for forward/backwards buttons
**/
document.addEventListener('DOMContentLoaded', function() {	
	document.getElementById("backwardButton").addEventListener("click", function(){
		if(globalIndex > -1){
			globalIndex--;
			scene.remove(lineList.pop())
			updateInformationBar(globalIndex);
			document.getElementById("forwardButton").disabled = false;
			if(globalIndex == -1){
				document.getElementById("backwardButton").disabled = true;
			}
		}
	})
	document.getElementById("forwardButton").addEventListener("click", function(){
		if(globalIndex < packetsJSON.length){
			globalIndex++;
			drawLine(globalIndex);
			updateInformationBar(globalIndex);
			document.getElementById("backwardButton").disabled = false;
			if(globalIndex == packetsJSON.length){
				document.getElementById("forwardButton").disabled = true;
			}
			
		}
		
	})
	document.getElementById("skipButton").addEventListener("click", function(){
		drawAllLines();
		globalIndex = packetsJSON.length;
		document.getElementById("forwardButton").disabled = true;
		document.getElementById("backwardButton").disabled = false;					
	})
})

/**
	Initializes camera, scene, renderers, spheres and labels.
*/
function init(){
	//Parse through the provided JSON (currenly residing in HTML. TODO: load from elsewhere)
	//packetsJSON = JSON.parse(document.getElementById("data").innerHTML);
	
	//Create set of unique locations. Each will be represented by a sphere
	uniqueAddress = new Map();
	for(var i = 0; i < Object.keys(packetsJSON).length; i++){
		uniqueAddress.set(packetsJSON[i].Source, null);
		uniqueAddress.set(packetsJSON[i].Destination, null);
	}

	//Adds the 3 aspects vital to displaying anything: scene, camera and renderer
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
	scene.background = new THREE.Color("#384747");
	
	//Adds spheres representing sources/destinations to the scene
	var x0 = 0, y0 = 0;
	var radius = 8;
	var sphere, label, root, x, y;
	var sphereGeometry = new THREE.SphereBufferGeometry(0,32,32);
	var sphereMaterial = new THREE.MeshLambertMaterial( { color: 0x2194CE } );
	var labelDiv, sphereLabel;
	var iter = uniqueAddress.keys();  
	
	for (var i = 0; i < uniqueAddress.size; i++){
		var address = iter.next().value;
		sphere = new THREE.Mesh( sphereGeometry, sphereMaterial );

		//These calculations ensure the spheres lie equidistant in a circle of the given radius
		x = x0 + radius * Math.cos(2 * Math.PI * i/uniqueAddress.size); 
		y = y0 + radius * Math.sin(2 * Math.PI * i/uniqueAddress.size); 
		
		//Create label for the sphere with its corresponding IP address
		labelDiv = document.createElement("div");
		labelDiv.className = 'label';
		labelDiv.textContent = address;
		labelDiv.style.marginTop = '-1em';
		labelDiv.style.color = 'white';
		sphereLabel = new CSS2DObject(labelDiv);
		
		//Position sphere and label, and place them in scene
		sphere.add(sphereLabel);
		sphereLabel.position.set(0.5, 0, 0);
		scene.add(sphere);
		sphere.position.set(x,y,0);
		
		//Keep track of location in 3D space in order to draw lines from sphere to sphere
		uniqueAddress.set(address, new THREE.Vector3(x, y, 0));  
	}
	//Creats and adds a white spotlight behind the camera
		var spotLight = new THREE.SpotLight(0xffffff);
		spotLight.position.set(0, 0, 300);
		scene.add(spotLight);
	
	//Creates and adds WebGLRenderer 
	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight -  window.innerHeight/4); //Cut height so that table below can be seen without scrolling
	document.body.appendChild( renderer.domElement );
	
	//Creates and adds label renderer
	labelRenderer = new CSS2DRenderer();
	labelRenderer.setSize( window.innerWidth, window.innerHeight -  window.innerHeight/4); //Cut height so that table below can be seen without scrolling
	labelRenderer.domElement.style.position = 'absolute';
	labelRenderer.domElement.style.top = "0px";      
	document.getElementsByTagName("canvas")[0].parentElement.appendChild(labelRenderer.domElement );
	
	//Add camera controls
	controls = new TrackballControls(camera, document.getElementsByTagName("canvas")[0].parentElement);
	controls.rotateSpeed = 1.5;
	controls.zoomSpeed = 1.8;
	controls.panSpeed = 1.0;
	controls.keys = [ 65, 83, 68 ];	
	camera.position.z = 20;
}

/**
	Animation/rendering loop
**/
function animate() {
	requestAnimationFrame(animate);
	controls.update();
	labelRenderer.render( scene, camera);
	renderer.render(scene, camera);
}

/**
	Draws a line from a source point to a destination point.
	This function requires the index of the packetsJSON to be drawn
	The coordinates of the points are stored in the uniqueAddress map
**/ 
function drawLine(index) {				
	//Choose colour of line based on protocol
	var colour;
	switch(packetsJSON[index].Protocol){
		case "UDP":
			colour = "#ff0066"; //Fuschia
			break;
		case "CMPP":
			colour = "#00ff00"; //Lime
			break;
		case "TCP": 
			colour = "#00ffff"; //Aqua
			break;
		case "DNS":
			colour = "#ffff00"; //Yellow
			break;
		default:
			colour = "#ffffff"; //White
			console.log("PROTOCOL NOT FOUND: " + packetsJSON[index].Protocol);
	}				
	
	//Create line
	var source = uniqueAddress.get(packetsJSON[index].Source);
	var dest = uniqueAddress.get(packetsJSON[index].Destination);
	var dir = new THREE.Vector3(dest.x-source.x, dest.y-source.y, dest.z-source.z); //Find direction vector between source and dest	
	dir.normalize();   																//Normalize the direction vector 			
	var length = source.distanceTo(dest) - 1;										//Length must account for radius of sphere = 1
	var hex = colour;
	var arrowHelper = new THREE.ArrowHelper(dir, source, length, hex);
	lineList.push(arrowHelper);
	scene.add(arrowHelper);
}

/**
	Draws all lines from index 0
**/
function drawAllLines(){
	for(var i = -1; i < packetsJSON.length - 1; i++){					
		globalIndex++;
		drawLine(globalIndex);
		updateInformationBar(globalIndex);
	}
}

/**
	Updates the information bar with details from the index passed
**/
function updateInformationBar(index){
	if(index == -1){
		document.getElementById("infoNum").innerHTML = "";
		document.getElementById("infoSource").innerHTML = "";
		document.getElementById("infoDest").innerHTML = "";
		document.getElementById("infoType").innerHTML = "";
		document.getElementById("infoLength").innerHTML = "";
		document.getElementById("infoTime").innerHTML = "";
	}else{
		document.getElementById("infoNum").innerHTML = packetsJSON[index]["No."];
		document.getElementById("infoSource").innerHTML = packetsJSON[index].Source;
		document.getElementById("infoDest").innerHTML = packetsJSON[index].Destination;
		document.getElementById("infoType").innerHTML = packetsJSON[index].Protocol;
		document.getElementById("infoLength").innerHTML = packetsJSON[index].Length;
		document.getElementById("infoTime").innerHTML = packetsJSON[index].Time;
	}
}

init();
animate();			
