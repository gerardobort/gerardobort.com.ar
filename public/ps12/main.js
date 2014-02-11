
var CANVAS_WIDTH = 400,
    CANVAS_HEIGHT = 300;

function $(id) { return document.getElementById(id); }

navigator.webkitGetUserMedia(
    { video: true },
    iCanHazStream,
    function () {
        console.log('ah too bad')
    }
);

function iCanHazStream(stream) {
    var url = webkitURL.createObjectURL(stream);
    $('video').src = url;
    webkitRequestAnimationFrame(paintOnCanvas);
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
        GRID_FACTOR = 2,
        MOTION_ALPHA_THRESHOLD = 120,
        alpha = 0,
        gamma = 3,
        i = l = x = y = 0, w = CANVAS_WIDTH, h = CANVAS_HEIGHT;

    var k = 2;
        p = o = null,
        dMin = d = 0,
        jMin = 0,
        points = [],
        objects = [],
        step = 0,
        maxSteps = 4,
        maxDelta = 80;

    // iterate through the main buffer and calculate the differences with previous
    for (i = 0; i < len; i += 4) {
        // change the alpha channel based on the frame color differences
        alpha = 255;
        for (var j = 0, l = this.buffersN-1; j < l; j++) {
            if (distance3(this.buffers[j].data, this.buffers[j+1].data, i) < MOTION_COLOR_THRESHOLD) {
                alpha -= 255/l;
            }
        }

        x = (i/4) % w;
        y = parseInt((i/4) / w);
        if (this.i > this.buffersN && (!(x % GRID_FACTOR) && !(y % GRID_FACTOR)) && alpha > MOTION_ALPHA_THRESHOLD) {
            
            newpx[i+0] = videopx[i+0];
            newpx[i+1] = videopx[i+1];
            newpx[i+2] = videopx[i+2];
            newpx[i+3] = parseInt(alpha, 10);

            points.push([x, y]);

        }
    }


    // set a k value dinamically based on the amount of moving points in the canvas
    k = parseInt((points.length*600)/(CANVAS_WIDTH*CANVAS_HEIGHT)/(GRID_FACTOR*GRID_FACTOR), 10);
    if (k === 0) k = 1;
    if (k > 3) k = 3;

    this.setData(newdata);

    var ctx = this.context;

    // PAM algorythm (k-Means clustering)
    for (step = 0; step < maxSteps; step++) {
        for (j = 0; j < k; j++) {
            if (0 === step) {
                if (!this.objectsBuffer[j]) {
                    x = parseInt(Math.random()*CANVAS_WIDTH, 10);
                    y = parseInt(Math.random()*CANVAS_HEIGHT, 10);
                    objects.push([x, y, [], [], 0, 0]); // x, y, innerPointsVec, innerPointsObj, mx, my
                } else {
                    objects.push(this.objectsBuffer[j]);
                }
            } else {
                // re-assign object x,y
                objects[j][0] = objects[j][4]/objects[j][2].length;
                objects[j][1] = objects[j][5]/objects[j][2].length;
                objects[j][2] = [];
                objects[j][3] = [];
                objects[j][4] = 0;
                objects[j][5] = 0;
            }
        }

        for (i = 0, l = points.length; i < l; i++) {
            p = points[i];
            dMin = Number.MAX_VALUE;
            jMin = 0;
            for (j = 0; j < k; j++) {
                o = objects[j];
                if ((d = distance2(p, o, 0)) < dMin) {
                    dMin = d;
                    jMin = j;
                }
            }
            if ((step !== maxSteps-1 || dMin < maxDelta) && objects[jMin]) {
                objects[jMin][2].push(p);
                objects[jMin][3].push({ x: p[0], y: p[1] });
                objects[jMin][4] += p[0];
                objects[jMin][5] += p[1];
            }
        }
    }

    for (var j = 0; j < k; j++) {
        var rpoints = objects[j][3];

        // draw object hulls
        this.hull.clear();
        this.hull.compute(rpoints);
        var indices = this.hull.getIndices();
        if (indices && indices.length > 3) {
            var rp = [rpoints[indices[0]].x, rpoints[indices[0]].y];
            ctx.beginPath();
            ctx.moveTo(rp[0], rp[1]);
            ctx.fillStyle = this.pointColors[j];
            ctx.strokeStyle = "rgba(100, 100, 100, 0)";
            for (i = 1, l = indices.length; i < l; i++) {
                rp = [rpoints[indices[i]].x, rpoints[indices[i]].y];
                ctx.lineTo(rp[0], rp[1]);
            }
            ctx.fill();
            ctx.stroke();
            ctx.closePath();

            if (this.objectsBuffer[j]) {
                var avgP = [(objects[j][0] + this.objectsBuffer[j][0])*0.5, (objects[j][1] + this.objectsBuffer[j][1])*0.5];
                markPoint(ctx, avgP[0], avgP[1], 6, this.pointColors[j]);
            }
            this.objectsBuffer[j] = objects[j]; // update buffer
        } else {
            this.objectsBuffer[j] = null; // update buffer
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

