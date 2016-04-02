if ('https:' !== window.location.protocol && window.location.host.match(/github\.io/)) {
    window.location.protocol = 'https:';
}

function $(id) { return document.getElementById(id); }

navigator.webkitGetUserMedia(
    {video: true},
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
    for (var i = 0; i < 4; i++) {
        transformador = transformadores[i];
        transformador.original = data;
        transformador.transform(manipulators[i].cb, manipulators[i].filter);
    }
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
}

CanvasImage.prototype.getData = function() {
    return this.context.getImageData(0, 0, this.image.width, this.image.height);
};

CanvasImage.prototype.setData = function(data) {
    return this.context.putImageData(data, 0, 0);
};

CanvasImage.prototype.reset = function() {
    this.setData(this.original);
}

CanvasImage.prototype.transform = function(fn, filter) {
    var olddata = this.original;
    var oldpx = olddata.data;
    var newdata = this.context.createImageData(olddata);
    var newpx = newdata.data
    var res = [];
    var len = newpx.length;
    for (var i = 0; i < len; i += 4) {
        res = fn.call(this, oldpx[i], oldpx[i+1], oldpx[i+2], oldpx[i+3], i);
        newpx[i  ] = res[0]; // r
        newpx[i+1] = res[1]; // g
        newpx[i+2] = res[2]; // b
        newpx[i+3] = res[3]; // a
    }
    if (filter) {
        filter(newdata);
    }
    this.setData(newdata);
};

var transformadores = [
    new CanvasImage($('canvas1'), 'color-bars.png'),
    new CanvasImage($('canvas2'), 'color-bars.png'),
    new CanvasImage($('canvas3'), 'color-bars.png'),
    new CanvasImage($('canvas4'), 'color-bars.png'),
];

var manipulators = [
    {
        name: 'none',
        cb: function(r, g, b) {
            return [r, g, b, 255];
        },
    },
    {
        name: 'none',
        cb: function(r, g, b) {
            return [r, g, b, 255];
        },
        filter: Filter.sobel2
    },
    {
        name: 'hue scale',
        cb: function(r, g, b) {
            return [r, g, b, 255];
        },
        filter: Filter.hueScale
    },
    {
        name: 'shape detector',
        cb: function(r, g, b) {
            return [r, g, b, 255];
        },
        filter: Filter.shapeDetector
    }
];

