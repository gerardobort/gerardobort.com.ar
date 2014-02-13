
var demo = null,
    CANVAS_WIDTH = 300,
    CANVAS_HEIGHT = 150;

function $(id) { return document.getElementById(id); }

var video = $('video'),
    videoSource = 'gopro3d/GoPro 3D  Winter X Games 2011 Highlights.sd.mp4',
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
                MOTION_COLOR_THRESHOLD: 66,
                GRID_FACTOR: 1,
                RIGHT_SCANNING_ANGLE: -30, // deg
                SCAN_MAX_OFFSET: 40,
                SCAN_OFFSET_STEP: 3,
                STOCASTIC_THRESHOLD: 0,
                DEPTH_MAP_BLUR: 0,
                VIDEO_POSITION: 0,
                playPause: function () {
                    video.paused ? video.play() : video.pause();
                },
                take3dSnapshot: function () {
                    if (demo) {
                        if (!window.initialized) {
                            window.init();
                            window.animate();
                            window.initialized = true;
                        }
                    }
                }
            };
            gui = new dat.GUI({ width: 500 });
            gui.add(demo, 'MOTION_COLOR_THRESHOLD', 0, 255).step(1);
            gui.add(demo, 'GRID_FACTOR', 1, 40).step(1);
            gui.add(demo, 'RIGHT_SCANNING_ANGLE', -180, 180);
            gui.add(demo, 'SCAN_MAX_OFFSET', 2, 80).step(1);
            gui.add(demo, 'SCAN_OFFSET_STEP', 1, 10).step(1);
            gui.add(demo, 'STOCASTIC_THRESHOLD', 0, 1).step(0.0001);
            gui.add(demo, 'DEPTH_MAP_BLUR', 0, 20);
            gui.add(demo, 'VIDEO_POSITION', 0, video.duration).onFinishChange(function (t) { video.currentTime = t; });
            gui.add(demo, 'playPause');
            gui.add(demo, 'take3dSnapshot');
            video.volume = 0;
            video.currentTime = 0;
        }

        canvasFrame.transform();

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
}

CanvasFrame.prototype.transform = function() {

    canvasDepth.style.webkitFilter = 'blur(' + demo.DEPTH_MAP_BLUR + 'px)';

    var videodata = this.original,
        videopx = videodata.data,
        newdata = this.buffer,
        newpx = newdata.data,
        len = newpx.length;

    var i = l = x = y = 0, w = CANVAS_WIDTH, h = CANVAS_HEIGHT,
        fscan, d, m = Math.tan(Math.PI/(180/demo.RIGHT_SCANNING_ANGLE)),
        dx, j, xr, yr, cl, cr, k, depth, colorDepth, offsetFrom, offsetTo;

    // iterate through the entire buffer
    for (i = 0; i < len; i += 4) {

        // default is full depth
        newpx[i+0] = 0;
        newpx[i+1] = 0;
        newpx[i+2] = 0;
        newpx[i+3] = 255;

        x = (i/4) % w;
        // only with the left side video...
        if (x < CANVAS_WIDTH/2) {
            y = parseInt((i/4) / w);
            if (!(x % demo.GRID_FACTOR) && !(y % demo.GRID_FACTOR) && Math.random() > demo.STOCASTIC_THRESHOLD) {
                d = y - m*(x + w/2); // shifted to the right video stream
                fscan = function (xi) { return /*h -*/ (m*xi + d); };

                // pick the left side pixel color
                cl = [videopx[i+0], videopx[i+1], videopx[i+2]];
                for (dx = demo.SCAN_MAX_OFFSET; dx > -demo.SCAN_MAX_OFFSET; dx-=demo.SCAN_OFFSET_STEP) {
                    xr = w/2 + x + dx;
                    yr = parseInt(fscan(xr), 10);
                    if (0 === dx || xr < w/2 || xr > w || yr < 0 || yr > h) continue;
                    j = (yr*w + xr)*4;

                    // pick the right side scanning pixel color
                    cr = [videopx[j+0], videopx[j+1], videopx[j+2]];

                    // if it matches then draw in the depthmap 
                    if (distance3(cl, cr, 0) < demo.MOTION_COLOR_THRESHOLD) {
                        // estimate depth 0 to 1 (higher is deeper)
                        depth = 1/(2*demo.SCAN_MAX_OFFSET) * (dx + demo.SCAN_MAX_OFFSET);

                        colorDepth = parseInt(depth*255, 10);

                        newpx[i+0] = colorDepth;
                        newpx[i+1] = colorDepth;
                        newpx[i+2] = colorDepth;
                        newpx[i+3] = 255;
                        break;
                    }
                }
            }
        }
    }
    this.depthContext.putImageData(newdata, 0, 0);

};

