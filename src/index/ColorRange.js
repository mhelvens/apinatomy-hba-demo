define(['chroma-js'], function(Chroma) {
    var PHI = (1 + Math.sqrt(5)) / 2;

	return (() => {
		function ColorRange() {
			this._hue = 45;
			this._lightness = 50;
		}

		ColorRange.prototype._cycle = function (prop, bottom, top, q) {
			this[prop] = (this[prop] - bottom + (top - bottom) / q) % (top - bottom) + bottom;
		};

		ColorRange.prototype.next = function () {
			var result = Chroma.lch(this._lightness, 100, this._hue);
			this._cycle('_hue', 0, 360, PHI);
			this._cycle('_lightness', 10, 90, PHI / 2.5);
			return result;
		};
		return ColorRange;
	})();
});
