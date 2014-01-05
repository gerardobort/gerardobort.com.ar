
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

    Filter.sobel3(olddata);
    var i, hslpx;
    for (i = 0; i < len; i += 4) {
        hslpx = rgb2hsl(oldpx[i+0], oldpx[i+1], oldpx[i+2]);
        newpx[i+0] = Math.floor(oldpx[i+0]*.01, 10)*100;
        newpx[i+1] = Math.floor(oldpx[i+1]*.01, 10)*100;
        newpx[i+2] = Math.floor(oldpx[i+2]*.01, 10)*100;
        alpha = 255;
        for (var j = 0, l = this.buffersN-1; j < l; j++) {
            if (distance3(this.buffers[j].data, this.buffers[j+1].data, i) < 60) {
                alpha -= 255/l;
            }
        }
        newpx[i+3] = alpha;
    }
    this.setData(newdata);
    //Filter.eff(newdata);
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
    new CanvasImage($('canvas1'), 'color-bars-small.jpg'),
    new CanvasImage($('canvas2'), 'color-bars-small.jpg'),
];


