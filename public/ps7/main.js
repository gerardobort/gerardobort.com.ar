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
    this.hull = new ConvexHull();
    this.direction = $('direction');
    this.ball = $('ball');
    this.ballPosition = [0, 0];
}

CanvasImage.prototype.getData = function() {
    // initialize variables
    this.buffersN = 4;
    this.buffers = [];
    for (var i = 0, l = this.buffersN; i < l; i++) {
        this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
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
        omega = 8,
        i = x = y = 0, w = olddata.width, h = olddata.height;

    var p, nx, ny, dx, dy, j, prevpx, c1, c2, cx, cy, countx = county = 0, maxpx = 20, modulus, versor, pcounter = 0;

    this.setData(newdata);
    var ctx = this.context;

    // iterate through the main buffer and calculate the differences with previous
    for (i = 0; i < len; i += 4) {
        // change the alpha channel based on the frame color differences
        alpha = 255;
        for (var j = 0, l = this.buffersN-1; j < l; j++) {
            if (distance3(this.buffers[j].data, this.buffers[j+1].data, i) < epsilon) {
                alpha -= 255/l;
            }
        }
        newpx[i+3] = parseInt(alpha*0.999);

        x = (i/4) % w;
        y = parseInt((i/4) / w);
        cx = cy = 0;
        if (this.i > 10 && (!(x % omega) && !(y % omega)) && alpha > beta) {
            newpx[i+0] = oldpx[i+0];
            newpx[i+1] = oldpx[i+1];
            newpx[i+2] = oldpx[i+2];
            newpx[i+3] = oldpx[i+3];


            prevpx = this.buffers[this.buffersN-2].data;
            lastpx = this.buffers[this.buffersN-1].data;

            c1 = [lastpx[i+0], lastpx[i+1], lastpx[i+2]];
            
            for (dx = 0; dx < maxpx; dx++) {
                nx = x + dx;
                j = (y*w + nx)*4;
                c2 = [prevpx[j+0], prevpx[j+1], prevpx[j+2]];
                if (distance3(c1, c2, 0) < 50) {
                    cx++;
                } else {
                    break;
                }
            }
            for (dx = 0; dx > -maxpx; dx--) {
                nx = x + dx;
                j = (y*w + nx)*4;
                c2 = [prevpx[j+0], prevpx[j+1], prevpx[j+2]];
                if (distance3(c1, c2, 0) < 50) {
                    cx--;
                } else {
                    break;
                }
            }
            for (dy = 0; dy < maxpx; dy++) {
                ny = y + dy;
                j = (ny*w + x)*4;
                c2 = [prevpx[j+0], prevpx[j+1], prevpx[j+2]];
                if (distance3(c1, c2, 0) < 50) {
                    cy++;
                } else {
                    break;
                }
            }
            for (dy = 0; dy > -maxpx; dy--) {
                ny = y + dy;
                j = (ny*w + x)*4;
                c2 = [prevpx[j+0], prevpx[j+1], prevpx[j+2]];
                if (distance3(c1, c2, 0) < 50) {
                    cy--;
                } else {
                    break;
                }
            }
            countx += cx;
            county += cy;
            pcounter++;

            // Filled triangle
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x+.3*cx, y+.3*cy);
            ctx.closePath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(' + (150+3*cx) + ', 0, ' + (150+3*cy) + ', 0.7)';
            ctx.stroke();
        }
    }

    modulus = Math.sqrt(countx*countx + county*county);
    versor = [countx/modulus, county/modulus];
    if (modulus > 10) {
        this.direction.style.webkitTransform = 'rotate(' + (-Math.atan2(versor[1], versor[0])) + 'rad)';
        this.ballPosition[0] += versor[0]*modulus*.1;
        this.ballPosition[1] -= versor[1]*modulus*.1;
    }
    this.ball.style.webkitTransform = 'translate(' + this.ballPosition.join('px, ') + 'px)';
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


