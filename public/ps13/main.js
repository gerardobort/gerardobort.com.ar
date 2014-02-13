
var CANVAS_WIDTH = 300,
    CANVAS_HEIGHT = 150;

function $(id) { return document.getElementById(id); }


var video = $('video'),
    videoSource = 'gopro3d/GoPro 3D  Winter X Games 2011 Highlights.sd.mp4',
    canvas = $('canvas1'),
    canvasDepth = $('canvas2'),
    canvasFrame = new CanvasFrame(canvas);

canvas.onclick = function () {
    video.paused ? video.play() : video.pause();
};

video.src = videoSource;

function paintOnCanvas() {
    canvasFrame.context.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    canvasFrame.original = canvasFrame.context.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    canvasFrame.buffer = canvasFrame.context.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);
    canvasFrame.buffer.data.set(canvasFrame.original.data);
    canvasFrame.transform();
    webkitRequestAnimationFrame(paintOnCanvas);
}

webkitRequestAnimationFrame(paintOnCanvas);

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

    // remember the original pixels
    this.i = 0;
}

var distance2 = function (v1, v2, i) {
    return Math.sqrt(Math.pow(v1[i+0] - v2[i+0], 2) + Math.pow(v1[i+1] - v2[i+1], 2));
};
var distance3 = function (v1, v2, i) {
    return Math.sqrt(Math.pow(v1[i+0] - v2[i+0], 2) + Math.pow(v1[i+1] - v2[i+1], 2) + Math.pow(v1[i+2] - v2[i+2], 2));
};

CanvasFrame.prototype.transform = function() {

    this.i++;

    var videodata = this.original,
        videopx = videodata.data,
        newdata = this.buffer,
        newpx = newdata.data,
        len = newpx.length;

    var MOTION_COLOR_THRESHOLD = 80,
        GRID_FACTOR = 1,
        RIGHT_SCANNING_ANGLE = -1 * 30, // deg
        SCAN_MAX_OFFSET = GRID_FACTOR*20,
        i = l = x = y = 0, w = CANVAS_WIDTH, h = CANVAS_HEIGHT,
        fscan, d, m = Math.tan(Math.PI/(180/RIGHT_SCANNING_ANGLE));

    var dx, j, xr, yr, cl, cr, k, depth, colorDepth, offsetFrom, offsetTo;

    var ctx = this.context;

    // iterate through the entire buffer
    for (i = 0; i < len; i += 4) {
        x = (i/4) % w;
        // only with the left side video...
        if (x < CANVAS_WIDTH/2) {
            y = parseInt((i/4) / w);
            if (!(x % GRID_FACTOR) && !(y % GRID_FACTOR)) {
                d = y - m*(x + w/2); // shifted to the right video stream
                fscan = function (xi) { return /*h -*/ (m*xi + d); };

                // default is full depth
                newpx[i+0] = 0;
                newpx[i+1] = 0;
                newpx[i+2] = 0;
                newpx[i+3] = 255;

                // pick the left side pixel color
                cl = [videopx[i+0], videopx[i+1], videopx[i+2]];
                for (dx = SCAN_MAX_OFFSET; dx > -SCAN_MAX_OFFSET; dx-=3) {
                    xr = w/2 + x + dx;
                    yr = parseInt(fscan(xr), 10);
                    if (0 === dx || xr < w/2 || xr > w || yr < 0 || yr > h) continue;
                    j = (yr*w + xr)*4;

                    // pick the right side scanning pixel color
                    cr = [videopx[j+0], videopx[j+1], videopx[j+2]];


                    // if matches then draw the depthmap at the right
                    if (distance3(cl, cr, 0) < MOTION_COLOR_THRESHOLD) {
                        depth = 1/(2*SCAN_MAX_OFFSET) * (dx + SCAN_MAX_OFFSET); // estimate depth 0 to 1 (higher is deeper)

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

Array.prototype.v3_reflect = function (normal) {
    var reflectedVector = [],
        vector = this,
        dotProduct = ((vector[0] * normal[0]) + (vector[1] * normal[1])) + (vector[2] * normal[2]);
    reflectedVector[0] = vector[0] - (2 * normal[0]) * dotProduct;
    reflectedVector[1] = vector[1] - (2 * normal[1]) * dotProduct;
    reflectedVector[2] = vector[2] - (2 * normal[2]) * dotProduct;
    return reflectedVector;
};
Array.prototype.v3_cos = function (b) {
    var a = this;
    return a.v3_dotProduct(b)/(a.v3_getModule()*b.v3_getModule());
};
Array.prototype.v3_dotProduct = function (value) {
    var a = this;
    if (typeof value === 'number') {
        return [a[0]*value, a[1]*value, a[2]*value];
    } else {
        return [a[0]*value[0], a[1]*value[1], a[2]*value[2]];
    } 
};
Array.prototype.v3_getModule = function () {
    var vector = this;
    return Math.sqrt(vector[0]*vector[0] + vector[1]*vector[1] + vector[2]*vector[2]);
};

var markPoint = function (context, x, y, radius, color) {
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI, false);
    context.fillStyle = color;
    context.fill();
    context.lineWidth = 0;
    context.strokeStyle = color;
    context.stroke();
};
