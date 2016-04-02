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
    for (var i = 1; i < 3; i++) {
        if (manipulators[i].skip) continue;
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

    this.i = 0;
}

CanvasImage.prototype.getData = function() {
    this.buffers = [];
    this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    this.buffers.push(this.context.createImageData(this.image.width, this.image.width));
    return this.context.getImageData(0, 0, this.image.width, this.image.height);
};

CanvasImage.prototype.setData = function(data) {
    return this.context.putImageData(data, 0, 0);
};

CanvasImage.prototype.reset = function() {
    this.setData(this.original);
}

CanvasImage.prototype.transform = function(fn, filter) {
    this.buffers[0] = this.buffers[1];
    this.buffers[1] = this.buffers[2];
    this.buffers[2] = this.buffers[3];
    this.buffers[3] = this.buffers[4];
    this.buffers[4] = this.context.createImageData(this.original.width, this.original.height);
    this.buffers[4].data.set(this.original.data);
    this.i++;

    var olddata = this.original;
    var oldpx = olddata.data;
    var newdata = this.context.createImageData(olddata);
    var newpx = newdata.data
    var res = [];
    var len = newpx.length;

    var bs = this.buffers,
        bs0 = bs[0].data,
        bs1 = bs[1].data,
        bs2 = bs[2].data,
        bs3 = bs[3].data,
        eps=60;
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
    var distance3 = function (v1, v2, i) {
        i = i || 0;
        return Math.sqrt(Math.pow(v1[i+0] - v2[i+0], 2) + Math.pow(v1[i+1] - v2[i+1], 2) + Math.pow(v1[i+2] - v2[i+2], 2));
    };
    for (var i = 0; i < len; i += 4) {
        newpx[i+0] = 0;
        newpx[i+1] = 255;//(newpx[i+0] + newpx[i+1] + newpx[i+2])/3;
        newpx[i+2] = 0;
        newpx[i+3] = 255;
        if (distance3(bs3, oldpx, i) < eps) {
            newpx[i+3] -= 150;
        }
        if (distance3(bs2, oldpx, i) < eps) {
            newpx[i+3] -= 50;
        }
        if (distance3(bs1, oldpx, i) < eps) {
            newpx[i+3] -= 35;
        }
        if (distance3(bs0, oldpx, i) < eps) {
            newpx[i+3] -= 20;
        }
    }
    this.setData(newdata);
};

var transformadores = [
    new CanvasImage($('canvas1'), 'color-bars-medium.jpg'),
    new CanvasImage($('canvas2'), 'color-bars.png'),
    new CanvasImage($('canvas3'), 'color-bars-medium.jpg'),
];

var manipulators = [
    {
        name: 'none',
        cb: function(r, g, b) {
            return [r, g, b, 255];
        },
        skip: true
    },
    {
        name: 'none',
        cb: function(r, g, b) {
            return [r, g, b, 255];
        },
        skip: true
    },
    {
        name: 'shape detector',
        cb: function(r, g, b) {
            return [r, g, b, 255];
        },
        filter: Filter.grayscale
    }
];

