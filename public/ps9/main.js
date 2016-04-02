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
        that.ballPosition = [i.width/2, i.height/2, 0];
        that.ballVelocity = [0, 0, 0];
        that.ballOrientation = 1;
        that.ballAngle = 0;
    };
    i.src = src;
    
    // cache these
    this.context = context;
    this.image = i;

    this.i = 0;
    this.ball = $('ball');
}

CanvasImage.prototype.getData = function() {
    // initialize variables
    this.buffersN = 2;
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
        omega = 2,
        i = x = y = 0, w = olddata.width, h = olddata.height;

    var p, nx, ny, dx, dy, j, prevpx, c1, c2, cx, cy, countx = county = 0, maxpx = 30, modulus, versor, pcounter = 0,
        forceRadio = 40, collisionRadio = 16, r,
        ballTouched = false;

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

        x = (i/4) % w;
        y = parseInt((i/4) / w);
        cx = cy = 0;

        if (this.i > 10 && (!(x % omega) && !(y % omega)) && alpha > beta && 
            (r = distance2(this.ballPosition, [x, y], 0)) && r < forceRadio
            ) {
            
            ballTouched = ballTouched || r < collisionRadio;
            newpx[i+0] = 255;
            newpx[i+1] = parseInt(alpha);
            newpx[i+2] = 0;
            newpx[i+3] = 0;//255-parseInt((r/forceRadio)*255);

            if (r < forceRadio) {
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

                /*
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x+.3*cx, y+.3*cy);
                ctx.closePath();
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(' + (150+3*cx) + ', 0, ' + (150+3*cy) + ', 0.7)';
                ctx.stroke();
                */
            }

        }
    }
    this.setData(newdata);

    modulus = Math.sqrt(countx*countx + county*county);
    versor = [countx/modulus, county/modulus];
    if (modulus > 30) {
        if (ballTouched) {
            if (modulus > 50) {
                // reduce the previous velocity
                this.ballVelocity[0] *= .5;
                this.ballVelocity[1] *= .5;
                this.ballOrientation[1] *= -1;
            }
            this.ballVelocity[0] -= versor[0]*modulus*.03;
            this.ballVelocity[1] -= versor[1]*modulus*.03;
        }
    }
    this.ballVelocity[1] += 0.7;

    this.ballPosition[0] += this.ballVelocity[0];
    this.ballPosition[1] += this.ballVelocity[1];

    p = this.ballPosition;

    if (p[0] < 0 + collisionRadio) {
        this.processCollision([1, 0, 0]);
    }
    if (p[0] > w - collisionRadio) {
        this.processCollision([-1, 0, 0]);
    }
    if (p[1] < 0 + collisionRadio) {
        this.processCollision([0, 1, 0]);
    }
    if (p[1] > h - collisionRadio) {
        this.processCollision([0, -1, 0]);
    }

    this.ballVelocity[0] *= 0.99;
    this.ballVelocity[1] *= 0.99;

    this.ballAngle += (this.ballVelocity[0] > 0 ? -1 : 1)*0.2*Math.abs(Math.atan2(this.ballVelocity[1], this.ballVelocity[0]));

    //markPoint(ctx, this.ballPosition[0], this.ballPosition[1], 10, 'yellow');
    this.ball.style.webkitTransform = 'translate(' + 
            ((-this.ballPosition[0]/w)*window.innerWidth + window.innerWidth/2) + 'px, ' + 
            ((this.ballPosition[1]/h)*window.innerHeight - window.innerHeight/2) +  'px) ' +
            'rotate(' + this.ballAngle + 'rad)';

    if (modulus > 30 && ballTouched) { // fire effect
        //markPoint(ctx, this.ballPosition[0], this.ballPosition[1], 12, 'rgba(255,0,0,0.5)');
    }
};

CanvasImage.prototype.processCollision = function(normal) {
    var v1 = this.ballVelocity,
        v2 = this.ballVelocity.v3_reflect(normal);
        oldv = this.ballVelocity;
    this.ballPosition[0] -= oldv[0];
    this.ballPosition[1] -= oldv[1];
    this.ballVelocity = v1.v3_cos(v2) > 0.987 ? [0, 0, 0] : v2.v3_dotProduct(0.89); // velocity decreases by 11%
    this.ballPosition[0] += this.ballVelocity[0];
    this.ballPosition[1] += this.ballVelocity[1];
    if (v1.v3_cos(v2) < 0.5) {
        this.ballAngle = 0;
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
    new CanvasImage($('canvas1'), 'color-bars-large.png'),
    new CanvasImage($('canvas2'), 'color-bars-large.png'),
];


