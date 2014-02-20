
var demo = null,
    CANVAS_WIDTH = 2*320,
    CANVAS_HEIGHT = 2*160;

function $(id) { return document.getElementById(id); }

var video = $('video'),
    //videoSource = 'gopro3d/GoPro 3D  Winter X Games 2011 Highlights.sd.mp4', // 640x360
    videoSource = 'gopro3d/GoPro 3D  Hero 2 during Mammoth Mountain Blizzard.sd.mp4', // 640x360
    canvas = $('canvas1'),
    canvasDepth = $('canvas2'),
    canvasFrame = new CanvasFrame(canvas);

video.addEventListener('loadedmetadata', function () {
    function paintOnCanvas() {
        canvasFrame.context.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        canvasFrame.original = canvasFrame.context.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        canvasFrame.buffer = canvasFrame.context.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);
        canvasFrame.buffer.data.set(canvasFrame.original.data);

        if (!demo) {
            demo = {
                OFFSET_X: 1,
                OFFSET_Y: -4,
                BALANCE_THRESHOLD: 10,
                ERROR_TOLERANCE: 200,
                DEPTH_STEP: 5,
                GRID_FACTOR: 1,
                STOCASTIC_RATIO: 0,
                DEPTH_SATURATION: 1,
                DEPTH_SCALE: -0.5,
                PROCESSING_RATIO: 2,
                SHOW_DEPTH: true,
                SIMPLE_BLUR: false,
                GAUSSIAN_BLUR: 0,
                VIDEO_POSITION: 0,
                playPause: function () {
                    video.paused ? video.play() : video.pause();
                },
                webGLRender: function () {
                    if (demo) {
                        if (!window.initialized) {
                            window.init();
                            window.animate();
                            window.initialized = true;
                        }
                    }
                }
            };
            gui = new dat.GUI({ width: 400 });
            gui.add(demo, 'OFFSET_X', - CANVAS_WIDTH, CANVAS_WIDTH).step(1);
            gui.add(demo, 'OFFSET_Y', - CANVAS_HEIGHT/2, CANVAS_HEIGHT/2).step(1);
            gui.add(demo, 'BALANCE_THRESHOLD', 0, 255).step(1);
            gui.add(demo, 'ERROR_TOLERANCE', 0, 255).step(1);
            gui.add(demo, 'DEPTH_STEP', 1, 40).step(1);
            gui.add(demo, 'GRID_FACTOR', 1, 40).step(1);
            gui.add(demo, 'STOCASTIC_RATIO', 0, 1).step(0.0001);
            gui.add(demo, 'DEPTH_SATURATION', 0, 10).step(0.0001);
            gui.add(demo, 'DEPTH_SCALE', -2, 2).step(0.0011);
            gui.add(demo, 'PROCESSING_RATIO', 1, 30).step(1);
            gui.add(demo, 'SHOW_DEPTH');
            gui.add(demo, 'SIMPLE_BLUR');
            gui.add(demo, 'GAUSSIAN_BLUR', 0, 10).step(1);
            gui.add(video, 'currentTime', 0, video.duration)
                .listen();
            gui.add(demo, 'playPause');
            gui.add(demo, 'webGLRender');
            video.volume = 0;
            video.currentTime = 0;
        }

        if (0 === ++canvasFrame.renderFrameCounter % demo.PROCESSING_RATIO) {
            canvasFrame.transform();
            if (demo && window.initialized) {
                updateHeightmap();
            }
        }

        webkitRequestAnimationFrame(paintOnCanvas);
    }

    webkitRequestAnimationFrame(paintOnCanvas);
});

video.src = videoSource;


var distance2 = function (v1, v2, i) {
    return Math.sqrt(Math.pow(v1[i+0] - v2[i+0], 2) + Math.pow(v1[i+1] - v2[i+1], 2));
};

var distance3 = function (v1, v2, i) {
    return Math.sqrt(Math.pow(v1[i+0] - v2[i+0], 2) + Math.pow(v1[i+1] - v2[i+1], 2) + Math.pow(v1[i+2] - v2[i+2], 2));
};

function CanvasFrame(canvas) {
    var that = this;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    this.context = canvas.getContext('2d');

    canvasDepth.width = CANVAS_WIDTH/2;
    canvasDepth.height = CANVAS_HEIGHT;
    this.depthContext = canvasDepth.getContext('2d');

    // initialize variables
    this.buffer = this.context.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.renderFrameCounter = 0;
}

CanvasFrame.prototype.transform = function() {

    var videodata = this.original,
        videopx = videodata.data,
        newdata = this.buffer,
        newpx = newdata.data,
        len = newpx.length;

    var i = l = x = y = 0, w = CANVAS_WIDTH, h = CANVAS_HEIGHT,
        fscan, d, m, Dx, Dy,
        dx, j, xr, yr, cl, cr, k, depth, colorDepth, offsetFrom, offsetTo, minD, distance, count;

    var cyan = [0, 175, 236]; // (CMYK=100,0,0,0)
    var yellow = [255, 240, 42]; // (CMYK=0,0,100,0)
    var e = demo.ERROR_TOLERANCE;
    var step = demo.DEPTH_STEP;
    var righthandY = {};


    var ctx = this.context;

    // iterate through the entire buffer
    for (i = 0; i < len; i += 4) {

        if (0 === x) depth = 255;
        x = (i/4) % w;
        // only with the left side video...
        if (x < CANVAS_WIDTH/2) {
            y = parseInt((i/4) / w);
            if (!(x % demo.GRID_FACTOR) && !(y % demo.GRID_FACTOR) && Math.random() > demo.STOCASTIC_RATIO) {

                xr = w/2 + x + demo.OFFSET_X;
                yr = y + demo.OFFSET_Y;
                j = (yr*w + xr)*4;
                k = (y*w + w/2 -1)*4;

                distance = parseInt(Math.sqrt(
                    (videopx[i]-videopx[j])*(videopx[i]-videopx[j])
                    + (videopx[i+1]-videopx[j+1])*(videopx[i+1]-videopx[j+1])
                    + (videopx[i+2]-videopx[j+2])*(videopx[i+2]-videopx[j+2])
                ), 10);
                
                cl = [videopx[j], distance, videopx[i]];
                if (distance3(cl, cyan, 0) < e) {
                    depth -= step;
                } else if (distance3(cl, yellow, 0) < e) {
                    depth += step;
                }

                // draw depth canvas buffer
                if (demo.SHOW_DEPTH) {
                    newpx[i+0] = depth;
                    newpx[i+1] = depth;
                    newpx[i+2] = depth;
                } else {
                    newpx[i+0] = videopx[j];
                    newpx[i+1] = distance;
                    newpx[i+2] = videopx[i];
                }
                
                if (x === w/2-1) {
                    righthandY[y] = depth;
                }
                
            } else {
                newpx[i+0] = 0;
                newpx[i+1] = 0;
                newpx[i+2] = 0;
                newpx[i+3] = 255;
            }
        }
    }


    // iterate through the entire buffer
    for (i = len-4; i > -1; i -= 4) {

        if (w/2 === x) depth = 255;
        x = Math.floor((i/4) % w, 10) +1;
        // only with the left side video...
        if (x < CANVAS_WIDTH/2) {
            y = parseInt((i/4) / w);
            if (!(x % demo.GRID_FACTOR) && !(y % demo.GRID_FACTOR) && Math.random() > demo.STOCASTIC_RATIO) {

                xr = w/2 + x + demo.OFFSET_X;
                yr = y +demo.OFFSET_Y;
                j = (yr*w + xr)*4;
                k = (y*w + w/2 -1)*4;

                distance = parseInt(Math.sqrt(
                    (videopx[i]-videopx[j])*(videopx[i]-videopx[j])
                    + (videopx[i+1]-videopx[j+1])*(videopx[i+1]-videopx[j+1])
                    + (videopx[i+2]-videopx[j+2])*(videopx[i+2]-videopx[j+2])
                ), 10);
                
                cl = [videopx[j], distance, videopx[i]];
                if (distance3(cl, cyan, 0) < e) {
                    depth += step;
                } else if (distance3(cl, yellow, 0) < e) {
                    depth -= step;
                }

                // draw depth canvas buffer
                if (demo.SHOW_DEPTH) {
                    newpx[i+0] = depth;
                    newpx[i+1] = depth;
                    newpx[i+2] = depth;
                } else {
                    newpx[i+0] = videopx[j];
                    newpx[i+1] = distance;
                    newpx[i+2] = videopx[i];
                }
                
            } else {
                newpx[i+0] = 0;
                newpx[i+1] = 0;
                newpx[i+2] = 0;
                newpx[i+3] = 255;
            }
        }
    }
    if (demo.SIMPLE_BLUR) {
        Filter.blur(newdata);
    }
    this.depthContext.putImageData(newdata, 0, 0);
    if (demo.GAUSSIAN_BLUR > 0) {
        stackBlurCanvasRGB('canvas2', 0, 0, canvasDepth.width, canvasDepth.height, demo.GAUSSIAN_BLUR);
    }

};

