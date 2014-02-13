
if ( ! Detector.webgl ) {

    Detector.addGetWebGLMessage();
    document.getElementById( 'container' ).innerHTML = "";

}

var container, stats;

var camera, controls, scene, renderer;

var mesh, texture;

var worldWidth = canvasDepth.width, worldDepth = canvasDepth.height,
worldHalfWidth = worldWidth / 2, worldHalfDepth = worldDepth / 2;

var clock = new THREE.Clock();

//init();
//animate();

function init() {

    container = document.getElementById( 'container' );

    camera = new THREE.PerspectiveCamera( 60, 1/*window.innerWidth / window.innerHeight*/, 1, 2000 );

    scene = new THREE.Scene();

    controls = new THREE.FirstPersonControls( camera );
    controls.movementSpeed = 100;
    controls.lookSpeed = 0.1;

    data = generateHeight( worldWidth, worldDepth );

    camera.position.y = data[ worldHalfWidth + worldHalfDepth * worldWidth ] + 50;

    var geometry = new THREE.PlaneGeometry( worldWidth, worldDepth, worldWidth - 1, worldDepth - 1 );
    geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );

    for ( var i = 0, l = geometry.vertices.length; i < l; i ++ ) {
        geometry.vertices[ i ].y = data[ i ];
    }

    texture = new THREE.Texture( generateTexture( data, worldWidth, worldDepth ), new THREE.UVMapping(), THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping );
    texture.needsUpdate = true;

    mesh = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { map: texture } ) );
    scene.add( mesh );

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( 0x000000 );
    renderer.setSize( 600, 600 );

    container.innerHTML = "";

    container.appendChild( renderer.domElement );

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );

    //

    window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

    controls.handleResize();

}

function generateHeight( width, height ) {

    var size = width * height, data = new Float32Array( size ), d;
    
    mapData = canvasFrame.depthContext.getImageData(0, 0, canvasDepth.width, canvasDepth.height).data;
    for ( var i = 0; i < size; i++ ) {
        d = parseInt(10*(1 - mapData[i*4]/255), 10);
        data[ i ] = d;
    }

    return data;

}

function generateTexture( data, width, height ) {

    var canvasScaled, context;

    // Scaled 4x
    canvasScaled = document.createElement( 'canvas' );
    canvasScaled.width = width * 4;
    canvasScaled.height = height * 4;

    context = canvasScaled.getContext( '2d' );
    context.scale( 4, 4 );
    context.drawImage( canvas, 0, 0 );

    return canvasScaled;

}

//

function animate() {

    requestAnimationFrame( animate );

    render();
    stats.update();

}

function render() {

    controls.update( clock.getDelta() );
    renderer.render( scene, camera );

}
