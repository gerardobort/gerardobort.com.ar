if ('https:' !== window.location.protocol && window.location.host.match(/github\.io/)) {
    window.location.protocol = 'https:';
}

function $(id) { return document.getElementById(id); }

navigator.webkitGetUserMedia(
    { video: true },
    iCanHazStream,
    function miserableFailure (){
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
        transformador.image.width, transformador.image.height
    );
    var data = transformador.getData();
    
    var i = 1;
    transformador = transformadores[i];
    transformador.original = data;
    transformador.transform();
    webkitRequestAnimationFrame(paintOnCanvas);
}


function CanvasImage(canvas, src) {
    // load image in canvas
    var context = canvas.getContext('2d');
    var i = new Image();
    var that = this;
    i.onload = function(){
        canvas.width = i.width;
        canvas.height = i.height;
        context.drawImage(i, 0, 0, i.width, i.height);

        // remember the original pixels
        that.original = that.getData();
    };
    i.src = src;
    
    // cache these
    this.context = context;
    this.image = i;

    this.i = 0;
    this.pointsCounter = 0;
    this.hull = new ConvexHull();
}

CanvasImage.prototype.getData = function() {

    // initialize variables

    this.buffersN = 4;
    this.buffers = [];
    for (var i = 0, l = this.buffersN; i < l; i++) {
        this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    }

    this.refpointsN = 16;
    this.refpoints = [];
    for (var i = 0, l = this.refpointsN; i < l; i++) {
        this.refpoints.push([]);
    }

    this.refpointsDataN = 16;
    this.refpointsData = [];
    for (var i = 0, l = this.refpointsDataN; i < l; i++) {
        //this.refpointsData.push([]);
    }

    this.refpointsPointsN = 16;
    this.refpointsPoints = [];
    for (var i = 0, l = this.refpointsPointsN; i < l; i++) {
        this.refpointsPoints.push([]);
    }

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

    return this.context.getImageData(0, 0, this.image.width, this.image.height);
};

CanvasImage.prototype.setData = function(data) {
    return this.context.putImageData(data, 0, 0);
};

var distance2 = function (v1, v2, i) {
    return Math.sqrt(Math.pow(v1[i+0] - v2[i+0], 2) + Math.pow(v1[i+1] - v2[i+1], 2));
};
var distance3 = function (v1, v2, i) {
    return Math.sqrt(Math.pow(v1[i+0] - v2[i+0], 2) + Math.pow(v1[i+1] - v2[i+1], 2) + Math.pow(v1[i+2] - v2[i+2], 2));
};

CanvasImage.prototype.transform = function() {

    // shift buffers and store the last one
    for (var i = 0, l = this.buffersN-1; i < l; i++) {
        this.buffers[i] = this.buffers[i+1];
    }
    this.buffers[this.buffersN-1] = this.context.createImageData(this.original.width, this.original.height);
    this.buffers[this.buffersN-1].data.set(this.original.data);

    this.i++;

    var olddata = this.original,
        oldpx = olddata.data,
        newdata = this.context.createImageData(olddata),
        newpx = newdata.data,
        len = newpx.length;

    var epsilon = 40,
        alpha = 0,
        beta = 160,
        gamma = 3,
        omega = 8,
        i = x = y = 0, w = olddata.width, h = olddata.height;


    var grid = new Int8Array(h*w);
    var pointsCounter = 0;
    var p, points = [], avgp = [w/2, h/2];

    var refpoints = [],
        refpointsPoints = [],
        maxrefpoints = 10;

    // take previous frames information when availbale
    if (this.i > this.buffersN*2) {
        refpoints = this.refpoints[this.refpointsN-1];
        refpointsPoints = this.refpointsPoints[this.refpointsPointsN-1];
    }

    // iterate through the main buffer and calculate the differences with previous
    for (i = 0; i < len; i += 4) {
        // change the alpha channel based on the frame color differences
        alpha = 255;
        for (var j = 0, l = this.buffersN-1; j < l; j++) {
            if (distance3(this.buffers[j].data, this.buffers[j+1].data, i) < epsilon) {
                alpha -= 255/l;
            }
        }
        newpx[i+3] = parseInt(alpha*0.2);

        // check if the point belongs to the grid and also if it has changed
        x = (i/4) % w;
        y = parseInt((i/4) / w);
        if (this.i > 10 && (!(x % omega) && !(y % omega)) && alpha > beta) {
            newpx[i+0] = oldpx[i+0];
            newpx[i+1] = oldpx[i+1];
            newpx[i+2] = oldpx[i+2];
            newpx[i+3] = oldpx[i+3];

            var added = false;
            for (var j = 0, l = refpoints.length; j < l; j++) {
                if (distance2([x, y], refpoints[j], 0) < 60) { // greek const
                    grid[i/4] = j;
                    refpointsPoints[j].push({ x: x, y: y });
                    added = true;
                    break;
                }
            }
            if (!added && refpoints.length < maxrefpoints) {
                refpoints.push([x, y]);
                refpointsPoints.push([ {x: x, y: y } ]);
            }
        }
    }

    this.setData(newdata);

    // calculate and generate point groups based on density 
    var ctx = this.context;

    /*
    for (var j = 0, l = refpoints.length; j < l; j++) {
        markPoint(ctx, refpoints[j][0], refpoints[j][1], 3, 'red');
    }
    */

    // store the count number of matched points
    this.pointsCounter = pointsCounter;

    // concatenate the current points with the ones of previous frames 
    /*
    var allpoints = [];
    for (var i = 0, l = this.pointsN-1; i < l; i++) {
        allpoints = allpoints.concat(this.points[i]);
    }
    */


    // remove groups with not enough elements
    for (var i = 0, l = refpointsPoints.length; i < l; i++) {
        if (refpointsPoints[i].length < 1) {
            refpoints.splice(i, 1);
            this.refpointsData.splice(i, 1);
            refpointsPoints.splice(i, 1);
            i--; l--;
        }
    }

    // based on the sumatory of points, calculate the convex hull and paint it
    for (var i = 0, l = refpointsPoints.length; i < l; i++) {
        var rpoints = refpointsPoints[i]||[];
        this.hull.clear();
        this.hull.compute(rpoints);
        var indices = this.hull.getIndices();
        if (indices && indices.length > 0 && indices.length > 1) {

            var rp = [rpoints[indices[0]].x, rpoints[indices[0]].y];
            var p, po, j, b1, b2, goodPoints = [], gpl = 0, avgp = [0, 0], center = [w/2, h/2];

            b1 = this.buffers[this.buffersN-1].data;
            b2 = this.buffers[this.buffersN-2].data;

            ctx.beginPath();
            ctx.moveTo(rp[0], rp[1]);

            po = rp;
            // calculate avgp
            for (var i2 = 1, l2 = indices.length; i2 < l2; i2++) {
                p = [rpoints[indices[i2]].x, rpoints[indices[i2]].y];
                j = (p[1]*w+p[0])*4;
                //ctx.lineTo(p[0], p[1]);

                if (
                    distance2(p, po, 0) < 60 // space distance 
                    && distance3(b1, b2, j) < 90 // color distance
                ) {
                    goodPoints.push(p);
                }
                po = p;
            }

            for (var i2 = 0, l2 = goodPoints.length; i2 < l2; i2++) {
                p = goodPoints[i2];
                j = (p[1]*w+p[0])*4;

                avgp[0] += p[0]/l2;
                avgp[1] += p[1]/l2;
            }

            ctx.closePath();

            if (goodPoints.length) {

                var background = 'rgba(0, 255, 0, 0.2)';
                this.refpointsData[i] = this.refpointsData[i] || { 
                    color: this.pointColors[ parseInt(8*Math.random()+2) ] 
                };
                var color = this.refpointsData[i].color;

                ctx.fillStyle = background;
                ctx.strokeStyle = "rgba(100, 100, 100, 0)";
                ctx.fill();
                ctx.stroke();

                var finalAvgp = [avgp[0], avgp[1]], j = 1;
                for (var i2 = 0, l2 = this.refpointsN; i2 < l; i2++) {
                    if (this.refpoints[i2][i] && distance2(this.refpoints[i2][i], avgp, 0) < 90) {
                        finalAvgp[0] += this.refpoints[i2][i][0];
                        finalAvgp[1] += this.refpoints[i2][i][1];
                        j++;
                    }
                }
                finalAvgp[0] /= j;
                finalAvgp[1] /= j;

                //markPoint(ctx, rp[0], rp[1], 3, 'yellow');
                markPoint(ctx, finalAvgp[0], finalAvgp[1], 6, color);

                refpointsPoints[i] = goodPoints;
                refpoints[i] = avgp;
            }
        }
    }

    // store the current matched points and shift the array
    for (var i = 0, l = this.refpointsN-1; i < l; i++) {
        this.refpoints[i] = this.refpoints[i+1];
    }
    this.refpoints[i-1] = refpoints;

    // store the current matched points and shift the array
    for (var i = 0, l = this.refpointsPointsN-1; i < l; i++) {
        this.refpointsPoints[i] = this.refpointsPoints[i+1];
    }
    this.refpointsPoints[i-1] = refpointsPoints;

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
    new CanvasImage($('canvas1'), 'color-bars-medium.jpg'),
    new CanvasImage($('canvas2'), 'color-bars-medium.jpg'),
];


