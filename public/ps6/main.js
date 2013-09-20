
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

    this.avgpN = 6;
    this.avgp = [];
    for (var i = 0, l = this.avgpN; i < l; i++) {
        this.avgp.push([0, 0]);
    }

    this.pointsN = 6;
    this.points = [];
    for (var i = 0, l = this.pointsN; i < l; i++) {
        this.points.push([]);
    }

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
        omega = 5,
        i = x = y = 0, w = olddata.width, h = olddata.height;


    var grid = new Int8Array(h*w);
    var pointsCounter = 0;
    var p, points = [], avgp = [w/2, h/2];
    var refpoints = this.i > this.buffersN*2 ? 
            this.points[this.pointsN - 2] : 
            [
                [1*w/6, h/2] ,
                [3*w/6, h/2] ,
                [5*w/6, h/2] ,
            ], 
        refpointsPoints = [],
        maxrefpoints = 3;
        maxrefpointsPoints = 0;

    // initialize refpointsPoints when taking refpoints from previous frames
    for (var j = 0, l = refpoints.length; j < l; j++) {
        refpointsPoints[j] = [ { x: refpoints[j][0], y: refpoints[j][1] } ];
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
        if ((!(x % omega) && !(y % omega)) && alpha > beta) {
            newpx[i+0] = oldpx[i+0];
            newpx[i+1] = oldpx[i+1];
            newpx[i+2] = oldpx[i+2];
            newpx[i+3] = oldpx[i+3];

            var added = false;
            for (var j = 0, l = refpoints.length; j < l; j++) {
                if (distance2([x, y], refpoints[j], 0) < 90) { // greek const
                    grid[i/4] = j;
                    refpointsPoints[j].push({ x: x, y: y });
                    added = true;
                    if (refpointsPoints.length > maxrefpointsPoints) {
                        maxrefpointsPoints = refpointsPoints.length;
                    }
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

    for (var j = 0, l = refpoints.length; j < l; j++) {
        markPoint(ctx, refpoints[j][0], refpoints[j][1], 3, 'red');
    }

    // store the count number of matched points
    this.pointsCounter = pointsCounter;

    // concatenate the current points with the ones of previous frames 
    var allpoints = [];
    for (var i = 0, l = this.pointsN-1; i < l; i++) {
        allpoints = allpoints.concat(this.points[i]);
    }


    // remove groups with not enough elements
    for (var i = 0, l = refpointsPoints.length; i < l; i++) {
        if (refpointsPoints[i].length < 8) {
            refpoints.splice(i,1);
            refpointsPoints.splice(i,1);
            i--; l--;
        }
    }

    // based on the sumatory of points, calculate the convex hull and paint it
    for (var i = 0, l = refpointsPoints.length; i < l; i++) {
        var rpoints = refpointsPoints[i]||[];
        this.hull.clear();
        this.hull.compute(rpoints);
        var indices = this.hull.getIndices();
        if (indices && indices.length > 0 && indices.length > 3) {
            ctx.beginPath();
            ctx.moveTo(rpoints[indices[0]].x, rpoints[indices[0]].y);
            var p, j, b1, b2, avgp = [w/2, h/2], center = [w/2, h/2], avgc = [0, 0, 0];

            b1 = this.buffers[this.buffersN-1].data;
            b2 = this.buffers[this.buffersN-2].data;

            // calculate avgp
            for (var i2 = 1, l2 = indices.length; i2 < l2; i2++) {
                p = [rpoints[indices[i2]].x, rpoints[indices[i2]].y];
                avgp[0] += (p[0] - center[0])/l;
                avgp[1] += (p[1] - center[1])/l;

                j = (y*w+x)*4;

                avgc[0] += b1[j+0]/l2;
                avgc[1] += b1[j+1]/l2;
                avgc[2] += b1[j+2]/l2;

                if (
                    distance3(b1, b2, j) < 80
                    && distance3(b1, b2, j) < 20
                ) {
                    ctx.lineTo(p[0], p[1]);
                }
            }

            /*
            // discard bad points
            for (var i2 = 1, l2 = indices.length; i2 < l2; i2++) {
                p = [rpoints[indices[i2]].x, rpoints[indices[i2]].y];
                // if (distance2(p, avgp, 0) < 200) {;
                if (distance3(newpx[i2], oldpx[i2], 0) < 100) {;
                    ctx.lineTo(p[0], p[1]);
                }
            }
            */
            ctx.closePath();
            //var color = "rgba(0, 100, 0, 0.9)";
            var color = 'rgba(' + parseInt(avgc[0]) + ',' + parseInt(avgc[1]) + ',' + parseInt(avgc[2]) + ', 0.3)';

/*
            if (1 === i) { color = "rgba(100, 0, 0, 0.9)"; }
            if (2 === i) { color = "rgba(0, 0, 100, 0.9)"; }
            if (3 === i) { color = "rgba(100, 100, 0, 0.9)"; }
            if (4 === i) { color = "rgba(0, 100, 100, 0.9)"; }
*/
            ctx.fillStyle = color;
            

            ctx.strokeStyle = "rgba(100, 100, 100, 0.7)";
            ctx.fill();
            ctx.stroke();
            markPoint(ctx, avgp[0], avgp[1], 10, color);
            points.push(avgp);
        }
    }

    // store the current matched points and shift the array
    for (var i = 0, l = this.pointsN-1; i < l; i++) {
        this.points[i] = this.points[i+1];
    }
    this.points[i-1] = points;

    /*
    // store the current average point and shift the array
    var cx = 0, cy = 0;
    for (var i = 0, l = this.avgpN-1; i < l; i++) {
        this.avgp[i] = this.avgp[i+1];
        cx += this.avgp[i][0]/l;
        cy += this.avgp[i][1]/l;
    }
    this.avgp[i-1] = avgp;

    // paint the average point
    markPoint(ctx, cx, cy, 10, 'yellow');
    */

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

