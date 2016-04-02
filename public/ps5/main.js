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
    this.buffers = [];
    this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    this.avgp0 = [0, 0];
    this.avgp1 = [0, 0];
    this.avgp2 = [0, 0];
    this.avgp3 = [0, 0];
    this.avgp4 = [0, 0];
    this.points0 = [];
    this.points1 = [];
    this.points2 = [];
    this.points3 = [];
    this.points4 = [];
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
    var olddata = this.original;
    var oldpx = olddata.data;
    var newdata = this.context.createImageData(olddata);
    var newpx = newdata.data
    var len = newpx.length;

    this.buffers[0] = this.buffers[1];
    this.buffers[1] = this.buffers[2];
    this.buffers[2] = this.buffers[3];
    this.buffers[3] = this.buffers[4];
    this.buffers[4] = this.context.createImageData(this.original.width, this.original.height);
    this.buffers[4].data.set(this.original.data);
    this.i++;

    var bs = this.buffers,
        bs0 = bs[0].data,
        bs1 = bs[1].data,
        bs2 = bs[2].data,
        bs3 = bs[3].data,
        epsilon = 60,
        gamma = 3,
        omega = 5,
        alpha = 0,
        i = x = y = 0, w = olddata.width, h = olddata.height;


    var cuadricula = new Int8Array(h*w);
    var pointsCounter = 0;

    for (i = 0; i < len; i += 4) {
        newpx[i+0] = 0;
        newpx[i+1] = 255;
        newpx[i+2] = 0;

        alpha = 255;
        if (distance3(bs3, oldpx, i) < epsilon) {
            alpha -= 150;
        }
        if (distance3(bs2, oldpx, i) < epsilon) {
            alpha -= 50;
        }
        if (distance3(bs1, oldpx, i) < epsilon) {
            alpha -= 35;
        }
        if (distance3(bs0, oldpx, i) < epsilon) {
            alpha -= 20;
        }
        newpx[i+3] = alpha*0.2;

        x = (i/4) % w;
        y = parseInt((i/4) / w);
        if ((!(x % omega) && !(y % omega)) && alpha > 255-epsilon && distance2([x, y], [w/2, h/2], 0) > (w+h)/2/3) {
            newpx[i+0] = 255;
            newpx[i+1] = 0;
            newpx[i+2] = 0;
            newpx[i+3] = 0;
            cuadricula[y*w +x] = 1;
            pointsCounter++;
        }
    }

    this.pointsCounter = pointsCounter;
    this.setData(newdata);

    var ctx = this.context;
    var minx = HV = 99999999,
        maxx = LV = -1;

    var minsx = [], maxsx = [], p, points = [], avgp = [w/2, h/2];

    if ((pointsCounter >= gamma) && this.i > 2) {
        for (y = 0; y < h; y++) {
            minx = HV;
            maxx = LV;
            for (x = 0; x < w; x++) {
                i = y*w + x; j = i*4;
                if (cuadricula[i]) {
                    if (x < minx) minx = x;
                    if (x > maxx) maxx = x;
                }
            }
            if (minx !== HV) {
                i = y*w + minx; j = i*4;
                newpx[j+0] = 0;
                newpx[j+1] = 0;
                newpx[j+2] = 255;
                newpx[j+3] = 255;
                minsx.push([minx, y]);
                points.push({ x: minx, y: y });
                //markPoint(ctx, minx, y, 1, 'red');
            }

            if (maxx !== LV) {
                i = y*w + maxx, j = i*4;
                newpx[j+0] = 0;
                newpx[j+1] = 0;
                newpx[j+2] = 255;
                newpx[j+3] = 255;
                maxsx.push([maxx, y]);
                points.push({ x: maxx, y: y });
                //markPoint(ctx, maxx, y, 1, 'blue');
            }
        }

    }


    var allpoints = points.concat(this.points3).concat(this.points2).concat(this.points1).concat(this.points0);

    this.hull.clear();
    this.hull.compute(allpoints);
    var indices = this.hull.getIndices();
    if (indices && indices.length > 0) {
        ctx.beginPath();
        ctx.moveTo(allpoints[indices[0]].x, allpoints[indices[0]].y);
        var p = farp = center = [w/2, h/2], d = fard = 0, farweight = parseInt(pointsCounter/2);
        for (i = 1, l = indices.length; i < l; i++) {
            p = [allpoints[indices[i]].x, allpoints[indices[i]].y];
            ctx.lineTo(p[0], p[1]);
            avgp[0] += (p[0] -w/2)/(l+farweight);
            avgp[1] += (p[1] -h/2)/(l+farweight);
            if ((d = distance2(center, p, 0)) > fard) {
                fard = d;
                farp = p;
            }
        }
        for (i = 0; i < farweight; i++) {
            avgp[0] += (farp[0] -w/2)/(l+farweight);
            avgp[1] += (farp[1] -h/2)/(l+farweight);
        }
        
        ctx.closePath();
        ctx.fillStyle = "rgba(0, 100, 0, 0.2)";
        ctx.strokeStyle = "rgba(100, 100, 100, 0.7)";
        ctx.fill();
        ctx.stroke();

        markPoint(ctx, farp[0], farp[1], 3, 'white');
    }

    this.points0 = this.points1;
    this.points1 = this.points2;
    this.points2 = this.points3;
    this.points3 = this.points4;
    this.points4 = points;

    this.avgp0 = this.avgp1;
    this.avgp1 = this.avgp2;
    this.avgp2 = this.avgp3;
    this.avgp3 = this.avgp4;
    this.avgp4 = avgp;
    var cx = (this.avgp4[0] + this.avgp3[0] + this.avgp2[0] + this.avgp1[0] + this.avgp0[0]) / 5;
    var cy = (this.avgp4[1] + this.avgp3[1] + this.avgp2[1] + this.avgp1[1] + this.avgp0[1]) / 5;
    markPoint(ctx, cx, cy, 10, 'yellow');
    $('plane').style.webkitTransform = 'translate3d(50%, 50%, 0) rotateY(' + ((-(cx/w))*180*0.5 -315) + 'deg) rotateX(' + (-((cy/h)*90*0.5 -20)) + 'deg)';
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


