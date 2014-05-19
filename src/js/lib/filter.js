// A modified version of bitmap.js from http://rest-term.com/archives/2566/

var Class = {
  create : function() {
    var properties = arguments[0];
    function self() {
      this.initialize.apply(this, arguments);
    }
    for(var i in properties) {
      self.prototype[i] = properties[i];
    }
    if(!self.prototype.initialize) {
      self.prototype.initialize = function() {};
    }
    return self;
  }
};

var ConvolutionFilter = Class.create({
  initialize : function(matrix, divisor, bias, separable) {
    this.r = (Math.sqrt(matrix.length) - 1) / 2;
    this.matrix = matrix;
    this.divisor = divisor;
    this.bias = bias;
    this.separable = separable;
  },
  apply : function(src, dst) {
    var w = src.width, h = src.height;
    var srcData = src.data;
    var dstData = dst.data;
    var di, si, idx;
    var r, g, b;

    //if (this.separable) {
      // TODO: optimize if linearly separable ... may need changes to divisor
      // and bias calculations
    //} else {
      // Not linearly separable
      for(var y=0;y<h;++y) {
        for(var x=0;x<w;++x) {
          idx = r = g = b = 0;
          di = (y*w + x) << 2;
          for(var ky=-this.r;ky<=this.r;++ky) {
            for(var kx=-this.r;kx<=this.r;++kx) {
              si = (Math.max(0, Math.min(h - 1, y + ky)) * w +
                    Math.max(0, Math.min(w - 1, x + kx))) << 2;
              r += srcData[si]*this.matrix[idx];
              g += srcData[si + 1]*this.matrix[idx];
              b += srcData[si + 2]*this.matrix[idx];
              //a += srcData[si + 3]*this.matrix[idx];
              idx++;
            }
          }
          dstData[di] = r/this.divisor + this.bias;
          dstData[di + 1] = g/this.divisor + this.bias;
          dstData[di + 2] = b/this.divisor + this.bias;
          //dstData[di + 3] = a/this.divisor + this.bias;
          dstData[di + 3] = 255;
        }
      }
    //}
    // for Firefox
    //dstData.forEach(function(n, i, arr) { arr[i] = n<0 ? 0 : n>255 ? 255 : n; });
  }
});