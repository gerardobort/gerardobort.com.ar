
var CANVAS_WIDTH = 400,
    CANVAS_HEIGHT = 120;

function $(id) { return document.getElementById(id); }


var url ="gopro3d/GoPro 3D  Winter X Games 2011 Highlights.sd.mp4";
$('video').src = url;
webkitRequestAnimationFrame(paintOnCanvas);

$('canvas1').onclick = function () {
    var video = $('video');
    video.paused ? video.play() : video.pause();
}

function paintOnCanvas() {
    var transformador = transformadores[0];
    transformador.context.drawImage(
        $('video'), 0, 0, 
        CANVAS_WIDTH, CANVAS_HEIGHT
    );

    transformador.original = transformador.getData();
    transformador.transform();
    webkitRequestAnimationFrame(paintOnCanvas);
}


function CanvasFrame(canvas) {
    var that = this;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    this.context = canvas.getContext('2d');

    // initialize variables
    this.buffersN = 3;
    this.buffers = [];
    for (var i = 0, l = this.buffersN; i < l; i++) {
        this.buffers.push(this.context.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT));
    }

    // remember the original pixels
    that.original = that.getData();
    this.i = 0;
    this.hull = new ConvexHull();
    this.pointColors = [
        'rgba(0,     0,   0, 0.6)',
        'rgba(0,     0, 255, 0.6)',
        'rgba(0,   255,   0, 0.6)',
        'rgba(0  , 255, 255, 0.6)',
        'rgba(255,   0,   0, 0.6)',
        'rgba(255,   0, 255, 0.6)',
        'rgba(255, 255,   0, 0.6)',
        'rgba(255, 255, 255, 0.6)'
    ];
    this.objectsBuffer = [];
}

CanvasFrame.prototype.getData = function() {

    // shift buffers and store the last one
    for (var i = 0, l = this.buffersN-1; i < l; i++) {
        this.buffers[i] = this.buffers[i+1];
    }
    this.buffers[l] = this.context.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);
    if (this.original) {
        this.buffers[l].data.set(this.original.data);
    }

    return this.context.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
};

CanvasFrame.prototype.setData = function(data) {
    return this.context.putImageData(data, 0, 0);
};

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
        newdata = this.buffers[this.buffersN-1],
        newpx = newdata.data,
        len = newpx.length;

    var MOTION_COLOR_THRESHOLD = 50,
        GRID_FACTOR = 10,
        MOTION_ALPHA_THRESHOLD = 120,
        RIGHT_SCANNING_ANGLE = 30, // deg
        alpha = 0,
        gamma = 3,
        i = l = x = y = 0, w = CANVAS_WIDTH, h = CANVAS_HEIGHT,
        fscan, d, m = Math.tan(Math.PI/(180/RIGHT_SCANNING_ANGLE));

    // iterate through the main buffer
    for (i = 0; i < len; i += 4) {

        x = (i/4) % w;
        y = parseInt((i/4) / w);
        if (!(x % GRID_FACTOR) && !(y % GRID_FACTOR)) {
            if (x < CANVAS_WIDTH/2) {
                newpx[i+0] = 255;
            } else {
                newpx[i+2] = 255;
            }
        }

    }

    this.setData(newdata);
    var ctx = this.context;

    // iterate through the main buffer
    for (i = 0; i < len; i += 4) {

        x = (i/4) % w;
        y = parseInt((i/4) / w);
        if (!(x % GRID_FACTOR) && !(y % GRID_FACTOR)) {
            if (x < CANVAS_WIDTH/2) {
                if (GRID_FACTOR*2 === x || w/2 - GRID_FACTOR*2 === x) {
                    markPoint(ctx, x, y, 2, 'rgba(255, 0, 0, 0.1)');
                    markPoint(ctx, x+w/2, y, 2, 'rgba(255, 0, 0, 0.1)');
                    d = y - m*(x + w/2); // shifted to the right video stream
                    fscan = function (X) { return h - (m*X + d); };

                    ctx.beginPath();
                    ctx.moveTo(w/2, fscan(w/2));
                    ctx.lineTo(w, fscan(w));
                    ctx.closePath();
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = 'rgba(255, 0, 0, 0.1)';
                    ctx.stroke();

                    markPoint(ctx, w/2, h, 2, 'rgba(0, 255, 0, 1)');
                    markPoint(ctx, w, 0, 2, 'rgba(0, 255, 0, 1)');
                }
            } else {
                newpx[i+2] = 255;
            }
        }

    }

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

var transformadores = [
    new CanvasFrame($('canvas1'))
];

