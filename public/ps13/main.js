
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
                EPIPOLES_OFFSET_X: 10,
                EPIPOLES_OFFSET_Y: 0,
                COLOR_THRESHOLD: 60,
                SCAN_MAX_OFFSET: 5,
                SCAN_OFFSET_STEP: 2,
                GRID_FACTOR: 1,
                STOCASTIC_RATIO: 0,
                DEPTH_SATURATION: 1,
                DEPTH_SCALE: 3,
                PROCESSING_RATIO: 2,
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
            gui.add(demo, 'EPIPOLES_OFFSET_X', - CANVAS_WIDTH, CANVAS_WIDTH).step(1);
            gui.add(demo, 'EPIPOLES_OFFSET_Y', - CANVAS_HEIGHT/2, CANVAS_HEIGHT/2).step(1);
            gui.add(demo, 'COLOR_THRESHOLD', 0, 255).step(1);
            gui.add(demo, 'SCAN_MAX_OFFSET', 2, 80).step(1);
            gui.add(demo, 'SCAN_OFFSET_STEP', 1, 10).step(1);
            gui.add(demo, 'GRID_FACTOR', 1, 40).step(1);
            gui.add(demo, 'STOCASTIC_RATIO', 0, 1).step(0.0001);
            gui.add(demo, 'DEPTH_SATURATION', 0, 10).step(0.0001);
            gui.add(demo, 'DEPTH_SCALE', -20, 20).step(1);
            gui.add(demo, 'PROCESSING_RATIO', 1, 30).step(1);
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


    var ctx = this.context;

    // iterate through the entire buffer
    for (i = 0; i < len; i += 4) {

        x = (i/4) % w;
        // only with the left side video...
        if (x < CANVAS_WIDTH/2) {
            y = parseInt((i/4) / w);
            if (!(x % demo.GRID_FACTOR) && !(y % demo.GRID_FACTOR) && Math.random() > demo.STOCASTIC_RATIO) {

                Dx = x - demo.EPIPOLES_OFFSET_X;
                Dy = y - h/2 + demo.EPIPOLES_OFFSET_Y;
                m = Dy/Dx;
                d = y - m*(x + w/2);
                fscan = function (xi) { return (m*(xi + demo.EPIPOLES_OFFSET_X) + d); };

                minD = Number.MAX_VALUE;
                count = 0;
                // default is full depth
                depth = 1;

                // pick the left side pixel color
                cl = [videopx[i+0], videopx[i+1], videopx[i+2]];
                for (dx = demo.SCAN_MAX_OFFSET; dx > -demo.SCAN_MAX_OFFSET; dx-=demo.SCAN_OFFSET_STEP) {
                    xr = w/2 + x + dx;
                    yr = parseInt(fscan(xr), 10);
                    if (xr < w/2 || xr > w || yr < 0 || yr > h) continue;
                    j = (yr*w + xr)*4;

                    if (Math.random() > 0.9999) {
                        ctx.beginPath();
                        ctx.moveTo(x+w/2, y);
                        ctx.lineTo(xr, yr);
                        ctx.closePath();
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = '#f00';
                        ctx.stroke();
                        
                    }

                    // pick the right side scanning pixel color
                    cr = [videopx[j+0], videopx[j+1], videopx[j+2]];

                    // if it matches then draw in the depthmap 
                    if ((distance = distance3(cl, cr, 0)) < minD) {
                        count++;
                        // estimate depth from 0 to 1 (higher is deeper)
                        depth = 1/(2*demo.SCAN_MAX_OFFSET) * (Math.abs(dx) + demo.SCAN_MAX_OFFSET);
                        minD = distance;
                        if (count > demo.SCAN_MAX_OFFSET || minD < demo.COLOR_THRESHOLD) {
                            break;
                        }
                    }
                }
                if (minD > 0 && minD < demo.COLOR_THRESHOLD) {
                    depth = depth * (demo.COLOR_THRESHOLD/(minD + demo.COLOR_THRESHOLD));
                }
                // apply depth saturation if <> 1
                depth *= demo.DEPTH_SATURATION;
                depth = depth > 1 ? 1 : depth;

                // draw depth canvas buffer
                colorDepth = parseInt(depth*255, 10);
                newpx[i+0] = colorDepth;
                newpx[i+1] = colorDepth;
                newpx[i+2] = colorDepth;
                newpx[i+3] = 255;
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

