/*
 * 104 JavaScript framework & Library
 * Requires: 
 * - mootools core/more 1.5.1
 * - mbox0.2.6
 * - meio.autocomplete
 * - meio.mask
 */

var E104 = {
	name: '104 JavaScript Library',
	version: '1.12.150616',
	base: 'mootools 1.5.1',
	Constant: {	},
	global: {
		ipe: null
	}
};

JSON.secure = false;

// extension Fx.rotate ////////////////////////////////////////////////////////////////////////////////////////////////////
(function($, $$) {
	// IE 10 detection
	Browser.ie10 = Browser.ie && !Browser.ie9 && navigator.userAgent.test(/Trident\/6\.0/);

	// each browser has it own vendor prefix
	if (Browser.chrome || Browser.safari) Browser.vendorPrefix = '-webkit-';
	else if (Browser.firefox) Browser.vendorPrefix = '-moz-';
	else if (Browser.opera) Browser.vendorPrefix = '-o-';
	else if (Browser.ie10 || Browser.ie9 || Browser.ie8) Browser.vendorPrefix = '-ms-';
	else Browser.vendorPrefix = '';

	Fx.Rotate = new Class({
		Extends : Fx,
		options : {
			fps : 40,
			ieFps : 30,
			origin : 'center center',
			link : 'cancel',
			normalizeDegreeAfterComplete : true
		},
		CIRCLE : 360,
		HALF_A_CIRCLE : 180,
		RIGHT_ANGLE : 90,

		initialize : function(element, options) {
			this.prefix = Browser.vendorPrefix;
			this.transforms = !Browser.ie || Browser.ie9 || Browser.ie10;
			this.element = $(element);
			this.accessor = '';

			this.parent(options);
			if (this.transforms) {
				var accessor = this.prefix.replace(/-/g, '');
				// all other browsers like the uppercase start value
				if (!Browser.ie9 && !Browser.ie10)
					accessor = accessor.charAt(0).toUpperCase() + accessor.substr(1);
				this.accessor = accessor + 'Transform';
				// set the default origin
				var accessorOrigin = accessor + 'TransformOrigin';
				this.element.style[accessorOrigin] = this.options.origin;
				// set the rotation method
				this.set = this._setTransformMethod();
			}
			else {
				this.options.fps = this.options.ieFps || this.options.fps;
				this.set = this._setIEMethod();
			}
			
			if (this.options.normalizeDegreeAfterComplete)
				this.addEvent('complete', this.normalizeDegree.bind(this));
		},

		start : function(from, to) {
			if (to == null) {
				to = from + '';
				from = this.getCurrentRotation().toInt();
				f = to.charAt(0);
				to = to.toInt();
				if (f == '+') to = from + Math.abs(to);
				else if (f == '-') to = from - Math.abs(to);
			}
			this.degreeFrom = from.toInt();
			this.degreeTo = to.toInt();
			this.parent(this.degreeFrom, this.degreeTo);
			return this;
		},

		getCurrentRotation : function() {
			var rotation = null;
			if (this.transforms) {
				// this is required to find the full css style for the element (style and css)
				var style;
				if (Browser.ie)
					style = (this.element.style['transform'] || '')
						+ ' ' + (this.element.style['-ms-transform'] || '')
						+ ' ' + (this.element.currentStyle['transform'] || '')
						+ ' ' + (this.element.currentStyle['-ms-transform'] || '')
						+ ' ';
				else {
					var accessor = this.accessor;
					if (!Browser.firefox) accessor = Browser.vendorPrefix + 'transform';
					// get the full style ... in order of css3 style, css3 vendor style, css3 stylesheet, css3 vendor stylesheet
					style = (this.element.style['transform'] || '')
						+ ' ' + (this.element.style[this.accessor] || '')
						+ ' ' + (document.defaultView.getComputedStyle(this.element, null).getPropertyValue('transform') || '')
						+ (document.defaultView.getComputedStyle(this.element, null).getPropertyValue(accessor) || '');
				}

				style = style.trim();
				if (style.length > 0) {
					var rotateResults = style.match(/rotate\((-?\d+).*?\)/);
					if (rotateResults && rotateResults.length > 1)
						rotation = rotateResults && rotateResults.length > 1 ? rotateResults[1] : 0;
					else {
						// this will return the default value based off the transform using the inverse of cos
						var matrixResults = style.match(/matrix\((.+?),(.+?),.+?\)/);
						if (matrixResults && matrixResults.length > 1) {
							var sintheta = matrixResults[2];
							var sin = Math.asin(sintheta);
							var deg = Math.round((sin * this.HALF_A_CIRCLE) / Math.PI);
							rotation = deg && deg != 0 ? deg : 0;
						}
					}
				}
			}

			if (rotation == null && Browser.ie && this.element.filters && this.element.filters.length > 0) { // ie
				var isMatrix = false, isBasic = false;
				for (var i in this.element.filters) {
					if (i == 'DXImageTransform.Microsoft.BasicImage') {
						isRotation = true;
						break;
					}
					if (i == 'DXImageTransform.Microsoft.Matrix') {
						isMatrix = true;
						break;
					}
				}

				if (isBasic) {
					var basic = this.element.filters('DXImageTransform.Microsoft.BasicImage');
					if (basic && basic.Rotation != null) rotation = Math.round(basic.Rotation * this.RIGHT_ANGLE);
					this.element.filters(0).enabled = 0;
				}
				else if (isMatrix) {
					var matrix = this.element.filters('DXImageTransform.Microsoft.Matrix');
					matrix.SizingMethod = 'auto expand';
					if (matrix && matrix.M11) {
						var sintheta = matrix.M12;
						var cos = Math.asin(sintheta);
						var deg = Math.round((sin * this.HALF_A_CIRCLE) / Math.PI);
						rotation = deg && deg != 0 ? deg : 0;
					}
				}
			}
			return rotation || 0;
		},

		normalize : function(skip) {
			if (skip) this.set(0);
			else {
				var current = this.getCurrentRotation();
				var magnitude = Math.abs(current);
				var end = magnitude >= 180 ? 360 : 0;
				this.start(end);
			}
		},

		normalizeDegree : function() {
			var fin = this.degreeTo % this.CIRCLE;
			this.set(fin);
		},

		_setIEMethod : function() {
			// the element needs to have the boolean enabled : hasLayout (zoom does this)
			this.element.style.zoom = "1";
			this.deg2radians = Math.PI / this.HALF_A_CIRCLE;

			// normalize the rotation for ie
			var rotation = this.getCurrentRotation();

			// setup the first matrix values so that it won't flicker
			var rad = this.deg2radians * rotation;
			costheta = Math.cos(rad);
			sintheta = Math.sin(rad);
			this.element.style.filter = "progid:DXImageTransform.Microsoft.Matrix(sizingMethod='auto expand',M11="
					+ costheta + ", M12=" + sintheta + ", M21=" + (0 - sintheta) + ", M22=" + costheta + ")";
			this.set(rotation);

			// setup the function for rotation for ie
			return function(rotation) {
				var rad = this.deg2radians * rotation;
				costheta = Math.cos(rad);
				sintheta = Math.sin(rad);
				this.element.filters(0).M11 = costheta;
				this.element.filters(0).M12 = -sintheta;
				this.element.filters(0).M21 = sintheta;
				this.element.filters(0).M22 = costheta;
			}.bind(this);
		},

		_setTransformMethod : function() {
			//var prefix = Browser.vendorPrefix;
			return function(rotation) {
				this.element.style[this.accessor] = 'rotate(' + rotation + 'deg)';
			}.bind(this);
		}
	});

	Element.implement({
		rotate : function(fromOrTo, toOrSkip) {
			var rotate = $(this).get('rotate');
			if (toOrSkip === true) rotate.set(fromOrTo);
			else rotate.start(fromOrTo, toOrSkip);
			return rotate;
		},

		normalizeRotation : function(skip) {
			var rotate = $(this).get('rotate');
			rotate.normalize(skip);
			return rotate;
		}
	});

	Element.Properties.rotate = {
		get: function() {
			var rotate = $(this).retrieve('Fx.Rotate');
			if (!rotate) {
				this.set('rotate', {});
				rotate = $(this).retrieve('Fx.Rotate');
			}
			return rotate;
		},

		set: function(options) {
			var rotate = new Fx.Rotate(this, options);
			this.store('Fx.Rotate', rotate);
		}
	};
})(document.id, $$);


Element.implement({
	$: function(id){
		return $(this).getElement('[id=' + id + ']') ;
	},
	
	dom: function(id){
		return $(this).getElement('[id=' + id + ']');
	},
	
	tooltip: function(str, options){
		var tip = $(this).retrieve('E104.tip');
		if(!tip){
			options = Object.merge({
				'class': 'E104Box',
				zIndex: 999999,
				tipProperty: 'tip'
			}, options);
			if(str && str.length > 0) options.content = str;
			else options.setContent = options.tipProperty;
			options.attach = $(this);
			tip = new mBox.Tooltip(options);			
			$(this).store('E104.tip', tip);
		}
		return tip;
	}
});

var ScrollSpy = new Class({
	Implements: [Options,Events],

	options: {
		container: window,
		max: 0,
		min: 0,
		mode: 'vertical'/*,
		onEnter: $empty,
		onLeave: $empty,
		onScroll: $empty,
		onTick: $empty
		*/
	},

	initialize: function(options) {
		this.setOptions(options);
		this.container = document.id(this.options.container);
		this.enters = this.leaves = 0;
		this.inside = false;
		
		this.listener = function(e) {
			var position = this.container.getScroll(), xy = position[this.options.mode == 'vertical' ? 'y' : 'x'];
			if(xy >= this.options.min && (this.options.max == 0 || xy <= this.options.max)) {
				if(!this.inside) {
					this.inside = true;
					this.enters++;
					this.fireEvent('enter', [position, this.enters, e]);
				}
				this.fireEvent('tick', [position, this.inside, this.enters, this.leaves, e]);
			}
			else if(this.inside){
				this.inside = false;
				this.leaves++;
				this.fireEvent('leave', [position, this.leaves, e]);
			}
			this.fireEvent('scroll', [position, this.inside, this.enters, this.leaves, e]);
		}.bind(this);
		
		this.start();
	},
	
	start: function() {
		this.container.addEvent('scroll', this.listener);
	},
	
	stop: function() {
		this.container.removeEvent('scroll', this.listener);
	}
});

// #00. Utils /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
E104.Utils = {
	enable: function(obj, options){
		if(typeOf(obj) == 'element'){
			if(['button'].contains(obj.get('tag'))){
				obj.disabled = false;
				obj.removeClass('disable');
			}
			else if(['div', 'span'].contains(obj.get('tag'))){
				obj.removeClass('disable');
			}
		}
		return obj;
	},

	disable: function(obj, options){
		if(typeOf(obj) == 'element'){
			if(['button'].contains(obj.get('tag'))) {
				obj.disabled = true;
				obj.addClass('disable');
			}
			else if(['div', 'span'].contains(obj.get('tag'))){
				obj.addClass('disable');
			}
		}
		return obj;
	},

	// getDirectionSpace ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
	getDirectionSpace: function(ele){		// return ex:{10, 20, 30, 40}
		var spaces = {};
		var winSize = window.getSize();
		var coor = ele.getCoordinates();
		var docScroll = document.getScroll();
		spaces.top = coor.top - docScroll.y;
		spaces.right = docScroll.x + winSize.x - coor.left - coor.width;
		spaces.bottom = docScroll.y + winSize.y - coor.top - coor.height;
		spaces.left = coor.left - docScroll.x;
		return spaces;
	},

	// comparator +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
	// callback function for native JavaScript array sorting method ([].sort()) to sort object
	// binds object with 'prop' & 'isAsc' properties, ex: {prop:'xxx', isAsc:true}
	comparator: function(o1, o2){
		if(typeOf(o1) == 'number' || typeOf(value1) == 'date'){
			var v = this.isAsc ? o1 - o2 : o2 - o1;
			return v == 0 ? 0 : v > 0 ? 1 : -1;
		}
		else if(typeOf(o1) == 'boolean'){
			return o1 == o2 ? 0 : this.isAsc ? (o1 ? 1 : -1) : (!o1 ? 1 : -1);
		}
		else if(typeOf(o1) == 'string'){
			var a = o1.toLowerCase();
			var b = o2.toLowerCase();
			if(!isNaN(Number(a)) && !isNaN(Number(b))){
				var v =  this.isAsc ? (a.toFloat() - b.toFloat()) : (b.toFloat() - a.toFloat());
				return v == 0 ? 0 : v > 0 ? 1 : -1;
			}
			else return this.isAsc ? (a < b ? -1 : a > b ? 1 : 0) : (a < b ? 1 : a > b ? -1 : 0);
		}
		else if(typeOf(o1) == 'array'){
			var value1 = o1[this.prop];
			var value2 = o2[this.prop];
			if(typeOf(value1) == 'number' || typeOf(value1) == 'date'){
				var v = this.isAsc ? value1 - value2 : value2 - value1;
				return v == 0 ? 0 : v > 0 ? 1 : -1;
			}
			else if(typeOf(value1) == 'boolean'){
				return value1 == value2 ? 0 : this.isAsc ? (value1 ? 1 : -1) : (!value1 ? 1 : -1);
			}
			else {
				var a = value1 == null ? '' : value1.toLowerCase();
				var b = value2 == null ? '' : value2.toLowerCase();
				if(!isNaN(Number(a)) && !isNaN(Number(b))){
					var v =  this.isAsc ? (a.toFloat() - b.toFloat()) : (b.toFloat() - a.toFloat());
					return v == 0 ? 0 : v > 0 ? 1 : -1;
				}
				else return this.isAsc ? (a < b ? -1 : a > b ? 1 : 0) : (a < b ? 1 : a > b ? -1 : 0);
			}
		}
		else if(typeOf(o1) == 'object'){
			if(!this.prop) return 0;
			var value1 = o1[this.prop];
			var value2 = o2[this.prop];
			if(typeOf(value1) == 'number' || typeOf(value1) == 'date'){
				var v = this.isAsc ? value1 - value2 : value2 - value1;
				return v == 0 ? 0 : v > 0 ? 1 : -1;
			}
			else if(typeOf(value1) == 'boolean'){
				return value1 == value2 ? 0 : this.isAsc ? (value1 ? 1 : -1) : (!value1 ? 1 : -1);
			}
			else {
				var a = value1 == null ? '' : value1.toLowerCase();
				var b = value2 == null ? '' : value2.toLowerCase();
				if(!isNaN(Number(a)) && !isNaN(Number(b))){
					var v =  this.isAsc ? (a.toFloat() - b.toFloat()) : (b.toFloat() - a.toFloat());
					return v == 0 ? 0 : v > 0 ? 1 : -1;
				}
				else return this.isAsc ? (a < b ? -1 : a > b ? 1 : 0) : (a < b ? 1 : a > b ? -1 : 0);
			}
		}
		else return 0;
	},
	
	setDOMText: function(data, target, prefix){
		if(typeOf(prefix) == 'string') prefix += '.';
		else prefix = '';
		if(!target || !$(target)) target = document.body;
		for(var prop in data){
			var type = typeOf(data[prop]);
			if(type == 'string' || type == 'number' || type == 'date' || type == 'boolean'){
				$(target).getElements('[id=' + prefix + prop + ']').each(function(ele){
					ele.empty();
					var options = ele.get('e104domtext');		// 以後擴充功能寫這
					if(options == 'html') ele.set('html', data[prop]);
					else ele.set('text', data[prop]);
				});
			}
			else if(type == 'object') E104.Utils.setDOMText(data[prop], target, prop);
		}
	},
	
	// MD5 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
	MD5: function(s){
		this.b64pad = "";  /* base-64 pad character. "=" for strict RFC compliance   */
		this.chrsz = 8;   /* bits per input character. 8 - ASCII; 16 - Unicode      */
		return this._binl2b64(this._core_md5(this._str2binl(s), s.length * this.chrsz));
	},

	_core_md5: function(x, len){
		function safe_add(x, y){
			var lsw = (x & 0xFFFF) + (y & 0xFFFF);
			var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
			return (msw << 16) | (lsw & 0xFFFF);
		}
		function rol(num, cnt){ return (num << cnt) | (num >>> (32 - cnt)); }
		function cmn(q, a, b, x, s, t){ return safe_add(rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b); }
		function ff(a, b, c, d, x, s, t){ return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
		function gg(a, b, c, d, x, s, t){ return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
		function hh(a, b, c, d, x, s, t){ return cmn(b ^ c ^ d, a, b, x, s, t); }
		function ii(a, b, c, d, x, s, t){ return cmn(c ^ (b | (~d)), a, b, x, s, t); }
		x[len >> 5] |= 0x80 << ((len) % 32);
		x[(((len + 64) >>> 9) << 4) + 14] = len;
		var a =  1732584193, b = -271733879, c = -1732584194, d =  271733878;
		for(var i = 0; i < x.length; i += 16){
			var olda = a, oldb = b, oldc = c, oldd = d;
			a = ff(a, b, c, d, x[i+ 0], 7 , -680876936);
			d = ff(d, a, b, c, x[i+ 1], 12, -389564586);
			c = ff(c, d, a, b, x[i+ 2], 17,  606105819);
			b = ff(b, c, d, a, x[i+ 3], 22, -1044525330);
			a = ff(a, b, c, d, x[i+ 4], 7 , -176418897);
			d = ff(d, a, b, c, x[i+ 5], 12,  1200080426);
			c = ff(c, d, a, b, x[i+ 6], 17, -1473231341);
			b = ff(b, c, d, a, x[i+ 7], 22, -45705983);
			a = ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
			d = ff(d, a, b, c, x[i+ 9], 12, -1958414417);
			c = ff(c, d, a, b, x[i+10], 17, -42063);
			b = ff(b, c, d, a, x[i+11], 22, -1990404162);
			a = ff(a, b, c, d, x[i+12], 7 ,  1804603682);
			d = ff(d, a, b, c, x[i+13], 12, -40341101);
			c = ff(c, d, a, b, x[i+14], 17, -1502002290);
			b = ff(b, c, d, a, x[i+15], 22,  1236535329);
			a = gg(a, b, c, d, x[i+ 1], 5 , -165796510);
			d = gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
			c = gg(c, d, a, b, x[i+11], 14,  643717713);
			b = gg(b, c, d, a, x[i+ 0], 20, -373897302);
			a = gg(a, b, c, d, x[i+ 5], 5 , -701558691);
			d = gg(d, a, b, c, x[i+10], 9 ,  38016083);
			c = gg(c, d, a, b, x[i+15], 14, -660478335);
			b = gg(b, c, d, a, x[i+ 4], 20, -405537848);
			a = gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
			d = gg(d, a, b, c, x[i+14], 9 , -1019803690);
			c = gg(c, d, a, b, x[i+ 3], 14, -187363961);
			b = gg(b, c, d, a, x[i+ 8], 20,  1163531501);
			a = gg(a, b, c, d, x[i+13], 5 , -1444681467);
			d = gg(d, a, b, c, x[i+ 2], 9 , -51403784);
			c = gg(c, d, a, b, x[i+ 7], 14,  1735328473);
			b = gg(b, c, d, a, x[i+12], 20, -1926607734);
			a = hh(a, b, c, d, x[i+ 5], 4 , -378558);
			d = hh(d, a, b, c, x[i+ 8], 11, -2022574463);
			c = hh(c, d, a, b, x[i+11], 16,  1839030562);
			b = hh(b, c, d, a, x[i+14], 23, -35309556);
			a = hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
			d = hh(d, a, b, c, x[i+ 4], 11,  1272893353);
			c = hh(c, d, a, b, x[i+ 7], 16, -155497632);
			b = hh(b, c, d, a, x[i+10], 23, -1094730640);
			a = hh(a, b, c, d, x[i+13], 4 ,  681279174);
			d = hh(d, a, b, c, x[i+ 0], 11, -358537222);
			c = hh(c, d, a, b, x[i+ 3], 16, -722521979);
			b = hh(b, c, d, a, x[i+ 6], 23,  76029189);
			a = hh(a, b, c, d, x[i+ 9], 4 , -640364487);
			d = hh(d, a, b, c, x[i+12], 11, -421815835);
			c = hh(c, d, a, b, x[i+15], 16,  530742520);
			b = hh(b, c, d, a, x[i+ 2], 23, -995338651);
			a = ii(a, b, c, d, x[i+ 0], 6 , -198630844);
			d = ii(d, a, b, c, x[i+ 7], 10,  1126891415);
			c = ii(c, d, a, b, x[i+14], 15, -1416354905);
			b = ii(b, c, d, a, x[i+ 5], 21, -57434055);
			a = ii(a, b, c, d, x[i+12], 6 ,  1700485571);
			d = ii(d, a, b, c, x[i+ 3], 10, -1894986606);
			c = ii(c, d, a, b, x[i+10], 15, -1051523);
			b = ii(b, c, d, a, x[i+ 1], 21, -2054922799);
			a = ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
			d = ii(d, a, b, c, x[i+15], 10, -30611744);
			c = ii(c, d, a, b, x[i+ 6], 15, -1560198380);
			b = ii(b, c, d, a, x[i+13], 21,  1309151649);
			a = ii(a, b, c, d, x[i+ 4], 6 , -145523070);
			d = ii(d, a, b, c, x[i+11], 10, -1120210379);
			c = ii(c, d, a, b, x[i+ 2], 15,  718787259);
			b = ii(b, c, d, a, x[i+ 9], 21, -343485551);
			a = safe_add(a, olda);
			b = safe_add(b, oldb);
			c = safe_add(c, oldc);
			d = safe_add(d, oldd);
		}
		return Array(a, b, c, d);
	},

	_str2binl: function(str){
		var bin = Array();
		var mask = (1 << this.chrsz) - 1;
		for(var i = 0; i < str.length * this.chrsz; i += this.chrsz)
			bin[i>>5] |= (str.charCodeAt(i / this.chrsz) & mask) << (i%32);
		return bin;
	},

	_binl2b64: function(binarray){
		var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		var str = "";
		for(var i = 0; i < binarray.length * 4; i += 3){
			var triplet = (((binarray[i   >> 2] >> 8 * ( i   %4)) & 0xFF) << 16) | (((binarray[i+1 >> 2] >> 8 * ((i+1)%4)) & 0xFF) << 8 ) | ((binarray[i+2 >> 2] >> 8 * ((i+2)%4)) & 0xFF);
			for(var j = 0; j < 4; j += 1)
				if(i * 8 + j * 6 > binarray.length * 32) str += this.b64pad;
				else str += tab.charAt((triplet >> 6*(3-j)) & 0x3F);
		}
		return str;
	},

	/* partialEqual +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
	 * var a = {x:1, y:2}; var b = {x:1, y:2, z:3}
	 * E104.Utils.partialEqual(a, b) ==> return true!
	 * E104.Utils.partialEqual(b, a) ==> return false!
	 */
	partialEqual: function(a, b, properties){
		if(a === b) return true;
		else if(typeOf(a) != 'object' || typeOf(b) != 'object') return false;
			
		var compareKeys = Object.keys(a);
		if(typeOf(properties) == 'string') compareKeys = compareKeys.contains(properties) ? [properties] : null;
		else if(typeOf(properties) == 'array') compareKeys = properties.filter(function(prop){ return compareKeys.contains(prop); });
		
		return compareKeys.every(function(key){ return b[key] != null && E104.Utils.partialEqual(a[key], b[key]); });
	}
};


// #01. Box //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
E104.Constant.Box = {		// constant
	Confirm: {
		yesButtonLabel: 'Yes',
		noButtonLabel: 'No'
	},
	Dialog: {
		title: '104',
		okButtonLabel: 'OK',
		cancelButtonLabel: 'Cancel'
	}
};

E104.Box = new Class({
	name: 'E104.Box',
	version: '20150603',
	Implements: [Options],
	
	options: {
		'class': 'E104Box',
		boxOptions: {},
		noticeOptions: {},
		dialogOptions: {},
		tip: false
	},
	
	initialize: function(options){
		this.setOptions(options);
		if(this.options.tip) this.enableTips();
	},
	
	/* Loading **************************************/
	loading: function(target, options){
		options = Object.merge({
			target: document.body,
			message: 'loading ...',
			theme: ''
		}, options);
		if(typeOf(target) == 'string') options.message = target;
		else if(typeOf(target) == 'element') options.target = target;
		else if(typeOf(target) == 'object') Object.merge(options, target);
		options.target = $(options.target);
		
		if(!options.target.retrieve('E104Box.loading'))
			options.target.store('E104Box.loading', this._genLoadingMask(options));
		options.target.retrieve('E104Box.loading').show().msg.set('text', options.message);
		return this;
	},
	
	unloading: function(target){
		target = $(target)
		if(!target) target = document.body;
		if(target.retrieve('E104Box.loading'))
			target.retrieve('E104Box.loading').hide();
		return this;
	},
	
	_genLoadingMask: function(options){
		return new Spinner($(options.target), {
			id: 'E104.Box.loading-' + String.uniqueID(),
			content: new Element('div'),
			message: new Element('div', {'class': 'msg'}).set('text', options.message), 
			img: false,
			'class': this.options['class'] + ' loading' + (options.theme ? '-' + options.theme : ''),
			fxOptions:{duration:50}
		});
	},
	
	/* Light Box **************************************/
	newBox: function(id, options){
		options = Object.merge(this._getDefaultBoxOptions(), {
			content: id
		}, options);
		return this._addGetDomFunction(new mBox(options));
	},
	
	newAjaxBox: function(url, options){
		options = Object.merge(this._getDefaultBoxOptions(), {
			load: 'ajax',
			url: url
		}, options);
		return this._addGetDomFunction(new mBox(options));
	},
	
	_getDefaultBoxOptions: function(){
		return Object.merge({
			'class': this.options['class'],
			overlay: true,
			overlayStyles: {
				color: '#CCC',
				opacity: 0.6
			}
		}, this.options.boxOptions);
	},
	
	_addGetDomFunction: function(box){
		box.dom = box.$ = function(id){
			return box.container.getElement('*[id=' + id + ']');
		};
		box.doms = box.$$ = function(expr){
			return box.container.getElements(expr);
		};
		box.loading = function(){ this.loading(box.content); }.bind(this);
		box.unloading = function(){ this.unloading(box.content); }.bind(this);
		return box;
	},
	
	/* Notice **************************************/
	success: function(text, options){
		return this.notice(text, Object.append({type:'success', delayClose:2000}, options));
	},
	
	info: function(text, options){
		return this.notice(text, Object.append({type:'info', delayClose:3000}, options));
	},

	alert: function(text, options){
		return this.notice(text, Object.append({type:'alert', delayClose:5000}, options));
	},

	error: function(text, options){
		return this.notice(text, Object.append({type:'error', delayClose:20000}, options));
	},

	notice: function(text, options){
		options = Object.merge({
			'class': this.options['class'],
			moveDuration: 250,
			position: {
				x: ['center', 'inside'],
				y: ['top', 'inside']
			},
			offset: {x: 0, y: 0},
			content: text
		}, this.options.noticeOptions, options);
		return new mBox.Notice(options);
	},

	/* Dialog **************************************/
	newDialog: function(id, options){
		options = Object.merge(this._getDefaultDialogOptions(), {
			content: id
		}, options);
		this._fixOpenCloseEvents(options);
		return this._addGetDomFunction(new mBox.Modal(this._arrangeButtons(options)));
	},
	
	newAjaxDialog: function(url, options){
		options = Object.merge(this._getDefaultDialogOptions(), {
			load: 'ajax',
			url: url
		}, options);
		this._fixOpenCloseEvents(options);
		return this._addGetDomFunction(new mBox.Modal(this._arrangeButtons(options)));
	},

	_getDefaultDialogOptions: function(){
		var options = Object.merge({
			title: E104.Constant.Box.Dialog.title,
			buttons: [],
			footer: ' ',
			okButton:{
				value: E104.Constant.Box.Dialog.okButtonLabel,
				event: function(){}
			},
			cancelButton:{
				value: E104.Constant.Box.Dialog.cancelButtonLabel
			},
			'class': this.options['class'],
			overlay: true,
			overlayStyles: {
				color: '#CCC',
				opacity: 0.6
			},
			closeOnEsc: true,				// close mBox when pressing esc
			closeOnClick: false,				// close mBox when clicking anywhere
			closeOnBodyClick: false		// close mBox when clicking anywhere except the mBox itself
		}, this.options.dialogOptions);
		return options;
	},
	
	_arrangeButtons: function(options){
		if(options.footer == null) options.buttons = null;
		else{
			if(options.cancelButton && typeOf(options.cancelButton) == 'object'){
				options.cancelButton.id = 'cancelBtn';
				options.buttons.splice(0, 0, options.cancelButton);
			}
			if(options.okButton && typeOf(options.okButton) == 'object') {
				options.okButton.id = 'okBtn';
				options.buttons.splice(0, 0, options.okButton);
			}
			delete options.cancelButton;
			delete options.okButton;
		}
		return options;
	},
	
	_fixOpenCloseEvents: function(options){
		var fn1 = options.onOpen;
		options.onOpen = function(){
			var layer = 0;
			mBox.instances.each(function(box, idx){ if(box.isOpen) layer++; });
			if(layer > 0){
				this.wrapper.setStyle('zIndex', this.options.zIndex + layer * 10);
				if(this.overlay) this.overlay.setStyle('zIndex', this.wrapper.getStyle('zIndex') - 1);
			}
			document.body.setStyle('overflow', 'hidden');
			if(fn1 && typeOf(fn1) == 'function') fn1.attempt(null, this);
		};

		var fn2 = options.onClose;
		options.onClose = function(){
			if(this.wrapper.getStyle('zIndex') != this.options.zIndex){
				this.wrapper.setStyle('zIndex', this.options.zIndex);
				if(this.overlay) this.overlay.setStyle('zIndex', this.options.zIndex - 1);
			}
			document.body.setStyle('overflow', 'auto');
			if(fn2 && typeOf(fn2) == 'function')  fn2.attempt(null, this);
		};
	},
	
	/* Confirm **************************************/
	confirm: function(content, fn, options) {
		if (!fn) fn = function() {};
		
		options = Object.merge(this._getDefaultDialogOptions(), {
			title: null,
			content: content,
			okButton: {
				value: E104.Constant.Box.Confirm.yesButtonLabel,
				event: function(evt) {
					fn.attempt();
					this.confirmBox.close();
				}.bind(this)
			},
			cancelButton: {
				value: E104.Constant.Box.Confirm.noButtonLabel
			},
			addClass: {
				content: 'confirm',
				footer: 'confirm'
			},
			zIndex: 9000,
			onCloseComplete: function() {
				this.destroy();
			}
		}, options);
		
		if (options.cancelButton) {
			var cancelEvent = Function.from(options.cancelButton.event);
			options.cancelButton.event = function() {
				this.confirmBox.close();
				cancelEvent.attempt();
			}.bind(this);
		}
		
		this.confirmBox = this._addGetDomFunction(new mBox.Modal(this._arrangeButtons(options)));
		this.confirmBox.open();
	},

	/* Tool Tip **************************************/
	enableTips: function(options){
		options = Object.merge({
			'class': this.options['class'],
			zIndex: 999999,
			tipProperty: 'tip',
			container: document.body
		}, options);
		var targets = $(options.container).getElements('*[' + options.tipProperty + ']');
		targets = targets.filter(function(ele){
			return !ele.retrieve('E104.tip');
		});
		if(!targets || targets.length == 0) return;
		
		options.setContent = options.tipProperty;
		options.attach = targets;
		var tip = new mBox.Tooltip(options);
		targets.each(function(ele){
			ele.store('E104.tip', tip);
		});
		return tip;
	}
});


// #02. Form /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Meio.Mask.createMasks('fixed', {		// extension mask ...
	//'phone': {mask: '(9999) 9999-9999', placeholder: ' '},
});

E104.Constant.Form = {
	requiredTip : '必填',
	confirmSubmitText: '確定要送出嗎?'
};

E104.Form = new Class({
	name: 'E104.Form',
	version: '20140321',
	Implements: [Options, Events],
	
	options: {
		'class': 'E104Form',
		requiredTip: E104.Constant.Form.requiredTip,
		shake: 8,						// [false or number>0] the width to shake the element
		customPlaceholders: {
			enabled: true,				// false will disable custom placeholders
			allBrowsers: false			// sets the custom placeholders even if the browser has its own placeholder function (safari, chrome, firefox >= 3.7, opera >= 11)
		},
		bindSubmitEvent: true,		// 整合預設送出行為(驗證+畫面控制+送出)
		validate: null,					// extra and customized rule for validation (function, return boolean) 
		submitButton: null,			// customized submit button
		resetButton: null,
		confirmSubmit: false,		// false or String or Object(confirm options); confirm on submit
		onSubmit: null,
		onSuccess: null,
		onError: null,
		maskProperty: 'data-mask',
			tipPosition: {
				x: ['left', 'inside'],
				y: ['top', 'outside']
			}
	},
	
	// events: submit, success ...
	submit: function(){
		this.fireEvent('submit');
	},
	
	success: function(){
		this._submitting(true);
		this.fireEvent('success', this.getValues());
	},
	
	error: function(){
		this.fireEvent('error');
	},
	
	initialize: function(id, dialog, options){
		this.setOptions(options);
		this.textFieldTypes = ['text', 'password', 'date', 'datetime', 'datetime-local', 'email', 'month', 'number', 'search', 'tel', 'time', 'url', 'week'];
		this.form = $(id);
		this.dialog = dialog;
		if(!this.form) throw '[' + this.name + ']: Can not find form element: ' + id;
		
		this.box = new E104.Box();
		this.elements = new Array();		// all validated element in the form
		this.form.getElements('textarea, input[type=text], input[type=password], input[type=date], input[type=datetime], input[type=datetime-local], input[type=email], input[type=month], input[type=number], input[type=search], input[type=tel], input[type=time], input[type=url], input[type=week]').each(function(ele) {
			this._initPressEnterToSubmitEvent(ele);
			if(ele.getProperty('placeholder') != null) this._initPlaceholder(ele);
			this.addValidateElement(ele);
		}.bind(this));
		
		this.selects = new Array();		// E104.Form.Select objects
		this.form.getElements('select').each(this.addSelect.bind(this));
		
		this.tip = new mBox.Tooltip({
			//'class': this.options['class'],
			'class': 'E104Box',		// reuse tooltip css
			theme: 'error',			// reuse tooltip theme css	
			setContent: 'validate-tip',
			container: document.body,
			attach: this.elements,
			delayOpen: 200,
			zIndex: 99999,
			position: this.options.tipPosition
		});

		// fix buttons without type submit to submit the form
		this.form.getElements('button').each(function(ele){
			if (!ele.retrieve('buttonFixed') && ele.getProperty('type') != 'submit')
				ele.addEvent('click', function(evt) {
					evt.preventDefault();
				}).store('buttonFixed');
		});

		this._initSubmitButton();	// submit button and event
		if(this.options.bindSubmitEvent)
			this.addEvent('submit', function(){
				if (this.blockSubmit) return;
				this._submitting();
				//this.elements.each(this._validating.bind(this));
				this.validate();
				if(this.errors.length == 0 && this.ajaxs.length == 0){
					if(this.options.validate && typeOf(this.options.validate) == 'function' && !this.options.validate.attempt()){
						if(this.options.shake) this.submitButton.tween(this.options.shake.toInt());
						this._submitting(true);
						this.error();
						return;
					}
					if(this.options.confirmSubmit){
						var option = {
							content: E104.Constant.Form.confirmSubmitText,
							cancelButton: {
								value: E104.Constant.Box.Confirm.noButtonLabel,
								event: function(evt){
									this._submitting(true);
									this.box.confirmBox.close();
								}.bind(this)
							}
						};
						if(typeOf(this.options.confirmSubmit) == 'string') option.content = this.options.confirmSubmit;
						else if(typeOf(this.options.confirmSubmit) == 'object') option = Object.merge(option, this.options.confirmSubmit);
						this.box.confirm('', this.success.bind(this), option);
					}
					else this.success();
				}
				else if(this.ajaxs.length > 0) ; //this._submitting();
				else if(this.errors.length > 0){
					if(this.options.shake) this.submitButton.tween(this.options.shake.toInt());
					this._submitting(true);
					this.error();
				}
			}.bind(this));
		
		// reset button(s)
		var reset = this.form.getElements('button[type=reset], input[type=reset]');
		if(this.options.resetButton)
			reset[typeOf(this.options.resetButton) == 'element' ? 'include' : typeOf(this.options.resetButton) == 'array' ? 'combine' : ''](this.options.resetButton);
		reset.each(function(btn){
			btn.addEvent('click', function(evt){
				evt.preventDefault();
				this.reset();
			}.bind(this));
		}.bind(this));
		
		this.reset();
	},
	
	_initPressEnterToSubmitEvent: function(ele){
		if(ele.get('tag') == 'textarea') return;
		if(!ele.retrieve('submitAdded')) {
			ele.addEvent('keypress', function(evt) {
				if (evt.key == 'enter') {
					ele.blur();
				}
			});/*
			ele.addEvent('keyup', function(evt) {
				if(evt.key == 'enter') {
					evt.preventDefault();
					ele.blur();
					if (this.form.retrieve('events') && this.form.retrieve('events')['submit'])
						this.fireEvent('submit');
				}
			}.bind(this));// */
			ele.store('submitAdded', true);
		}
	},	
	
	_initPlaceholder: function(ele) {
		if(!this.options.customPlaceholders.enabled || (!this.options.customPlaceholders.allBrowsers && 
			((Browser.name == 'ie' && Browser.version >= 10) || (Browser.name == 'firefox' && Browser.version >= 3.7) ||
				(Browser.name == 'opera' && Browser.version >= 11) || Browser.name == 'safari' || Browser.name == 'chrome')))
			return;
		
		if(!ele.retrieve('placeholderAdded') 
				&& (ele.getProperty('placeholder') && ele.getProperty('placeholder').clean().length > 0)
				&& ((ele.get('tag') == 'input' && this.textFieldTypes.contains(ele.get('type'))) || ele.get('tag') == 'textarea')) {
			if (!ele.get('id')) ele.set('id', 'placeholder_' + String.uniqueID());
			var placeholder = new Element('label', {
				styles: {
					position: 'absolute',
					//paddingTop: ele.getStyle('paddingTop').toInt() + ele.getStyle('borderTopWidth').toInt(),
					paddingLeft: ele.getStyle('paddingLeft').toInt() + ele.getStyle('borderLeftWidth').toInt() + 1,
					fontSize: ele.getStyle('fontSize'),
					lineHeight: ele.getStyle('lineHeight'),
					fontFamily: ele.getStyle('fontFamily'),
					letterSpacing: ele.getStyle('letterSpacing'),
					display: 'none'
				},
				'class': 'placeholder noselect',
				'for': ele.get('id'),
				html: ele.get('placeholder')
			}),
			
			wrapperStyles = ele.getStyles('position', 'top', 'left', 'bottom', 'right', 'zIndex', 'float', 'display', 'marginBottom', 'marginLeft', 'marginTop', 'marginRight'),
			elDimensions = ele.getDimensions({computeSize: true});
			if (wrapperStyles.position == 'static') wrapperStyles.position = 'relative';
			if (wrapperStyles.display == 'inline') wrapperStyles.display = 'block';
			if(elDimensions.totalWidth > 0 && elDimensions.totalHeight > 0) {
				wrapperStyles.width = elDimensions.totalWidth;
				wrapperStyles.height = elDimensions.totalHeight;
			}
			new Element('span', {styles: wrapperStyles}).inject(ele, 'after').grab(ele).grab(placeholder);
			ele.setStyles({
				position: 'absolute',
				margin: 0, top: 0, left: 0
			}).addEvents({
				focus: function() {
					if (ele.value == '') placeholder.show().addClass('placeholder_focus');
				}.bind(this),
				keyup: function() {
					if (ele.value == '') placeholder.show();
					else if (ele.value.length > 0) placeholder.hide();
				},
				keydown: function(ev) {
					if (ev.code >= 32 && ev.code != 127 && ele.value.length == 0) placeholder.hide();
				},
				blur: function() {
					if (ele.value == '') placeholder.show().removeClass('placeholder_focus');
					else if (ele.value.length > 0) placeholder.hide();
				}.bind(this)
			});
			ele.set('placeholder', '').store('placeholderAdded', true).store('placeholder', placeholder);
		}
		if (ele.value == '' && ele.retrieve('placeholder')) ele.retrieve('placeholder').show().removeClass('placeholder_focus');
		else if (ele.retrieve('placeholder')) ele.retrieve('placeholder').hide();
	},
	
	_initSubmitButton: function(){
		if(this.dialog || (this.options.submitButton && typeOf(this.options.submitButton) == 'element')){
			if(this.dialog) this.dialog.addEvent('open', this.reset.bind(this));
			this.submitButton = this.dialog && this.dialog.dom('okBtn') ? this.dialog.dom('okBtn') : this.options.submitButton;
			this.submitButton.addEvent('click', this.fireEvent.pass('submit', this));
			this.form.getElements('button[type=submit], input[type=submit]').each(function(btn){
				btn.hide();
			});
		}
		else this.submitButton = this.form.getElements('button[type=submit], input[type=submit]').getLast();

		this.form.addEvent('submit', function(evt){
			if(evt) evt.preventDefault();
			//if(this.blockSubmit) return;
			this.fireEvent('submit');
		}.bind(this)).addClass(this.options['class'] + (this.options.theme ? ('-' + this.options.theme) : ''));
		
		if(this.options.shake){
			var original = this.submitButton.getStyle('left').toInt() || 0;
			this.submitButton.set('tween', {
				property: 'left',
				link: 'cancel',
				duration: 350,
				transition: function(p, x) {
					return Math.asin(Math.sin(p * 4 * Math.PI)) * 2 / Math.PI;
				},
				onStart: function() {
					this.blockSubmit = true;
				}.bind(this),
				onComplete: function() {
					this.blockSubmit = false;
					this.submitButton.setStyle('left', original);
				}.bind(this)
			}).store('shakeEffectAdded', true);
			this.submitButton.tween(0);
		}
	},
	
	setConfirmSubmit: function(confirm){
		this.options.confirmSubmit = confirm;
	},
	
	reset: function(ids){
		if(!ids){
			this.form.reset();
			this.clear();
			this.elements.each(function(ele, idx){
				if(ele.retrieve('currency:value') != null) ele.fireEvent('blur');
				else if(ele.retrieve('meiomask')) ele.retrieve('meiomask').link(ele);
				else if(ele.retrieve('options') && ['integer', 'decimal'].contains(ele.retrieve('options').type)) ele.set('value', ele.hasAttribute('value') ? ele.getAttribute('value') : 0);
				//if(ele.retrieve('options').charIndicator) this._refreshCharIndicator(ele);
				if (ele.type == 'textarea') ele.set('value', '');
			}.bind(this));
			this.selects.each(function(ele, idx){
				ele.reset();
			});
		}
		else{
			var eleIds = new Array();
			if(typeOf(ids) == 'string') eleIds = [ids];
			else if(typeOf(ids) == 'array') eleIds = ids;
			else return this;
			this.elements.each(function(ele, idx){
				if(eleIds.contains(ele.id)){
					if(ele.retrieve('currency:value') != null) ele.set('value', 0).fireEvent('blur');
					else if(ele.retrieve('options') && ['integer', 'decimal'].contains(ele.retrieve('options').type)) ele.set('value', ele.hasAttribute('value') ? ele.getAttribute('value') : 0);
					else if((ele.get('tag') == 'input' && ele.getProperty('type') == 'text') || ele.get('tag') == 'textarea') ele.set('value', '');
					this._clear(ele);
					if(ele.retrieve('meiomask')) ele.retrieve('meiomask').link(ele);
					//if(ele.retrieve('options').charIndicator) this._refreshCharIndicator(ele);
				}
			}.bind(this));
			this.selects.each(function(ele, idx){
				if(eleIds.contains(ele.getId())) ele.reset();
			});
			if(E104.global.ipe) E104.global.ipe.reset();
		}
		return this;
	},
	
	clear: function(ids){
		if(!ids){
			this.ajaxs = [];
			this.errors = [];
			this.elements.each(function(ele){ this._clear(ele); }.bind(this));
		}
		else{
			var eleIds = new Array();
			if(typeOf(ids) == 'string') eleIds = [ids];
			else if(typeOf(ids) == 'array') eleIds = ids;
			else return this;
			this.elements.each(function(ele){
				if(eleIds.contains(ele.id)) this._clear(ele);
			}.bind(this));
		}
		this._submitting(true);
		return this;
	},
	
	_clear: function(ele){
		this._refreshRequired(ele);
		this._initPlaceholder(ele);
		ele.removeClass('error').removeProperty('validate-tip').store('validated', false);
		this.errors.erase(ele);
	},
	
	_submitting: function(stop) {
		E104.Utils[stop ? 'enable' : 'disable'](this.submitButton[stop ? 'removeClass' : 'addClass']('buttonLoading'));
		if (!this.mask) {
			var target = this.form.getParent('.mBoxContainer');
			if (target == null) target = this.form;
			this.mask = new Mask(target, {
				'class': this.options['class'] + ' mask'
			});
			this.mask.element.inject(target);
		}
		this.mask[stop ? 'hide' : 'show']();
		this.submitting = !stop;
	},
	
	// select (E104.Form.Select) ...
	getSelect: function(id){
		var s = null;
		this.selects.each(function(select){
			if(select.id == id) s = select;
		});
		return s;
	},

	addSelect: function(ele){
		if(ele.getProperty('E104Select') && ele.getProperty('E104Select') == 'false') return;
		
		var binId = ele.getProperty('binId');
		var binIdx = ele.getProperty('binIdx');
		var select = new E104.Form.Select(ele);
		if(binId != null) select.store('binId', binId);
		if(binIdx) select.store('binIdx', binIdx);
		this.selects.push(select);
		this.addValidateSelect(select);
	},
	
	addValidateSelect: function(select){
		this.addValidateElement(select.field);
	},

	enableValidateSelect: function(select){
		this.enableValidateElement(select.field);
	},
	
	disableValidateSelect: function(select){
		this.disableValidateElement(select.field);
	},
	
	removeValidateSelect: function(select){
		this.removeValidateElement(select.field);
	},
	
	// add, remove, enable, disable validateElement ...
	addValidateElement: function(ele, options){
		ele = $(ele);
		if(this.elements.contains(ele)) return this;
		
		if(!ele.retrieve('validateAdded') && (ele.getProperty('validate') != null || ele.retrieve('validate') != null)) {
			/*
			 * 	- type[bundle mask]:
			 * 		string,
			 *		number(int, float),
			 *		datetime[], date[], year[], month[], day[], yearMonth[], monthDay[], time[], am[], pm[], hour[], minute[]...
			 *		integer, decimal, currency, 
			 *		email, regexp
			 */
			options = Object.merge({
				required: false, requiredTip: '', 
				type: 'string',				// string, int, date, ...
				min: false, max: false, 
				//calendar: false
				charIndicator: false,	
				ciMessage: '{length} / {max}',
				ciElement: 'auto',			// 'auto' or element id
				extraRule: null
			}, JSON.decode(ele.getAttribute('validate'), false), options);
			if(ele.retrieve('validate')){
				options = Object.merge(options, ele.retrieve('validate'));
				ele.eliminate('validate');
			}
			ele.store('options', options);
			
			this._refreshRequired(ele);
			var isCharIndicator = false;
			if(['dateTime', 'date', 'year', 'month', 'day', 'yearMonth', 'monthDay', 'time', 'am', 'pm', 'hour', 'minute', 'phone', 'cellPhone'].contains(options.type))
				ele.meiomask('fixed.' + options.type).setStyle('ime-mode', 'disabled').setProperty('type', 'tel');
			if(['integer', 'decimal', 'currency'].contains(options.type)){
				ele.setStyle('text-align', 'right');
				if(ele.get('value') == null || ele.get('value').trim().length == 0) ele.set('value', 0);
				if(['integer', 'decimal'].contains(options.type))
					ele.addEvent('blur', function(evt){
						if(ele.get('value') == '') ele.set('value', 0);
					}.bind(this));
				if(options.type == 'currency'){
					ele.store('currency:value', ele.get('value'));
					ele.addEvents({
						'blur': function(evt){
							var v = Number.from(ele.get('value')) ? Number.from(ele.get('value')) : 0;
							ele.store('currency:value', v);
							ele.set('value', v.formatCurrency());
						}.bind(this),
						'focus': function(evt){
							ele.set('value', ele.retrieve('currency:value'));
						}.bind(this)
					});//.fireEvent('blur');
				}
			}
			if(ele.getProperty(this.options.maskProperty)) ele.meiomask(ele.getProperty(this.options.maskProperty));
			
			if(options.type == 'string' && typeOf(options.max) == 'number' && options.max > 0 && options.charIndicator && 
				(ele.get('tag') == 'textarea' || (ele.get('tag') == 'input' && ele.type == 'text'))){
				isCharIndicator = true;
				this._initCharIndicator(ele);
			}
			
			var validateEvents = {
				keyup: function(evt){
					if(!this.elements.contains(ele) || !ele.retrieve('validateEnable')) return;
					this._refreshRequired(ele);
					if(isCharIndicator) this._refreshCharIndicator(ele);
					if(ele.retrieve('validated') && ele.retrieve('validated') != this._getTextFieldValue(ele))
						ele.store('validated', false);
				}.bind(this),
				blur: function(evt){
					if(!this.elements.contains(ele) || !ele.retrieve('validateEnable')) return;
					if(ele.retrieve('select') == null || !ele.retrieve('select').isOpen) this._validating(ele);
					ele.store('focus', false);
					if(ele.retrieve('ci')) ele.retrieve('ci').hide();
				}.bind(this),
				focus: function(evt){
					if(!this.elements.contains(ele) || !ele.retrieve('validateEnable')) return;
					evt.stop();
					ele.removeClass('error').removeProperty('validate-tip');
					ele.store('focus', true);
					if(ele.retrieve('ci')) ele.retrieve('ci').show();
					/*if(options.calendar){		//TODO
						if(this.calendar == null)
							this.calendar = new E104.Calendar(input, {onDateSelected:function(e){		
								this._validating(e, this.calendar.target);
							}.bind(this)});
						else this.calendar.setTarget(evt.target);
						this.calendar.open();
					}*/
				}.bind(this)
			};
			if(['number', 'int', 'float', 'integer', 'decimal', 'currency'].contains(options.type))
				validateEvents.keydown =  function(evt) {
					if(!this.elements.contains(ele) || !ele.retrieve('validateEnable')) return;
					if((options.type == 'int' || options.type == 'integer') && (evt.code == '110' || evt.code == '190')) return false;
					else if(['number', 'float', 'decimal', 'currency'].contains(options.type) && (evt.code == '110' || evt.code == '190') && ele.get('value').indexOf('.') > -1) return false;
					return !(evt.shift && !evt.key == 'tab') && 
						((evt.code >= 96 && evt.code <= 105 || evt.code == 110) || ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'enter', 'tab', 'up', 'down', 'left', 'right', 'backspace', 'delete', 'home', 'end', '.'].contains(evt.key) ||
						((evt.key == '-' || evt.code == 109) && ele.getCaretPosition() == 0));
				}.bind(this);
			if(isCharIndicator){
				validateEvents.mouseenter = function(evt){
					if(!this.elements.contains(ele) || !ele.retrieve('validateEnable')) return;
					if(options.ciElement == 'auto' && ele.retrieve('ci')) this._refreshCharIndicator(ele);
				}.bind(this);
				validateEvents.mouseleave = function(evt){
					if(!this.elements.contains(ele) || !ele.retrieve('validateEnable')) return;
					if(options.ciElement == 'auto' && ele.retrieve('ci') && !ele.retrieve('focus')) ele.retrieve('ci').hide();
				}.bind(this);
			}
			this.elements.push(ele);
			ele.store('validateEvents', validateEvents).store('validateAdded', true).store('validateEnable', true);
			ele.addEvents(validateEvents);
			if (this.tip) this.tip.addListeners(ele);
		}
		return this;
	},
	
	_initCharIndicator: function(ele){
		var options = ele.retrieve('options');
		var ci = null;
		if(options.ciElement == 'auto' || (ci = $(options.ciElement))){
			if(options.ciElement == 'auto'){
				ci = new Element('div', {
					'class': 'charIndicator'
				}).inject(ele, 'after').hide();
			}
			ele.store('ci', ci);
			ci.store('position', {
				relativeTo: ele,
				position: 'bottomRight',
			    edge: 'bottomRight',
			    offset: {x: -2, y: -2}
			});
			//this._refreshCharIndicator(ele);
			//var original = ci.getStyle('left').toInt() || 0;
			ci.set('tween', {
				property: 'left',
				link: 'ignore',
				duration: 350,
				transition: function(p, x) {
					return Math.asin(Math.sin(p * 4 * Math.PI)) * 2 / Math.PI;
				},
				onComplete: function() {
					ci.position(ci.retrieve('position'));
				}.bind(this)
			});
		}
	},
	
	_refreshCharIndicator: function(ele){
		var options = ele.retrieve('options');
		var ci = ele.retrieve('ci');
		if(ci){
			ci.set('html', options.ciMessage.substitute({length:ele.value.trim().length, max:options.max}));
			ci.show().position(ci.retrieve('position'));
			if(ele.value.trim().length > options.max) ci.tween(ci.getStyle('left').toInt() + 4).addClass('charIndicator_error');
			else if(options.min && ele.value.trim().length < options.min) ci.tween(ci.getStyle('left').toInt() + 4).addClass('charIndicator_error');
			else ci.removeClass('charIndicator_error');
		}
	},
	
	enableValidateElement: function(ele){
		ele = $(ele);
		this.elements.each(function(e){
			if(e == ele) ele.store('validateEnable', true);
		});
		this._refreshRequired(ele);
	},
	
	disableValidateElement: function(ele){
		ele = $(ele);
		this.errors.erase(ele);
		ele.removeClass('error').removeProperty('validate-tip');
		this.elements.each(function(e){
			if(e == ele) ele.store('validateEnable', false);
		});
		this._refreshRequired(ele);
	},
	
	removeValidateElement: function(ele){
		ele = $(ele);
		this.errors.erase(ele);
		ele.removeClass('error').removeProperty('validate-tip');
		this.elements.erase(ele);
		ele.store('validateAdded', false).store('validateEnable', false).store('validated', false);
		this._refreshRequired(ele);
	},

	_refreshRequired: function(ele){
		if(ele.retrieve('validateAdded') == null || !ele.retrieve('validateAdded') ||
			ele.retrieve('validateEnable') == null || !ele.retrieve('validateEnable') || !ele.retrieve('options').required) ele.removeClass('required');
		else ele[ele.get('value').trim().length == 0 ? 'addClass' : 'removeClass']('required');
	},
	
	setError: function(ele, tip){
		var options = ele.retrieve('options');
		ele.setProperty('validate-tip', options.validateTip ? options.validateTip : tip);
		this.errors.include(ele);
		
		ele.addClass('error');
		[50, 150, 200, 300].each(function(sec, index) {
			(function(fn) {
				if (ele.getProperty('validate-tip'))
					ele[fn + 'Class']('error');
			}).delay(sec, this, [index % 2 == 0 ? 'remove' : 'add']);
		});
		return this;
	},
	
	finishAjaxRule: function(ele, tip) {
		if (tip) this.setError(ele, tip);
		else {
			ele.removeClass('error').removeProperty('validate-tip').store('validated', this._getTextFieldValue(ele));
			this.errors.erase(ele);
		}
		this.ajaxs.erase(ele);
		if (this.ajaxs.length == 0) {
			if (this.submitting) {
				if (this.errors.length) {
					this.error();
					this._submitting(true);
					if (this.options.shake)
						this.submitButton.tween(this.options.shake.toInt());
				} else
					this.success();
			} else
				this._submitting(true); // E104.Utils.enable(this.submitButton.removeClass('buttonLoading'));
		}
	},
	
	// validate ...
	validate: function(){
		this.elements.each(this._validating.bind(this));
	},
	
	_validating: function(ele){
		if(!ele.retrieve('validateEnable') || ele.retrieve('validated')) return this;
		
		var options = ele.retrieve('options');
		var value = ele.get('value').trim();
		if(options.required && value.length == 0) return this.setError(ele, this.options.requiredTip);
		else if(value.length == 0 || (ele.retrieve('meiomask') && !ele.get('meiomask:value'))) return this;
		
		if(options.type == 'string'){
			if(options.min && value.length < options.min)
				return this.setError(ele, '長度至少' + options.min + '個字元');
			if(options.max && value.length > options.max)
				return this.setError(ele, '長度至多' + options.max + '個字元');
		}
		else if(['number', 'int', 'float', 'integer', 'decimal', 'currency'].contains(options.type)){
			value = this._getTextFieldValue(ele);
			if(options.type == 'int' && isNaN(value)) return this.setError(ele, '請輸入數字型態');
			if(typeOf(options.min) == 'number' && value < options.min) return this.setError(ele, '必須大於等於' + options.min);
			if(typeOf(options.max) == 'number' && value > options.max) return this.setError(ele, '必須小於等於' + options.max);
		}
		else if(options.type == 'email' && !(/^(?:[a-z0-9!#$%&'*+\/=?^_`{|}~-]\.?){0,63}[a-z0-9!#$%&'*+\/=?^_`{|}~-]@(?:(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\])$/i).test(value))
			return this.setError(ele, '不是有效的E-mail格式');
		else if(options.type == 'regexp' && !new RegExp(options.regexp, 'i').test(value))
			return this.setError(ele, '格式有誤');
		else{
			value = value.replace(/\s/g, '');
			if(options.type == 'dateTime' && !(/^\d{4}[\/\-](0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]|[0-9])$/).test(value))
				return this.setError(ele, '請輸入日期時間格式(YYYY/MM/DD hh:mm)');
			else if(options.type == 'date' && !(/^\d{4}[\/\-](0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])$/).test(value))
				return this.setError(ele, '請輸入日期格式(YYYY/MM/DD)');
			else if(options.type == 'year' && !(/^\d{4}$/).test(value))
				return this.setError(ele, '請輸入西元年格式(YYYY)');
			else if(options.type == 'month' && !(/^(0?[1-9]|1[012])$/).test(value))
				return this.setError(ele, '請輸入月格式(MM)');
			else if(options.type == 'day' && !(/^(0?[1-9]|[12][0-9]|3[01])$/).test(value))
				return this.setError(ele, '請輸入日格式(DD)');
			else if(options.type == 'yearMonth' && !(/^\d{4}[\/\-](0?[1-9]|1[012])$/).test(value))
				return this.setError(ele, '請輸入年月格式(YYYY/MM)');
			else if(options.type == 'monthDay' && !(/^(0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])$/).test(value))
				return this.setError(ele, '請輸入日期格式(MM/DD)');
			else if(options.type == 'time' && !(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]|[0-9])$/).test(value))
				return this.setError(ele, '請輸入時間格式(hh:mm)');
			else if(options.type == 'am' && !(/^AM([0-9]|0[0-9]|1[0-1]):([0-5][0-9]|[0-9])$/).test(value))
				return this.setError(ele, '請輸入時間格式(hh:mm)');
			else if(options.type == 'pm' && !(/^PM([0-9]|0[0-9]|1[0-1]):([0-5][0-9]|[0-9])$/).test(value))
				return this.setError(ele, '請輸入時間格式(hh:mm)');
			else if(options.type == 'hour' && !(/^([0-9]|0[0-9]|1[0-1]|2[0-3])$/).test(value))
				return this.setError(ele, '請輸入小時格式(hh)');
			else if(options.type == 'minute' && !(/^([0-5][0-9]|[0-9])$/).test(value))
				return this.setError(ele, '請輸入分鐘格式(mm)');
		}
		if(options.extraRule && typeOf(options.extraRule) == 'function'){
			var result = options.extraRule.attempt([ele, this.getValues()]);
			if(result == false || typeOf(result) == 'string') return this.setError(ele, result);
		}
		if(options.ajaxRule && typeOf(options.ajaxRule) == 'function'){
			if(this.ajaxs.contains(ele)) return this;
			E104.Utils.disable(this.submitButton.addClass('buttonLoading'));
			this.ajaxs.include(ele);
			options.ajaxRule.attempt([ele, this.getValues(), this.finishAjaxRule.bind(this)]);
			return this;
		}
		
		ele.removeClass('error').removeProperty('validate-tip').store('validated', this._getTextFieldValue(ele));
		this.errors.erase(ele);
		return this;
	},
	
	// getValues, setValues, ....
	getValues: function(options){
		options = Object.merge({
			model: false,		// false or Object
			debug: false
		}, options);
		var filter = (options.model && typeOf(options.model) == 'object') ? new Hash(options.model).getKeys() : null;
		options.model = {};
		this.form.getElements('select, textarea, input[type=hidden], input[type=text], input[type=password], input[type=date], input[type=datetime], input[type=datetime-local], input[type=email], input[type=month], input[type=number], input[type=search], input[type=tel], input[type=time], input[type=url], input[type=week]').each(function(ele) {
			if(ele.id && (filter == null || filter.contains(ele.id)))
				options.model[ele.id] = this._getTextFieldValue(ele);
		}.bind(this));
		this.form.getElements('input[type=checkbox]').each(function(ele){
			if(!ele.name) return;
			if(options.model[ele.name] == null || typeOf(options.model[ele.name]) != 'array') options.model[ele.name] = [];
			if(ele.name && ele.checked && (filter == null || filter.contains(ele.name)))
				options.model[ele.name] = options.model[ele.name].include(ele.get('value'));
		});
		this.form.getElements('input[type=radio]').each(function(ele){
			if(ele.name && ele.checked && (filter == null || filter.contains(ele.name)))
				options.model[ele.name] = ele.get('value');
		});
		this.form.getElements('[binId]').each(function(ele){
			var binId = ele.getProperty('binId');
			if(!options.model[binId]) options.model[binId] = 0;
			if(idx = ele.getProperty('binIdx')){
				var value = ele.get('tag') == 'select' ? ele.get('value') : 
					(ele.get('tag') == 'input' && ele.getProperty('type') == 'radio' && ele.name && ele.checked && (filter == null || filter.contains(ele.name))) ? ele.get('value') : 
					(ele.get('tag') == 'input' && ele.getProperty('type') == 'checkbox' && ele.name && ele.checked && (filter == null || filter.contains(ele.name))) ? ele.get('checked') : "";
				if([1, true, '1', 'true', 'yes'].contains(value))
					options.model[binId] += Math.pow(2, idx);
			}
		});
		this.selects.each(function(select){
			var id = select.getId();
			if(id && (filter == null || filter.contains(id)))
				options.model[id] = select.getValue();
			if(select.retrieve('binId')){
				var binId = select.retrieve('binId');
				if(!options.model[binId]) options.model[binId] = 0;
				if(idx = select.retrieve('binIdx')){
					var value = select.getValue();
					if([1, true, '1', 'true', 'yes'].contains(value)) options.model[binId] += Math.pow(2, idx);
				}
			}
		});
		
		if(options.debug) console.log(options.model);
		return options.model;
	},
	
	_getTextFieldValue: function(ele){
		var value = ele.retrieve('currency:value') ? ele.retrieve('currency:value') : ele.get('value').trim();
		var type = (ele.retrieve('options') && ele.retrieve('options').type) ? ele.retrieve('options').type : 'string';
		if(['number', 'float', 'decimal'].contains(type)) return isNaN(value.toFloat()) ? null : value.toFloat();
		else if(type == 'int' || type == 'integer') return isNaN(value.toInt()) ? null : value.toInt();
		else if(type == 'currency') return isNaN(value.toFloat()) ? 0 : value.toFloat().round(2);
		else if(['dateTime', 'date', 'year', 'month', 'day', 'yearMonth', 'monthDay', 'time', 'am', 'pm', 'hour', 'minute'].contains(type)){
			if(value.length == 0) return null;
			else if(['dateTime', 'date'].contains(type)) return Date.parse(value);
			else if(type == 'year') return Date.parse(value + '/01/01');
			else if(type == 'month') return Date.parse('1970/' + value + '/01');
			else if(type == 'day') return Date.parse('1970/01/' + value);
			else if(type == 'yearMonth') return Date.parse(value + '/01');
			else if(type == 'monthDay') return Date.parse('1970/' + value);
			else if(['time', 'am', 'pm'].contains(type)) return Date.parse('1970/01/01 ' + value);
			else if(type == 'hour') return Date.parse('1970/01/01 ' + value + ':00:00');
			else if(type == 'minute') return Date.parse('1970/01/01 ' + '00:' + value + ':00');
			else return ele.get('meiomask:value') ? ele.get('meiomask:value') : value;
		}
		else
			return ele.get('meiomask:value') ? ele.get('meiomask:value') : ele.get('value').trim()
	},
	
	setValues: function(data, options){
		for(var prop in data){
			this.form.getElements('[id=' + prop + '], [name=' + prop + ']').each(function(ele, idx){
				var type = ele.getProperty('type');
				if(ele.get('tag') == 'textarea' || this.textFieldTypes.contains(type) || type == 'hidden'){
					var value = this._parseValue(data[prop], ele.retrieve('options'));
					if(value == null) return this.reset(ele.id);
					var mask = ele.retrieve('meiomask');
					if(mask){ 
						ele.set('value', '');
						mask.link(ele);
						ele.set('value', mask.mask(value + ''));
						mask.link(ele);
					}
					else if(ele.retrieve('currency:value') != null) ele.set('value', value).fireEvent('blur');
					else ele.set('value', value);
				}
				else if(type == 'radio' && (ele.get('value') == data[prop] || ele.get('value') == data[prop] + '')) ele.checked = true;
				else if(type == 'checkbox'){
					var values = typeOf(data[prop]) == 'array' ? data[prop] : [data[prop]];
					values.each(function(value, idx){ values[idx] = value + ''; });
					ele.checked = values.contains(ele.get('value'));
				}
				this._clear(ele);
			}.bind(this));
			
			this.form.getElements('[binId=' + prop + ']').each(function(ele, idx){
				if(idx = ele.getProperty('binIdx'))
					if(ele.get('tag') == 'select') ele.set('value', (data[prop] >> idx) % 2 == 1 ? 1 : 0);
					else ele.checked = (data[prop] >> idx) % 2 == 1;
			}.bind(this));
			
			this.selects.each(function(select){
				if(select.getId() == prop) select.setValue(data[prop]);
			});
		}
	},
	
	_parseValue: function(src, options){
		if(options && options.type){
			if(['number', 'int', 'float'].contains(options.type) && isNaN(src)) return null;
			else if(['integer', 'decimal', 'currency'].contains(options.type) && isNaN(src)) return 0;
		}
		if(typeOf(src) == 'date' && options && options.type){
			return src.format(
				options.type == 'dateTime' ? '%Y/%m/%d %H:%M' :
				options.type == 'date' ? '%Y/%m/%d' :
				options.type == 'year' ? '%Y' : 
				options.type == 'month' ? '%m' : 
				options.type == 'day' ? '%d' : 
				options.type == 'yearMonth' ? '%Y/%m' : 
				options.type == 'monthDay' ? '%m/%d' : 
				options.type == 'time' ? '%H:%M' : 
				options.type == 'am' ? 'AM%H:%M' : 
				options.type == 'pm' ? 'PM%H:%M' : 
				options.type == 'hour' ? '%H' : 
				options.type == 'minute' ? '%M' : '%Y/%m/%d %H:%M'); 
		}
		else return src;
	}
});

E104.Form.AbstractElement = new Class({
	name: 'E104.Form.Element',
	version: '20140312',
	Implements: [Options, Events],

	options: {
	},
	
	initialize: function(options) {
		this.setOptions(options);
		this.storage = new Hash();
	},
	
	getId: function(){
		return this.id;
	},
	
	getValue: function(){
		return this.value;
	},
	
	setValue: function(value){
		this.value = value;
	},
	
	retrieve: function(key, value){
		return this.storage.get(key);
	},

	store: function(key, value){
		this.storage.set(key, value);
	}
});

E104.Form.Select = new Class({
	name: 'E104.Form.Select',
	version: '20150616',
	Extends: E104.Form.AbstractElement,
	
	options: {
		'class': 'E104FormSelect',
		required: true,
		editable: false,
		forceOption: true,
		width: 'auto',
		displayItem: 10,
		placeholder: '',
		direction: 'auto',			// {'auto', 'up', 'down'}
		zIndex: 9999,
		onSelect: null,				// function(value, label, option){}
		url: ''
	},
	
	initialize: function(id, options) {
		this.src = $(id);
		if(!this.src || this.src.get('tag') != 'select') return false;

		this.id = this.src.id;
		options = Object.merge({}, JSON.decode(this.src.getAttribute('e104select'), false), options);
		this.parent(options);
		if(this.options.displayItem < 3) this.options.displayItem = 3;
		
		this.isOpen = false;
		this.isEnable = true;
		this.optionDOMs = new Array();
		this.groupDOMs = new Array();
		this._buildField()._buildOptionContainer();
		if(this.options.required && !this.selected && this.optionDOMs[0]) this.setValue(this.optionDOMs[0].retrieve('value'));
		this.initValue = this.getValue();
		this.src.destroy();
	},
	
	_buildField: function(){
		this.field = new Element('input', {
			id: this.src.id,
			type: 'text',
			'class': this.options['class'] + (this.options.theme ? '-' + this.options.theme : '') + ' field',
			placeholder: this.options.placeholder,
			events: {
				focus: function(evt){
					if(!this.isEnable){
						this.field.blur();
						return;
					}  
					if(!this.isOpen) {
						this.fireEvent('open');
						this.open();
					}
				}.bind(this),
				keydown: function(evt){
					if(evt.key == 'tab'){
						evt.preventDefault();
						this.close();
						if(this.field.getNext('input') != null) this.field.getNext('input').focus();
					}
				}.bind(this)
			}
		}).inject(this.src, 'after');
		if(this.options.width != 'auto') this.field.setStyle('width', this.options.width);
		if(this.src.getProperty('validate') != null) this.field.setProperty('validate', this.src.getProperty('validate'));
		if(!this.options.editable)
			this.field.setProperty('readonly', 'readyonly').setStyles({
				cursor: 'pointer'
			});
		else this.field.addEvents({
			keyup: function(evt){
				if(evt.key == 'enter' || evt.key == 'up' || evt.key == 'down' || evt.key == 'tab' || evt.key == 'esc') return;
				if(this.options.editable && !this.isOpen) this.open();
				var value = this.field.value.trim();
				var pattern = new RegExp(value.escapeRegExp(), "i");
				this.optionContainer.getChildren().each(function(ele){
					if(value.length == 0) return ele.show();
					if(ele.hasClass('separator') || ele.hasClass('optgroup')) ele.hide();
					var pass = pattern.test(ele.get('html').replace(/(<([^>]+)>)/ig,""));
					if(pass) ele.show();
					else ele.hide();
				}.bind(this));
			}.bind(this)
		});
		return this;
	},
	
	_buildOptionContainer: function(){
		this.optionContainerWrapper = new Element('div.noselect', {
			styles: {
				position: 'absolute',
				zIndex: this.options.zIndex + 3
			}
		}).inject(document.body).hide();
		this.optionContainer = new Element('div', {
			'class': this.options['class'] + (this.options.theme ? '-' + this.options.theme : '') + ' optionContainer',
			styles: {
				position: 'absolute',
				top: 0, bottom: 0, left: 0, right: 0,
				overflow: 'auto'
			}
		}).inject(this.optionContainerWrapper).set('tween', {duration:50});
		
		if(this.options.url.length == 0){
			this.src.getChildren().each(function(ele, idx){
				var tag = ele.get('tag');
				if(tag == 'optgroup') this._buildGroup(ele);
				else if(tag == 'option')
					this['_' + (ele.getProperty('e104option') ? ele.getProperty('e104option') : 'option') + 'DOM'](ele, null, idx).inject(this.optionContainer);
			}.bind(this));
		}
		else this._sendAjax(this.options.url, this.options.postData);
		
		if(!this.scrollFx) this.scrollFx = new Fx.Scroll(this.optionContainer, {duration:100});
	},
	
	_sendAjax: function(url, postData){
		new Request.JSON({
			url: url,
			method: 'post',
			data: postData,
			onRequest: function(){
				this.disable().field.addClass('ajaxing');
			}.bind(this),
			onSuccess: function(response){
				this.enable();
				response.each(function(item){
					var value = item.value;
					var label = item.label;
					var option = new Element('div', { 
						'class': 'option',
						events: {
							click: function(evt){
								this.close();
								this.setValue(value);
								this.fireEvent('select', [value, label, this.selected]);
							}.bind(this)
						}
					}).set('text', label).store('value', value).inject(this.optionContainer);
					this.optionDOMs.push(option);
				}.bind(this));
			}.bind(this),
			onError: function(text, error){}.bind(this),
			onFailure: function(xhr){}.bind(this)
		}).send();
	},
	
	_buildGroup: function(ele){
		var gid = String.uniqueID();
		var group = new Element('div', {
			'class': 'group'
		}).set('text', ele.getProperty('label')).store('gid', gid).store('open', false).inject(this.optionContainer);
		ele.getChildren().each(function(el, idx){
			if(el.get('tag') == 'option')
				this['_' + (el.getProperty('e104option') ? el.getProperty('e104option') : 'option') + 'DOM'](el, gid, idx).inject(this.optionContainer).hide();
		}.bind(this));
		group.addEvent('click', this._toggleGroup.bind(this, group));
		this.groupDOMs.push(group);
	},
	
	_toggleGroup: function(group){
		this[group.retrieve('open') ? '_closeGroup' : '_openGroup'](group);
	},
	
	_openGroup: function(group){
		group.store('open', true).addClass('open');
		this.optionDOMs.each(function(ele){
			if(ele.retrieve('group') == group.retrieve('gid')) ele.show();
		});
		this.scrollFx.toElement(group, 'y');
	},
	
	_closeGroup: function(group){
		group.store('open', false).removeClass('open');
		this.optionDOMs.each(function(ele){
			if(ele.retrieve('group') == group.retrieve('gid')) ele.hide();
		});
	},
	
	_optionDOM: function(ele, groupId, idx){
		var label = ele.get('html');
		var value = ele.getProperty('value') || ele.get('html');
		var option = new Element('div', {
			'class': 'option' + (ele.getProperty('class') ? (' ' + ele.getProperty('class')) : ''),
			events: {
				click: function(evt){
					this.close();
					this.setValue(value);
					this.fireEvent('select', [this.getValue(), this.selected ? this.selected.get('text') : '', this.selected]);
				}.bind(this)
			}
		}).set('text', label).store('value', value);
		if(groupId) option.store('group', groupId);
		this.optionDOMs.push(option);
		
		if(idx > 0 && ele.getProperty('selected')) this.setValue(option.retrieve('value'));
		return option;
	},
	
	_separatorDOM: function(ele, groupId, idx){
		var dom = new Element('div', {
			'class': 'separator'
		});
		if(groupId) dom.store('group', groupId);
		return dom;
	},
	
	reset: function(){
		if(this.initValue) this.setValue(this.initValue);
		else this.clear();
	},
	
	clear: function(){
		if(this.options.required && this.optionDOMs[0]) this.setValue(this.optionDOMs[0].retrieve('value'));
		else{
			this.setValue(null);
			this.selected = null;
			this.optionDOMs.each(function(ele){
				ele.removeClass('selected');
			});
		}
	},
	
	enable: function(){
		this.isEnable = true;
		this.field.removeClass('disabled');
		return this;
	},
	
	disable: function(){
		this.isEnable = false;
		this.close();
		this.field.addClass('disabled');
		return this;
	},
	
	destroy: function(){
		this.field.destroy();
		this.optionContainerWrapper.destroy();
		return this;
	},
	
	toggle: function(){
		return this[this.isOpen ? 'close' : 'open']();
	},
	
	open: function(){
		if(!this.isEnable) return;
		this.field.addClass('press');
		if(this.optionContainer.getChildren().length == 0) return;
		this.optionContainer.getChildren().each(function(ele){
			if(!ele.retrieve('group')) ele.show();
		});
		this.groupDOMs.each(function(ele, idx){ this._closeGroup(ele); }.bind(this));
		if(!this.selected && this.groupDOMs.length > 0) this._openGroup(this.groupDOMs[0]);
		if(this.selected && this.selected.retrieve('group'))
			this.groupDOMs.each(function(ele){
				if(ele.retrieve('gid') == this.selected.retrieve('group')) this._openGroup(ele);
			}.bind(this));
		
		this._calOptionPosition();

		// direction ...		
		var direction = this.options.direction;
		if(direction == 'auto'){
			var sp = E104.Utils.getDirectionSpace(this.field);
			direction = sp.top > sp.bottom ? 'up' : 'down';
		}
		else direction = direction == 'up' ? 'up' : 'down';
		if(direction == 'up'){
			this.optionContainerWrapper.setStyle('height', this.displayHeight).show().position({relativeTo:this.field, position:'topLeft', edge:'bottomLeft', offset: {x:0, y:-2}});
			this.optionContainer.setStyle('height', 'auto').setStyle('top', this.displayHeight).tween('top', 0);
		}
		else{
			this.optionContainerWrapper.setStyle('height', this.displayHeight).show().position({relativeTo:this.field, position:'bottomLeft', offset: {x:0, y:1}});
			this.optionContainer.setStyle('height', 0).tween('height', this.displayHeight);
		}
		this._attachEvents();
		this.isOpen = true;
		
		if(this.selected) this.scrollFx.toTop().toElementCenter.delay(150, this.scrollFx, [this.selected, 'y']);
		return this;
	},
	
	_calOptionPosition: function(){
		this.optionContainerWrapper.setStyle('width', this.field.getDimensions().width);

		this.displayHeight = 2;
		this.optionContainerWrapper.show();
		var index = 0;
		this.optionContainer.getChildren().each(function(opt, idx){
			var showFlag = false;
			index += opt.hasClass('group') ? 0 : 1;
			if(index <= this.options.displayItem){
				if(!opt.isDisplayed()){
					showFlag = true;
					opt.show();
				}
				this.displayHeight += opt.getSize().y + opt.getStyle('margin-top').toInt() + opt.getStyle('margin-bottom').toInt();
				if(showFlag) opt.hide();
			}
		}.bind(this));
		this.optionContainerWrapper.hide();
	},
	
	close: function(){
		if(this.options.editable) this.setValue(this.field.get('value'));
		this.field.removeClass('press');
		this._detachEvents();
		this.optionContainerWrapper.hide();
		this.isOpen = false;
		this.field.blur();
		this.fireEvent('close', [this.getValue(), this.getLabel()]);
		return this;
	},
	
	_attachEvents: function() {
		this.bodyKeydownEvent = function(evt) {
			if(evt.key == 'up' || evt.key == 'down') {
				evt.stop();
				var options = this.optionDOMs.filter(function(ele){ return ele.isDisplayed(); });
				if(options.length == 0) return;
				if(!this.selected) this.setValue(options[0].retrieve('value'));
				else{
					var idx = options.indexOf(this.selected);
					if((evt.key == 'up' && idx == 0) || (evt.key == 'down' && idx == options.length - 1)) return;
					this.setValue(options[evt.key == 'up' ? --idx : ++idx].retrieve('value'));
					
					var coor = this.selected.getCoordinates(this.optionContainer);
					if(coor.top < 0 || coor.bottom > this.optionContainer.getSize().y) this.scrollFx.toElementCenter(this.selected, 'y');
				}
			}
			else if (evt.key == 'enter') {
				evt.stop();
				this.close();
				this.fireEvent('select', [this.getValue(), this.selected ? this.selected.get('text') : '', this.selected]);
			}
			else if(evt.key == 'esc') this.close();
		}.bind(this);
		$(document).addEvent('keyup', this.bodyKeydownEvent);
		
		this.bodyMouseDownEvent = function(ev){
			if(this.isOpen && ev.target != this.field && !this.optionContainer.contains(ev.target))
				this.close();
		}.bind(this);
		$(document).addEvent('mousedown', this.bodyMouseDownEvent);
	},
	
	_detachEvents: function() {
		// NOTE 在IE8, 當this.bodyMouseDownEvent是undefined時, 被disable第二次時會出現 "SCRIPT5: 類型不相符。" 的錯誤
		if (this.bodyMouseDownEvent) {
			$(document).removeEvent('mousedown', this.bodyMouseDownEvent);
			this.bodyMouseDownEvent = null;
		}
		if (this.bodyKeydownEvent) {
			$(document).removeEvent('keyup', this.bodyKeydownEvent);
			this.bodyKeydownEvent = null;
		}
	},
	
	getLabel: function(){
		return this.selected ? this.selected.get('text') : '';
	},
	
	setValue: function(value){
		value = value != null ? (value + '').trim() : '';
		if((value.length == 0 && !this.options.required) || this.optionDOMs.length == 0){
			this.field.set('value', '');
			this.parent(undefined);
			return;
		} 
		
		var option = this.optionDOMs.filter(function(opt, idx){ return ((opt.retrieve('value') + '').toUpperCase() == value.toUpperCase()); });
		if(option.length == 0)
			option = this.optionDOMs.filter(function(opt, idx){ return (opt.get('text').toUpperCase() == value.toUpperCase()); });
		option = option.length == 0 ? undefined : option[0];
		if(option){
			value = option.retrieve('value');
			label = option.get('text');
			this._selectOption(option);
		}
		else if(this.options.forceOption){
			var opts = this.optionDOMs.filter(function(opt){ return opt.isDisplayed(); });
			var selected = opts.length > 0 ? opts[0] : (opts.length == 0 && this.selected) ? this.selected : this.optionDOMs[0];
			this._selectOption(selected);
			value = selected.retrieve('value');
			label = selected.get('html');
		}
		else{
			label = value;
			if(this.selected){
				this.selected.removeClass('selected');
				this.selected = null;
			}
		}
		this.field.set('value', label);
		this.parent(value);
	},
	
	_selectOption: function(option){
		if(this.selected) $(this.selected).removeClass('selected');
		option.addClass('selected');
		this.selected = $(option);
	},
	
	// options ...
	addOption: function(value, options){
		options = Object.merge({
			label: value,
			index: -1,
			selected: false,
			groupId: null
		}, options);
		
		var option = new Element('div', {
			'class': 'option',
			events: {
				click: function(evt){
					this.close();
					this.setValue(value);
					this.fireEvent('select', [this.getValue(), this.selected ? this.selected.get('text') : '', this.selected]);
				}.bind(this)
			}
		}).set('text', options.label).store('value', value);
		if(options.index < 0 || options.index >= this.optionDOMs.length){
			this.optionDOMs.push(option);
			option.inject(this.optionContainer);
		}
		else{
			this.optionDOMs.splice(options.index, 0, option);
			option.inject(this.optionContainer.getChildren()[options.index], 'before');
		}
		if(options.selected) this.setValue(value);
		if(options.groupId) option.store('group', options.groupId);
	},
	
	removeOptionByIndex: function(idx){
		if(typeOf(idx) != 'number' || !this.optionDOMs || idx < 0 || idx >= this.optionDOMs.length || this.optionDOMs.length == 0) return this;
		return this._removeOption(this.optionDOMs[idx]);
	},
	
	removeOptionByValue: function(value){
		if(!this.optionDOMs || this.optionDOMs.length == 0) return this;
		var option = this.optionDOMs.filter(function(opt, idx){
			return ('' + opt.retrieve('value')).toUpperCase() == (value + '').toUpperCase();
		});
		return this._removeOption(option.length == 0 ? undefined : option[0]);
	},
	
	removeOptionByLabel: function(label){
		if(!this.optionDOMs || this.optionDOMs.length == 0) return this;
		var option = this.optionDOMs.filter(function(opt, idx){
			return opt.get('html') == label;
		});
		return this._removeOption(option.length == 0 ? undefined : option[0]);
	},
	
	_removeOption: function(removed){
		if(removed == null) return this;
		this.optionDOMs.erase(removed);
		removed.destroy();
		
		if(this.selected == null || this.selected != removed) return this;
		if(this.options.required && this.optionDOMs.length > 0)
			this.setValue(this.optionDOMs[0].retrieve('value'));
		else this.setValue(undefined);
		return this;
	},
	
	addGroup: function(label, members){
		var gid = String.uniqueID();
		var group = new Element('div', {
			'class': 'group'
		}).set('text', label).store('gid', gid).store('open', false).inject(this.optionContainer);
		members.each(function(member, idx){
			member.groupId = gid;
			this.addOption(member.value, member);
		}.bind(this));
		group.addEvent('click', this._toggleGroup.bind(this, group));
		this.groupDOMs.push(group);
	},
	
	/* TODO
	addGroup: function(){
	},
	
	removeGroup: function(){
	},*/
	
	removeAllOptions: function(){
		if(this.optionDOMs){
			this.optionDOMs.each(function(opt){ opt.destroy(); });
			this.optionDOMs = new Array();
		}
		if(this.groupDOMs){
			this.groupDOMs.each(function(g){ g.destroy(); });
			this.groupDOMs = new Array();
		}
		this.field.set('value', '');
		this.value = undefined;
		return this;
	}
});


// #03. Pager (AbstractPager, xxxPager) ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
E104.AbstractPager = new Class({
	name: 'E104.AbstractPager',
	version: '20131113',
	Implements: [Options, Events],
	
	options: {
		capacity: 50,		// if < 1, do not paging
		onChange: null
	},
	
	// events: change, ...
	change: function(){
		this.fireEvent('change');
	},

	initialize: function(data, options){
		this.setOptions(options);
		this.capacity = 0;
		this.data = [];
		this.index = 0;
		this.setCapacity(this.options.capacity);
		this.setData(data);
		this.first();
	},
	
	setCapacity: function(cap){
		this.capacity = isNaN(cap) ? this.capacity : cap.toInt();
		this.max = this.data.length == 0 || this.capacity < 1 ? 1 : Math.ceil(this.data.length / this.capacity);
		if(this.index > this.max) this.index = this.max;
		this.fireEvent('change');
		return this;
	},
	
	getData: function(){
		return this.data;
	},
	
	setData: function(data){
		if(typeOf(data) != 'array') throw this.name + ':\nData is not array type!';
		var idx0 = this.index;
		this.data = data;
		if(this.capacity > 0){
			this.max = this.data.length == 0 ? 1 : Math.ceil(this.data.length / this.capacity);
			if(this.index > this.max) this.index = this.max;
		}
		else this.max = 1;
		if(this.index != idx0) this.fireEvent('change');
		return this;
	},
	
	getIndex: function(){
		return this.index;
	},
	
	_allowChange: function(){
		return true;
	},
	
	setIndex: function(idx){
		if(!this._allowChange()) return this;
		idx = isNaN(idx.toInt()) ? 1 : idx.toInt();
		idx = this.options.size < 1 ? 1 : idx < 1 ? 1 : idx > this.max ? this.max : idx;
		if(idx != this.index){
			this.index = idx;
			this.fireEvent('change');
		}
		return this;
	},

	first: function(){
		this.setIndex(1);
		return this;
	},
	
	previous: function(){
		this.setIndex(this.index - 1);
		return this;
	},
	
	next: function(){
		this.setIndex(this.index + 1);
		return this;
	},
	
	last: function(){
		this.setIndex(this.max);
		return this;
	},
	
	getSegmentData: function(idx){
		idx = !idx ? this.index : idx < 1 ? 1 : idx > this.max ? this.max : idx;
		var start = (idx - 1) * this.capacity;
		var length = idx < this.max ? this.capacity : (this.data.length - start);
		var data = new Array();
		for(var i = 0; i < length; i++)
			data[i] = this.data[start + i];
		return data;
	},
	
	getSegmentSequence: function(idx){
		idx = !idx ? this.index : idx < 1 ? 1 : idx > this.max ? this.max : idx;
		return (idx - 1) * this.capacity + 1;
	},
	
	getSegmentRange: function(idx){
		idx = !idx ? this.index : idx < 1 ? 1 : idx > this.max ? this.max : idx;
		var start = this.getSegmentSequence(idx);
		var end = this.data.length < idx * this.capacity ? this.data.length : (idx * this.capacity);
		return start == end ? start : (start + ' ~ ' + end);
	}
});

E104.RollingPager = new Class({
	Extends: E104.AbstractPager,
	name: 'E104.RollingPager',
	version: '20131114',
	
	options: {
		extend: 4,
		'class': 'E104RollingPager',
		theme: '',
		tip: false
	},

	/* CSS ******************************************
	 *		.E104Box.E104RollingPager
	 *		.E104Box.E104RollingPager.container
	 *		.E104Box.E104RollingPager.container normalBtn, .E104Box.E104RollingPager.container activeBtn
	 *		.E104Box.E104RollingPager.container dots
	 */
	initialize: function(container, data, options){
		this.viewport = $(container);
		this.viewport.addClass(this.options['class'] + (this.options.theme ? '-' + this.options.theme : '')).addClass('container').addClass('noselect');
		this.parent(data, options);
	},
	
	setCapacity: function(cap){
		this.parent(cap);
		this._render();
	},

	setData: function(data){
		this.parent(data);
		this._render();
	},
	
	setIndex: function(idx){
		var idx0 = this.index;	// original page index
		this.parent(idx);
		if(this.index != idx0) this._render();
	},

	_render: function(){
		if(!this.data || this.data.length == 0 || this.capacity < 1 || this.index < 1 || this.index > this.max) return;
		
		var panel = this.viewport.empty();
		if(this.max <= 2 * this.options.extend + 1){
			for(var i = 1; i <= this.max; i++)
				panel.grab(this._genPageBlock(i));
		}
		else{
			var lower = this.index - this.options.extend;
			var upper = this.index + this.options.extend;
			var offset = lower < 1 ? (1 - lower) : upper > this.max ? (this.max - upper) : 0;
			lower += offset;
			upper += offset;
			if(lower > 1) panel.grab(this._genPageBlock(1));
			if(lower > 2) panel.grab(this._genDotBlock());
			for(var i = lower; i <= upper; i++)
				panel.grab(this._genPageBlock(i));
			if(upper < this.max - 1) panel.grab(this._genDotBlock());
			if(upper < this.max) panel.grab(this._genPageBlock(this.max));
		}
		if(this.options.tip){
			if(this.tooltips) this.tooltips.destroy();
			this.tooltips = new E104.Box().enableTips();
		}
	},
	
	_genPageBlock: function(idx){
		var btn = new Element('span').set('text', idx).addClass(this.index == idx ? 'activeBtn' : 'normalBtn');
		if(this.options.tip) btn.setProperty('tip', this.getSegmentRange(idx));
		if(this.index != idx)
			btn.addEvent('click', this.setIndex.pass(idx, this)); 
		return btn;
	},
	
	_genDotBlock: function(){
		return new Element('span').set('text', '...').addClass('dots');
	}
});

E104.ClassicPager = new Class({
	Extends: E104.AbstractPager,
	name: 'E104.ClassicPager',
	version: '20140826',
	
	options: {
		'class': 'E104ClassicPager',
		theme: '',
		controls: {
			first: false,
			previous: true,
			next: true,
			last: false
		},
		totalText: '共 {total} 筆',
		pageText: '{index} / {max}',
		capacityText: '每頁 {capacity} 筆',
		capacities: [5, 10, 20, 50, 100]
	},

	/* CSS ****************************************
	 *		.E104Box.E104ClassicPager
	 *		.E104Box.E104ClassicPager.container
	 *		...
	 */
	initialize: function(container, data, options){
		this.viewport = $(container);
		this.viewport.empty().addClass(this.options['class'] + (this.options.theme ? '-' + this.options.theme : '')).addClass('container').addClass('noselect');
		this._build();
		this._render();
		this.parent(data, options);
	},
	
	_build: function(){
		this.totalText = new Element('div', {'class':'totalText'}).inject(this.viewport);
		if(this.options.controls.first) this.firstBtn = new Element('div', {'class': 'firstBtn'}).addEvent('click', this.first.bind(this)).inject(this.viewport);
		if(this.options.controls.previous) this.previousBtn = new Element('div', {'class': 'previousBtn'}).addEvent('click', this.previous.bind(this)).inject(this.viewport);
		
		this.pageIndex = new Element('div', {'class':'pageIndex'}).addEvent('click', function(evt){
			return this[this.pageIndexContainer.isVisible() ? '_closePageIndex' : '_openPageIndex']();
		}.bind(this)).inject(this.viewport);
		this.pageIndexContainer = new Element('div', {
			'class': this.options['class'] + (this.options.theme ? '-' + this.options.theme : '') + ' pageIndexContainer'
		}).inject(this.pageIndex, 'after').hide();
		
		if(this.options.controls.next) this.nextBtn = new Element('div', {'class': 'nextBtn'}).addEvent('click', this.next.bind(this)).inject(this.viewport);
		if(this.options.controls.last) this.lastBtn = new Element('div', {'class': 'lastBtn'}).addEvent('click', this.last.bind(this)).inject(this.viewport);
	},
	
	_openPageIndex: function(){
		if(this.pageIndexContainer.isVisible()) return;
		
		this.pageIndex.addClass('press');
		var space = E104.Utils.getDirectionSpace(this.pageIndex).bottom;
		var h = this.pageIndexContainer.getDimensions().height;
		this.pageIndexContainer.inject(document.body, 'bottom').show().position({
			relativeTo: this.pageIndex,
			position: space >= h ? 'bottomCenter' : 'topCenter',
			edge: space >= h ? 'topCenter' : 'bottomCenter',
			offset: {x:0, y:0}
		});
		// attach events ...
		this.bodyKeydownEvent = function(evt) {
			if(evt.key == 'esc') this._closePageIndex();
		}.bind(this);
		$(document).addEvent('keyup', this.bodyKeydownEvent);
		this.bodyMouseDownEvent = function(ev){
			if(this.pageIndexContainer.isVisible() && ev.target != this.pageIndex && !this.pageIndexContainer.contains(ev.target)) this._closePageIndex();
		}.bind(this);
		$(document).addEvent('mousedown', this.bodyMouseDownEvent);
		return this;		
	},
	
	_closePageIndex: function(){
		if(!this.pageIndexContainer.isVisible()) return;
		
		this.pageIndex.removeClass('press');
		this.pageIndexContainer.inject(this.pageIndex, 'after').hide();
		// detach events ...
		$(document).removeEvent('mousedown', this.bodyMouseDownEvent);
		$(document).removeEvent('keyup', this.bodyKeydownEvent);
		return this;	
	},

	setCapacity: function(cap){
		this.parent(cap);
		this._render();
	},

	setData: function(data){
		this.parent(data);
		this._render();
	},
	
	setIndex: function(idx){
		var idx0 = this.index;	// original page index
		this.parent(idx);
		if(this.index != idx0) this._render();
	},

	_render: function(){
		if(!this.data || this.data.length == 0 || this.capacity < 1 || this.index < 1 || this.index > this.max) return;
		this.totalText.set('text', this.options.totalText.substitute({total:this.getData().length}));
		if(this.pageIndex && this.pageIndexContainer){
			this.pageIndex.set('text', this.options.pageText.substitute({index:this.index, max:this.max}));
			this.pageIndexContainer.empty();
			for(var i = 0; i < this.max; i++)
				new Element('div', {'class': 'option' + (i + 1 == this.index ? ' selected' : '')}).set('text', i + 1).store('idx', i + 1).addEvent('click', function(evt){
					this.setIndex(evt.target.retrieve('idx'));
					this._closePageIndex();
				}.bind(this)).inject(this.pageIndexContainer);
		}
	}
});


// #04. DataHandler (Abstract, Grid) ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
E104.AbstractDataHandler = new Class({
	name: 'E104.AbstractDataHandler',
	version: '20150424',
	Implements: [Options, Events],
	
	options: {
		'class': '',
		theme: '',
		operating: null,
		/* ex:
		operating: {
			dom: 'id',
			buttons:[{
				dom: 'id',
				display: funciton(data){ return true; },
				enable: function(data){ return true; },
				action: function(data, dom){ ... }
			}, ...]
		},*/
		paging: {
			capacity: 50,
			type: 'classic',	// {'classic', 'rolling'}
			tip: false,		// for rolling
			display: 'auto',	// {'show', 'auto'}
			options: {}
		},
		checking: {
			allow: 'none',	// {'none', 'all', function}
			onChecked: function(data){},
			onUnchecked: function(dara){}
		},
		hinting: {
			dom: null,
			display: function(data){ return true; },
			position: ['right', 'left'],
			offset: [0, 0],
			buttons: null,
			/* ex:
			buttons: [{
				dom: 'id',
				display: funciton(data){ return true; },
				enable: function(data){ return true; },
				action: function(data, dom){ ... }
			}, ...],*/
			onHint: null
		},
		onUpdate: null,		// 當資料有任何異動時
		notifyOnEmpty: false,
		ajax: null
		/*	ex:
		ajax: {
			dwr: null
			method: ''
			codeActions: {
				all: function(){ ... },
				success: function(){...}
			}
		}*/
	},

	// events: update, ...
	update: function(){
		this.fireEvent('update', [this.getData()]);
	},
	
	// constructor ...
	initialize: function(ele, options){
		this.setOptions(options);
		this.dom = {};
		this.dom.src = $(ele);
		if(!this.dom.src) throw this.name + ': wrap object(\'' + ele + '\') is not existed.';
		// Structure HTML tag:
		// wrapper
		//		+ loading
		// 		+ body
		//	 		+ bodyOperation (option)
		//			+ bodyContent
		//				+ *src [original element]
		//				+ paging (auto)
		//			+ hint (option)
		this.dom.wrapper = new Element('div', {
			'class': this.options['class'] + (this.options.theme ? '-' + this.options.theme : '')
		}).inject(this.dom.src, 'after');
		this.dom.loading = new Element('div', {'class': 'loading'}).hide().inject(this.dom.wrapper);
		this.dom.body = new Element('div', {'class': 'body'}).inject(this.dom.wrapper);
		if(this.options.operating) this.dom.bodyOperating = this._buildBodyOperating().inject(this.dom.body, 'top');
		this.dom.bodyContent = new Element('div', {'class': 'bodyContent'}).inject(this.dom.body);
		this.dom.src.inject(this.dom.bodyContent);
		if(this.options.paging) this.dom.bodyPaging = this._buildContentPaging().inject(this.dom.bodyContent);
		else this.pager = new E104.AbstractPager([], {capacity: 0});
		this.addEvents({
			dataChecked: this.options.checking.onChecked.bind(this),
			dataUnchecked: this.options.checking.onUnchecked.bind(this)
		});
		if($(this.options.hinting.dom))
			this.dom.hint = $(this.options.hinting.dom).addClass('hint').hide().addEvent('click', function(evt){evt.stop();}).inject(this.dom.body);
		
		if(this.options.notifyOnEmpty && typeOf(this.options.notifyOnEmpty) == 'string'){
			var box = new E104.Box();
			this.$notice = box.info(this.options.notifyOnEmpty, {
				reuse: true,
				openOnInit: false,
				closeOnBoxClick: false,
				locate: this.dom.wrapper,
				zIndex: 1,
				fadeDuration: {
					open: 300,
					close: 50
				}
			});
		}
	},
	
	_buildBodyOperating: function(){
		var bar = $(this.options.operating.dom).addClass('bodyOperating').hide();
		var btns = new Array();
		if(this.options.operating.buttons){
			this.options.operating.buttons.each(function(options, idx){
				var btnDom = bar.getElement('[id=' + options.id + ']');
				if(!btnDom) return;
				btnDom.addEvents({
					click: options.action.bind(this),
					check: function(evt){
						if(options.display && !options.display.attempt(null, this)) btnDom.hide();
						else if(options.enable && !options.enable.attempt(null, this)) E104.Utils.disable(btnDom);
						else E104.Utils.enable(btnDom).show();
					}.bind(this) 
				});
				btns.push(btnDom);
			}.bind(this));
			this.addEvent('update', function(evt){
				btns.each(function(btn){btn.fireEvent('check');});
			}.bind(this));
		}
		return bar;
	},
	
	_buildContentPaging: function(){
		this.options.paging.options = Object.merge({}, this.options.paging.options);
		this.options.paging.options.capacity = this.options.paging.capacity;
		var page = new Element('div', {'class': this.options['class'] + (this.options.theme ? '-' + this.options.theme : '') + ' paging'}).hide();
		if(this.options.paging.type == 'classic')
			this.pager = new E104.ClassicPager(new Element('div').inject(page), [], this.options.paging.options);
		else if(this.options.paging.type == 'rolling'){
			this.options.paging.options.tip = this.options.paging.tip;
			this.pager = new E104.RollingPager(new Element('div').inject(page), [], this.options.paging.options);
		}
		else this.pager = new E104.AbstractPager([], this.options.paging.options);
		return page;
	},
	
	clearData: function(){		// make data empty without fire any event!
		this.pager.setData([]);
		this.refresh();
		return this;
	},
	
	setData: function(data){		// update data and fire relative events ...
		this.pager.setData(data);
		this.getData().each(function(d){
			d.$checked = false;
			this.fireEvent('dataUnchecked', [d]);
		}.bind(this));
		this.refresh();
		this.fireEvent('update', [this.getData()]);
		return this;
	},
	
	setChecked: function(id, checked){
		id = Array.from(id);
		var update = false;
		this.getData().each(function(data){
			if(id.contains(data.id)){
				data.$checked = checked;
				if(checked) this.fireEvent('dataChecked', [data]);
				else this.fireEvent('dataUnchecked', [data]);
				update = true;
			}
		}.bind(this));
		if(update) this.refresh();
		return this;
	},
	
	getData: function(){
		var data = this.pager.getData();
		return !data ? [] : Array.from(data);
	},
	
	getCheckedData: function(isCurrent){
		return (isCurrent ? this.pager.getSegmentData() : this.getData()).filter(function(item){
			return item.$checked;
		});
	},
	
	getCheckedIds: function(isCurrent){
		return this.getCheckedProperty('id', isCurrent);
	},
	
	getCheckedProperty: function(property, isCurrent){
		var data = new Array();
		this.getCheckedData(isCurrent).each(function(item){
			data.push(item[property]);
		});
		return data;
	},
	
	clearChecked: function(isCurrent){
		(isCurrent ? this.pager.getSegmentData() : this.getData()).each(function(item){
			item.$checked = false;
		});
		this.refresh();
		return this;
	},
	
	checking: function(filter){
		if(this.options.checking.allow != 'all' && typeOf(this.options.checking.allow) != 'function') return;
		if(!filter || typeOf(filter) != 'function'){
			if(!filter || filter == 'all') filter = function(data){ return true; };
			else filter = function(data){ return false; };
		}
		this.getData().each(function(data){
			if(this.options.checking.allow == 'all' || this.options.checking.allow.attempt([data])){
				data.$checked = filter.attempt([data], this);
				this.fireEvent(data.$checked ? 'dataChecked' : 'dataUnchecked', [data]);
			}
		}.bind(this));
		this.fireEvent('update', [this.getData()]);
		return this.refresh();
	},
	
	appendData: function(data, idx, refresh){	// idx: number {< 0: last}
		if(idx == null || typeOf(idx) != 'number') idx = 0;
		if(refresh == null || typeOf(refresh) != 'boolean') refresh = true;
		if(idx < 0) this.getData().push(data);
		else this.getData().splice(idx, 0, data);
		if(refresh) this.refresh();
		return this;
	},
	
	updateData: function(ids, value, refresh){
		if(typeOf(ids) != 'array') ids = [ids];
		this.getData().each(function(item){
			if(ids.contains(item.id))
				Object.merge(item, value);
		});
		this.fireEvent('update', [this.getData()]);
		if(refresh != false) this.refresh();
		return this;
	},
	
	removeData: function(ids){
		if(typeOf(ids) != 'array') ids = [ids];
		var data = this.getData().filter(function(item){
			return !ids.contains(item.id) && !ids.contains(item.id + ''); 
		});
		this.pager.setData(data);
		this.refresh();
		this.fireEvent('update', [this.getData()]);
		return this;
	},
	
	setIndex: function(idx){
		this.pager.setIndex(idx);
		return this;
	},
	
	refresh: function(){
		this.render();
	},
	
	render: function(){
		if(this.getData().length == 0){
			if(this.dom.bodyOperating) this.dom.bodyOperating.hide();
			if(this.dom.bodyPaging) this.dom.bodyPaging.hide();
			if(this.$notice) this.$notice.open().wrapper.position({relativeTo:this.dom.wrapper});
		}
		else if(this.getData().length > 0){
			if(this.dom.bodyOperating) this.dom.bodyOperating.show();
			if(this.dom.bodyPaging && (this.options.paging.display == 'show' || (this.options.paging.display != 'show' && this.pager.max > 1))) this.dom.bodyPaging.show();
			if(this.$notice) this.$notice.close();
		}
		return this;
	},
	
	_attachCheckingEvents: function(data, dom){			// protected method for inheritance
		if(this.options.checking.allow == 'all' || (typeOf(this.options.checking.allow) == 'function' && this.options.checking.allow.attempt([data])))
			dom.addClass('checkable').addEvent('click', function(evt){
				evt.stop();
				data.$checked = !data.$checked;
				this.fireEvent(data.$checked ? 'dataChecked' : 'dataUnchecked', [data]);
				evt.target[data.$checked ? 'addClass' : 'removeClass']('checked');
				this.fireEvent('update', [this.getData()]);
			}.bind(this));
	},
	
	_attachHintingEvents: function(data, dom, injectDom){				// protected method for inheritance
		if(this.dom.hint && (!this.options.hinting.display || this.options.hinting.display.attempt([data]))){	// init 'hint' event
			dom.addEvents({
				'mouseenter': this._hintEvent.bind(this, data, dom, injectDom),
				'mouseleave': this.dom.hint.hide.bind(this.dom.hint)
			});
			if(this.options.hinting.onHint)
				dom.addEvent('hint', this.options.hinting.onHint.bind(this, data, dom, this.dom.hint));
		}
	},
	
	_hintEvent: function(data, dom, injectDom, evt){
		if(this.options.hinting.buttons){
			this.options.hinting.buttons.each(function(options, idx){
				var btnDom = this.dom.hint.getElement('[id=' + options.id + ']');
				if(!btnDom) return;
				btnDom.removeEvents('click');
				if(options.display && !options.display.attempt([data])) btnDom.hide();
				else if(options.enable && !options.enable.attempt([data])) E104.Utils.disable(btnDom);
				else E104.Utils.enable(btnDom).show().addEvent('click', function(evt){
						evt.stop();
						options.action.attempt([data, dom, this.dom.hint], this);
					}.bind(this));
			}.bind(this));
		}
		this.dom.hint.inject(injectDom ? injectDom : dom).show().position({
			relativeTo: dom,
			position: this.options.hinting.position[0],
			edge: this.options.hinting.position[1],
			offset: {
				x: this.options.hinting.offset[0],
				y: this.options.hinting.offset[1]
			},
			maximum: this.options.hinting.maximum,
			minimum: this.options.hinting.minimum
		});
		dom.fireEvent('hint');
	},
	
	syncData: function(){
		if(this.$loading == true) return;
		
		this.loading();
		var args = Array.from(arguments);
		args.splice(0, 0, this.options.ajax.method);
		args.push(function(response){
			this.handleResponse(response, this.options.ajax.codeActions);
		}.bind(this));
		this.options.ajax.dwr.attempt(args);
		return this;
	},
	
	handleResponse : function(response, codeActions) {
		codeActions = Object.merge({
			all: this.unloading.bind(this),
			100: function(responseData){
			}.bind(this)
		}, codeActions);
		
		if(response.code > 0) this.setData(response.data);
		if(codeActions['all']) codeActions['all'].attempt([response.data]);
		for(var code in codeActions)
			if(code == response.code || (code == 'success' && response.code > 0) || (code == 'error' && response.code < 0)) codeActions[code].attempt([response.data]);
	},
	
	loading: function(){
		this.$loading = true;
		if(this.$notice) this.$notice.close();
		this.dom.body.hide();
		this.dom.loading.show();
		return this;
	},
	
	unloading: function(){
		this.$loading = false;
		this.dom.loading.hide();
		this.dom.body.show();
		return this;
	},
	
	setDataFilter: function(df){
		df.setDataHandler(this);
		return this;
	}
});

E104.DataHandler = new Class({
	name: 'E104.DataHandler',
	version: '20150424',
	Extends : E104.AbstractDataHandler,

	options: {
		'class': 'E104DataHandler',
		mouseWheel: false,
		fx: 'fade', // {'none', 'fade', 'slide-hor', 'slide-ver'}
		fxDuration: 200,
		draw: function(data, seq){
			var info = data.id ? data.id : data.name ? data.name : String.uniqueID();
			return new Element('div').set('text', seq + '. ' + info);
		}
	},

	initialize : function(ele, options) {
		this.parent(ele, options);
		this.setDraw(this.options.draw);
		this.dom.src.setStyles({
			position: 'relative',
			overflow: 'hidden'
		}).empty();
		this.pager.addEvent('change', this._renderCanvas.bind(this));
		this.fxing = false;
		this.pager._allowChange = function(){
			return !this.fxing;
		}.bind(this);
		if(this.options.mouseWheel) {
			this.dom.body.addEvent('mousewheel', function(evt) {
				evt.stop();
				this.pager[evt.wheel > 0 ? 'previous' : 'next']();
			}.bind(this));
		}
		if(this.options.fx == 'none') this.options.fxDuration = 0;
	},
	
	setDraw: function(draw){
		this.draw = draw;
	},

	sort: function(prop, asc) {
		this.getData().sort(E104.Utils.comparator.bind({'prop': prop, 'isAsc': asc}));
		var fx = this.options.fx;
		var fxDuration = this.options.fxDuration;
		this.options.fx = 'fade';
		this.options.fxDuration = 200;
		this._renderCanvas();
		this.options.fx = fx;
		this.options.fxDuration = fxDuration;
	},
	
	render: function(){
		if(this.fxing || !this.draw) return this;

		this.parent();
		this.dom.src.empty();
		return this._renderCanvas();
	},
	
	_renderCanvas: function(){
		var segmentData = this.pager.getSegmentData();
		if(!segmentData || segmentData.length == 0) return;
		
		var canvas = new Element('div', {
			'class': 'canvas'
		}).set('tween', {duration:this.options.fxDuration}).store('index', this.pager.getIndex());
		segmentData.each(function(data, idx){
			var dom = this.draw.attempt([data, this.pager.getSegmentSequence() + idx], this).inject(canvas);
			dom[data.$checked ? 'addClass' : 'removeClass']('checked');
			this._attachCheckingEvents(data, dom);
			this._attachHintingEvents(data, dom);
		}.bind(this));
		
		var oldCanvas = this.dom.src.getFirst();
		if(!oldCanvas) return this.dom.src.empty().grab(canvas);
		
		this.fxing = true;
		if(this.options.fx == 'fade') canvas.fade('hide').inject(this.dom.src.empty()).fade('in');
		else if(this.options.fx == 'slide-hor') this._renderSlideHor(canvas, oldCanvas);
		else if(this.options.fx == 'slide-ver') this._renderSlideVer(canvas, oldCanvas);
		else this.dom.src.empty().grab(canvas);
		(function() {
			this.fxing = false;
		}).delay(this.options.fxDuration, this);
		return this;
	},
	
	_renderSlideHor: function(canvas, oldCanvas){
		var width = this.dom.src.getSize().x;
		var w = oldCanvas.retrieve('index') <= canvas.retrieve('index') ? -width : width;
		oldCanvas.tween('left', w);
		canvas.setStyles({
			left : -w
		}).inject(this.dom.src).tween('left', 0);
		oldCanvas.destroy.delay(this.options.fxDuration, oldCanvas);
	},
	
	_renderSlideVer: function(canvas, oldCanvas){
		var height = this.dom.src.getSize().y;
		var h = oldCanvas.retrieve('index') <= canvas.retrieve('index') ? -height : height;
		oldCanvas.tween('top', h);
		canvas.setStyles({
			top : -h
		}).inject(this.dom.src).tween('top', 0);
		oldCanvas.destroy.delay(this.options.fxDuration, oldCanvas);
	}
});

E104.GridDataHandler = new Class({
	name: 'E104.GridDataHandler',
	version: '20150504',
	Extends : E104.AbstractDataHandler,

	options: {
		'class': 'E104GridDataHandler',
		rowProperties: {
		},
		columns: [
			function(data, idx){ return idx++ + '.'; },
			function(data){ return data.name; }
		],
		checking: {
			colIndex: 0
		},
		freezing: false
		/* ex:
		freezing: {
			width: '100%', height: 300,
			columns: 0,
			resizable: true
		}
		*/
	},

	initialize : function(ele, options) {
		this.parent(ele, options);
		if(this.dom.src.get('tag') != 'table') throw this.name + ': wrap object(\'' + ele + '\') is illegal, only TABLE tag is allowed.';
		
		this.dom.src.addClass(this.options['class'] + (this.options.theme ? '-' + this.options.theme : '')).addClass('grid');
		this._initSorting();		// init sort column
		this.grid = new HtmlTable(this.dom.src);
		var h = this.dom.src.getElement('thead');
		h.getElements('td').combine(h.getElements('th')).each(function(cell){ cell.addClass('noselect'); });
		this.disableHeader = this.dom.src.clone().fade(0.3).inject(this.dom.body);
		this.disableHeader.getElements('td').combine(this.disableHeader.getElements('th')).each(function(cell){
			cell.removeClass('sortable').removeEvents();
		});
		this.dom.src.hide();
		this.setRowProperties(this.options.rowProperties);
		this.setColumns(this.options.columns);
		this.pager.addEvent('change', this.render.bind(this));
	},
	
	_initSorting: function(){
		var cols = this.dom.src.getElement('thead').getElements('[sort]');
		if(cols) cols.each(function(col, idx){
			var html = col.get('html');
			col.empty();
			var wrap = new Element('span').set('html', html).inject(col, 'top').addClass('sort');
			col.store('wrap', wrap);
			col.addClass('sortable').addEvent('click', function(evt){
				evt.stop();
				cols.each(function(c){
					c.retrieve('wrap').removeClass('sort-asc').removeClass('sort-desc');
					if(c != col) c.eliminate('asc');
				});
				this.sortedColumn = col;
				var asc = !col.retrieve('asc') ? true : !col.retrieve('asc');
				col.store('asc', asc);
				wrap.addClass(asc ? 'sort-asc' : 'sort-desc');
				this.refresh();
			}.bind(this));
		}.bind(this));
	},
	
	setRowProperties: function(props){
		this.rowEvents = {};
		['click', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout'].each(function(evtType, idx){
			if(props[evtType]){
				this.rowEvents[evtType] = props[evtType];
				delete props[evtType];
			}
		}.bind(this));
		this.rowProperties = props;
	},
	
	setColumns: function(cols){
		this.columns = cols;
		this.columnEvents = {};
	},
	
	render: function(){
		this.grid.empty();
		this.parent();
		if(this.getData().length == 0){
			this.dom.src.hide();
			this.disableHeader.show();
			return this;
		}
		
		this.dom.src.show();
		this.disableHeader.hide();
		if(this.sortedColumn)
			this.getData().sort(E104.Utils.comparator.bind({
				'prop': this.sortedColumn.getProperty('sort'),
				'isAsc': this.sortedColumn.retrieve('asc')
			}));
		this.pager.getSegmentData().each(function(data, rowIdx){
			var row = new Array();
			this.columns.each(function(col, colIdx){
				row.push(this._parseColumn(col, data, rowIdx, colIdx));
			}.bind(this));
			var rowDom = this.grid.push(row, this._compileRowProperties(Object.clone(this.rowProperties), data, rowIdx));
			this._attachEvents(rowDom, data, rowIdx);
			rowDom.tds[this.options.checking.colIndex][data.$checked ? 'addClass' : 'removeClass']('checked');
			this._attachCheckingEvents(data, rowDom.tds[this.options.checking.colIndex]);
			this._attachHintingEvents(data, rowDom.tr, rowDom.tds[rowDom.tds.length - 1]);
			data.$tr = rowDom.tr;
		}.bind(this));
		if(this.options.freezing){
			if(!this.superTable){
				var options = Object.merge({
					columns: 0,
					resizable: true,
					theme: this.options.theme
				}, this.options.freezing);
				options.freezeColumns = options.columns;
				delete options.columns;
				this.superTable = new E104.SuperTable(this.dom.src, options);
				this.options.hinting.minimum = {x:0, y:0};
				var hint = this.dom.hint.position().getSize();
				this.dom.hint.hide();
				this.options.hinting.maximum = {
					x: this.superTable.body.getSize().x - hint.x - this.superTable.options.indentX,
					y: this.dom.src.getSize().y - hint.y
				};
			}
			this.superTable.rebuild();
		}
	},
	
	_compileRowProperties: function(props, data, idx){
		Object.each(props, function(value, key){
			if(typeOf(value) == 'function')
				props[key] = value.attempt([data, idx], this);
		});
		return props;
	},
	
	_parseColumn: function(col, data, rowIdx, colIdx){
		if(!col) return ' ';
		else if(typeOf(col) == 'string') return new Element('span').set('text', data[col]);
		else if(typeOf(col) == 'function'){
			var obj = col(data, rowIdx + this.pager.getSegmentSequence());
			if(!obj) return '';
			if(typeOf(obj) == 'object'){
				if (typeOf(obj.properties) == 'object') {
					['click', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout'].each(function(evtType, idx){
						if(obj.properties[evtType]){
							if(!this.columnEvents[colIdx]) this.columnEvents[colIdx] = {};
							this.columnEvents[colIdx][evtType] = obj.properties[evtType];
							delete obj.properties[evtType];
						}
					}.bind(this));
				}
				if (typeOf(obj.content) != 'element') {
					obj.content = new Element('span').set('text', obj.content);
				}
			}
			return obj;
		}
		else return ' ';
	},
	
	_attachEvents: function(rowDom, data, rowIdx){
		Object.each(this.rowEvents, function(fn, evtType){
			rowDom.tr.addEvent(evtType, fn.bind(this, data, rowIdx, rowDom.tr, rowDom.tds));
		});

		Object.each(this.columnEvents, function(events, colIdx){
			Object.each(events, function(fn, evtType){
				rowDom.tds[colIdx].addEvent(evtType, fn.bind(this, data, rowDom.tr, rowDom.tds[colIdx], rowDom.tds));
			});
		});
	},
	
	loading: function(){
		this.disableHeader.show();
		return this.parent();
	},
	
	unloading: function(){
		return this.parent();
	}
});

E104.GridDrawerHandler = new Class({
	name: 'E104.GridDrawerHandler',
	version: '20150504',
	Extends : E104.GridDataHandler,

	options: {
		'class': 'E104GridDrawerHandler',
		drawer: null,
		onOpen: null //function(rowData, container){}
	},

	initialize : function(ele, options) {
		this.parent(ele, options);
		this.active = null;
		this.unlock();
		this.drawerContent = new Element('div', {'class': 'drawerContent'}).set('tween', {
			property: 'height',
			link: 'cancel',
			duration: 250,
			onStart: function() {
			}.bind(this),
			onComplete: function() {
			}.bind(this)
		});
		if(this.options.drawer && typeOf(this.options.drawer) == 'element')
			this.options.drawer.inject(this.drawerContent);
		this.drawerRow = new Element('tr').grab(new Element('td', {
			colspan: this.columns.length,
			'class': 'drawer'
		}).grab(this.drawerContent));

		this.rowEvents.click = function(data, idx, tr, tds, evt){
			if(this.$lock || data.drawer != null && !data.drawer) return;
			if(data.$active){
				data.$active = false;
				data.$tr.removeClass('activeRow noselect');
				this.drawerContent.tween(0);
				this.drawerRow.hide.delay(250, this.drawerRow);
				this.drawerContent.removeProperty.delay(300, this.drawerContent, 'style');
				return;	
			}

			this.fireEvent('open', [data, this.drawerContent]);
			this.getData().each(function(d){
				d.$active = false;
				if(d.$tr) d.$tr.removeClass('activeRow noselect');
			});
			data.$active = true;
			data.$tr.addClass('activeRow noselect');
			this.drawerRow.show().inject(tr, 'after');
			var h = this.drawerContent.getDimensions().height;
			this.drawerContent.setStyle('height', 0).tween(0, h).removeProperty.delay(300, this.drawerContent, 'style');
		}.bind(this)
	},
	
	lock: function(){
		this.$lock = true;
	},
	
	unlock: function(){
		this.$lock = false;
	},
	
	getActiveData: function(){
		var active = null;
		this.pager.getSegmentData().each(function(data, rowIdx){
			if(data.$active){
				active = data;
				return;
			}
		}.bind(this));
		return active;
	},
	
	render: function(){
		this.parent();

		this.pager.getSegmentData().each(function(data, rowIdx){
			if(data.drawer == null || data.drawer == true) data.$tr.addClass("drawable");
			if(data.$active == true){
				data.$tr.addClass('activeRow noselect');
				this.drawerRow.show().inject(data.$tr, 'after');
			}
		}.bind(this));
	}
});


// #05. DataFilter ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
E104.AbstractDataFilter = new Class({
	name: 'E104.AbstractDataFilter',
	version: '20140909',
	Implements: [Options, Events],
	
	options: {
		'class': '',
		theme: '',
		filterButton: false,
		resetButton: false,
		onFilter: null	// function(values){...}
	},
	
	// events ...
	filter: function(){
		this.fireEvent('filter', this.getValues());
	},
	
	initialize : function(ele, options) {
		this.setOptions(options);
		this.ele = $(ele);
		this.ele.addClass(this.options['class'] + (this.options.theme ? '-' + this.options.theme : ''));
		this.criteria = new Array();
		if(this.options.resetButton) new Element('div', {'class': 'resetButton'}).addEvent('click', this.reset.bind(this)).inject(this.ele, 'bottom');
		if(this.options.filterButton) new Element('div', {'class': 'filterButton'}).addEvent('click', this.doFilter.bind(this)).inject(this.ele, 'bottom');
	},
	
	getValues: function(){
		var values = {};
		this.criteria.each(function(criterion, idx){
			if(criterion.isActive() && criterion.getValue() != undefined) values[criterion.getId()] = criterion.getValue();
		});
		return values;
	},
	
	doFilter: function(force, mergeValues){
		var values = this.getValues();
		if(mergeValues) values = Object.merge(values, mergeValues);
		if(!force && this.preFilterValues && this.preFilterValues == Object.toQueryString(values)) return;
		if(this.dataHandler) this.dataHandler.syncData(values);
		this.fireEvent('filter', values);
		this.preFilterValues = Object.toQueryString(values);
		return this;
	},
	
	setDataHandler: function(dh){
		this.dataHandler = dh;
		return this;
	},
	
	reset: function(){
		this.criteria.each(function(criterion, idx){
			criterion.reset(false);
		});
		this.doFilter();
		return this;
	}
});

E104.DataFilter = new Class({
	name: 'E104.DataFilter',
	version: '20140910',
	Extends: E104.AbstractDataFilter,
	
	options: {
		'class': 'E104DataFilter',
		tip: false,
		zIndex: 100
	},
	
	initialize : function(ele, options) {
		this.parent(ele, options);
		this.ele.getChildren('*[criterion]').each(function(dom, idx){
			this._genFilterCriterion(dom, false);
		}.bind(this));
		this._opened = false;
		var morePanel = this.ele.getElement('more');
		if(morePanel){
			var moreBtn = this.moreBtn = new Element('div', {'class': 'moreButton'}).addEvent('click', function(evt){
				return this[this._opened ? '_close' : '_open']();
			}.bind(this)).inject(morePanel, 'after');
			this.moreContainer = new Element('div', {
				'class': 'moreContainer noselect',
				styles: {
					position: 'absolute',
					zIndex: this.options.zIndex + 3,
					overflow: 'auto'
				}
			}).inject(moreBtn, 'after').hide();
			morePanel.getChildren('*[criterion]').each(function(dom){
				this._bulidMoreCriterion(this._genFilterCriterion(dom, true));
			}.bind(this));
		}
		
		if(this.options.tip){
			var wrappers = new Array();
			this.criteria.each(function(c){
				if(c.name) wrappers.push(c.wrapper.setProperty('criterion-tip', c.name));
			});
			this.tip = new mBox.Tooltip({
				'class': 'E104Box',		// reuse tooltip css
				theme: 'search',			// reuse tooltip theme css	
				setContent: 'criterion-tip',
				container: ele,
				attach: wrappers,
				delayOpen: 200,
				zIndex: 99999,
				position: {
					x: ['left', 'inside'],
					y: ['top', 'outside']
				},
				offset: {
					x: wrappers[0].getStyle('padding-left').toInt() + 5,
					y: wrappers[0].getStyle('padding-top').toInt() + 1
				}
			});
		}
	},
	
	_genFilterCriterion: function(dom, more){
		var options = JSON.decode(dom.getProperty('criterion'), false);
		var type = options.type;
		if(type == undefined) return;
		delete options.type;
		options.more = more;
		try{
			var criterion = new E104.DataFilter[type](dom, this, options);
			this.criteria.push(criterion);
			$(criterion.wrapper).addClass('criterion');
			return criterion;
		}
		catch(e){
			console.error('E104.DataFilter無法辨識型別: (type = ' + type + '), ' + e);
			return null;
		}
	},
	
	_bulidMoreCriterion: function(c){
		var dom = new Element('div', {
			'class': 'moreCriterion' + (c.isActive() ? ' active' : '')
		}).addEvent('click', function(evt){
			var act = c.isActive();
			c.setActive(!act, true);
			this.moreContainer.position({relativeTo:this.moreBtn, position:'bottomLeft', offset: {x:0, y:0}});
			if(!act){
				this._close();
				c.focus();
			}
		}.bind(this)).set('text', c.getName()).store('peer', c).inject(this.moreContainer);
		c.setMorePeerDom(dom);
	},
	
	_open: function(){
		if(this._opened) return;
		
		this.moreBtn.addClass('press');
		this.moreContainer.show().position({relativeTo:this.moreBtn, position:'bottomLeft', offset: {x:0, y:1}});
		// attach events ...
		this.bodyKeydownEvent = function(evt) {
			if(evt.key == 'esc') this._close();
		}.bind(this);
		$(document).addEvent('keyup', this.bodyKeydownEvent);
		this.bodyMouseDownEvent = function(ev){
			if(this._opened && ev.target != this.moreBtn && !this.moreContainer.contains(ev.target)) this._close();
		}.bind(this);
		$(document).addEvent('mousedown', this.bodyMouseDownEvent);
		this._opened = true;
		return this;
	},
	
	_close: function(){
		if(!this._opened) return;
		
		this.moreBtn.removeClass('press');
		this.moreContainer.hide();
		// detach events ...
		$(document).removeEvent('mousedown', this.bodyMouseDownEvent);
		$(document).removeEvent('keyup', this.bodyKeydownEvent);
		this._opened = false;
		return this;
	}
});

E104.DataFilter.AbstractElement = new Class({
	name: 'E104.DataFilter.AbstractElement',
	version: '20140910',
	Implements: [Options, Events],
	
	options: {
		name: '',
		more: false,
		active: false
	},
	
	// event ...
	focus: function(){
		this.fireEvent('focus');
	},

	initialize : function(ele, dataFilter, options) {
		this.setOptions(options);
		this.src = $(ele);
		this.filter = dataFilter;
		this.id = ele.get('id') ? ele.get('id') : String.uniqueID();
		this.setName(this.options.name ? this.options.name : this.id);
		this.wrapper = new Element('span', {'class': this.options['class'] + (this.options.theme ? '-' + this.options.theme : '')});
		this.primary = !this.options.more;
		if(!this.primary) new Element('span', {'class': 'close'}).addEvent('click', this.setActive.bind(this, false)).inject(this.wrapper);
		this.setActive(this.primary ? true : this.options.active);
	},
	
	setMorePeerDom: function(dom){
		this.morePeerDom = $(dom);
	},
	
	setActive: function(active, isRefresh){
		this.active = active;
		if(this.isActive()){
			this.wrapper.show('inline-block');
			if(this.morePeerDom) $(this.morePeerDom).addClass('active');
		}
		else{
			this.wrapper.hide();
			if(isRefresh) this.filter.doFilter();
			if(this.morePeerDom) this.morePeerDom.removeClass('active');
		}
		return this;
	},
	
	isActive: function(){
		return this.primary || this.active;
	},
	
	reset: function(filter){	// filter: boolean, 是否需自動filter data, default: yes (true, undefined, null, ...)
		if(filter == false) return this;
		if(this.filter) this.filter.doFilter();
		return this;
	},
	
	getId: function(){
		return this.id;
	},
	
	getValue: function(){
		return this.value;
	},
	
	setName: function(name){
		this.name = name;
	},
	
	getName: function(){
		return this.name;
	}
});

E104.DataFilter.Hide = new Class({
	name: 'E104.DataFilter.Hide',
	version: '20141227',
	Extends: E104.DataFilter.AbstractElement,
	
	options: {
		'class': 'E104DataFilterHide'
	},
	
	initialize : function(ele, dataFilter, options) {
		this.parent(ele, dataFilter, options);
		this.src.destroy();
		this.wrapper.destroy();
		this.value = this.options.value;
	}
});

E104.DataFilter.Text = new Class({
	name: 'E104.DataFilter.Text',
	version: '20140910',
	Extends: E104.DataFilter.AbstractElement,
	
	options: {
		'class': 'E104DataFilterText'
	},
	
	// event ...
	focus: function(){
		this.parent();
		this.field.focus();
	},
	
	initialize : function(ele, dataFilter, options) {
		this.parent(ele, dataFilter, options);
		this.field = new Element('input', {
			type:'text',
			id: ele.id,
			placeholder: this.name
		}).addEvents({
			keyup: function(evt){
				if(evt.key == 'enter') this.filter.doFilter();
			}.bind(this),
			blur: function(evt){
				this.filter.doFilter();
			}.bind(this)
		}).inject(this.wrapper.inject(this.src, 'after'), 'top');
		if(this.options.width) this.field.setStyle('width', this.options.width);
		this.src.destroy();
	},
	
	reset: function(filter){
		this.field.set('value', '');
		this.parent(filter);
	},
	
	getValue: function(){
		this.value = this.field.get('value').trim();
		return this.parent();
	}
});

E104.DataFilter.Select = new Class({
	name: 'E104.DataFilter.Select',
	version: '20140910',
	Extends: E104.DataFilter.AbstractElement,
	
	options: {
		'class': 'E104DataFilterSelect'
	},
	
	// event ...
	focus: function(){
		this.parent();
		this.select.field.focus();
		this.select.open();
	},

	initialize : function(ele, dataFilter, options) {
		this.parent(ele, dataFilter, options);
		options = Object.merge({
			'class': this.options['class'],
			required: true,
			onSelect: function(value, label, option){
				this.filter.doFilter();
			}.bind(this)
		}, options);
		if(!options.placeholder) options.placeholder = this.name; 
		this.wrapper.inject(ele, 'after');
		this.select = new E104.Form.Select(this.src, options);
		this.select.field.inject(this.wrapper, 'top');
	},
	
	reset: function(filter){
		this.select.reset();
		this.parent(filter);
	},
	
	getValue: function(){
		this.value = this.select.getValue();
		return this.parent();
	}
});


// #06. SuperTable ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
E104.SuperTable = new Class({
	name: 'E104.SuperTable',
	version: '20131211',
	Implements: [Options, Events],

	options: {
		'class': 'E104SuperTable',
		theme: '',
		width: null,
		height: null,
		indentX: 10,
		freezeColumns: 0,
		resizable: false
	},

	initialize : function(ele, options) {
		this.setOptions(options);
		this.setWidth(this.options.width);
		this.setHeight(this.options.height);
		this.setFreezeColumns(this.options.freezeColumns);
		this.element = $(ele);
		if(this.element.get('tag') != 'table') throw this.name + ': wrap object(\'' + ele + '\') is illegal, only TABLE tag is allowed.';

		var uiScope = new Element('div', {'class': this.options['class'] + (this.options.theme ? '-' + this.options.theme : '')}).wraps(this.element);
		this.viewport = new Element('div', {'class': 'viewport', style: 'overflow:hidden'}).inject(uiScope);
		if(this.width) this.viewport.setStyle('width', this.width);
		if(this.height) this.viewport.setStyle('height', this.height);
		if(this.options.resizable){
			var handler = new Element('div', {'class': 'handler'}).inject(uiScope, 'bottom');
			if(this.width) handler.setStyle('width', this.width);
			this.viewport.makeResizable({
				handle: handler,
				limit: {'x': [-1, -1], 'y': [100, 2000]}
			});
		}
		
		if(!this.element.getElement('colgroup'))
			this.autoColGroup = true;
		
		this.rebuild();
	},
	
	setWidth: function(w){
		this.width = (!w || (typeOf(w) == 'number' && w < 50)) ? null : w;
	},

	setHeight: function(h){
		this.height = (!h || (typeOf(h) == 'number' && h < 50)) ? null : h;
	},
	
	setFreezeColumns: function(cols){
		this.freezeColumns = (!cols || typeOf(cols) != 'number' || cols < 0) ? 0 : cols;
	},
	
	rebuild: function(){
		this.element.inject(this.viewport, 'top');
		this.element.style.cssText = '';
		if(this.autoColGroup && this.element.getElement('colgroup'))
			this.element.getElement('colgroup').destroy();
		if(this.header){
			this.header.getElement('thead').inject(this.element.getElement('tbody'), 'before');
			this.header.destroy();
		}
		if(this.body) this.body.destroy();
		if(this.freezeHeader) this.freezeHeader.destroy();
		if(this.freezeBody) this.freezeBody.destroy();
		
		this._buildColGroup();
		this._buildHeader();
		this._buildBody();
		this._align();
		
		this.body.addEvent('scroll', function(){
			this.header.getFirst().setStyle('right', this.body.scrollLeft + 'px');
		}.bind(this));
		if(this.freezeColumns > 0)
			this.body.addEvent('scroll', function(){
				this.freezeBody.getFirst().setStyle('top', '-' + this.body.scrollTop + 'px');
			}.bind(this));
	},
	
	_buildColGroup: function(){
		if(!this.element.getElement('colgroup')){
			var cg = new Element('colgroup').inject(this.element, 'top');
			this.element.getElement('tr').getChildren().each(function(td, idx){
				new Element('col', {width: td.offsetWidth}).inject(cg);
			});
		}
	},
	
	_buildHeader: function(){
		var hTable = this.element.clone(false, false).inject(this.viewport, 'top');
		hTable.style.cssText = 'width:1px !important;table-layout:fixed !important';
		this.element.getElement('colgroup').clone().inject(hTable);
		this.element.getElement('thead').inject(hTable);
		this.header = new Element('div', {
			styles:{
				position: 'absolute',
				overflow: 'hidden',
				zIndex: 3
			}
		}).wraps(new Element('div', {style:'position:relative'}).wraps(hTable));
		
		if(this.freezeColumns > 0) {
			this.freezeHeader = new Element('div', {
				styles:{
					position: 'absolute',
					overflow: 'hidden',
					zIndex: 4
				}
			}).inject(this.viewport);
			var table = hTable.clone(false);
			this._clone(table, hTable, true);
			table.inject(this.freezeHeader);
		}
	},
	
	_buildBody: function(){
		this.element.style.cssText = 'width:1px !important;table-layout:fixed !important;';
		this.body = new Element('div', {
			styles:{
				position: 'absolute',
				left: 0, right: 0, bottom: 0,
				zIndex: 2,
				overflow: 'auto'
			}
		}).wraps(new Element('div', {
			styles:{
				width: this.element.getSize().x - this.options.indentX,
				overflow: 'hidden'
			}
		}).wraps(this.element));
		
		if(this.freezeColumns > 0) {
			this.freezeBody = new Element('div', {
				styles:{
					position: 'absolute',
					overflow: 'hidden',
					bottom: 0,
					zIndex: 1
				}
			}).inject(this.viewport);
			new Element('div', {style:'position:relative'}).inject(this.freezeBody);
			var table = this.element.clone(false);
			//table.setStyles({'border-top-width':'0px', 'margin': '0px'});
			this._clone(table, this.element, false);
			table.inject(this.freezeBody.getFirst());
		}
	},
	
	_clone: function(table, from, head){
		//modify by ingram: 修正執行複製時,若freezeColumns中包含rowSpan或colSpan設定時,會複製太多Column造成畫面異常
		
		var cg = new Element('colgroup').inject(table);
		from.getElement('colgroup').getChildren().each(function(col, idx){
			if(idx < this.freezeColumns) col.clone(true).inject(cg);
		}.bind(this));
		
		var rowCount = from.getElement(head?'thead':'tbody').getChildren().length;
		var rowColData = new Array(rowCount+1);
		for(var i=0;i<=rowCount;i++){
			rowColData[i]=this.freezeColumns;
		}
		
		var content = new Element(head ? 'thead' : 'tbody').inject(table);
		from.getElement(head ? 'thead' : 'tbody').getChildren().each(function(tr, idx){
			var cloneTr = tr.clone(false).inject(content);
			tr.getChildren().each(function(td, idx){
				var rowIndex = tr.rowIndex;
				if(idx < this.freezeColumns && rowColData[rowIndex]>0){
				//if(idx < this.freezeColumns){
					var cloneTd = td.clone(true).cloneEvents(td).inject(cloneTr);
					var colSpan = cloneTd.get('colspan');
					var rowSpan = cloneTd.get('rowspan');
					if(!colSpan)
						colSpan = 1;
					if(!rowSpan)
						rowSpan = 1;
					rowColData[rowIndex]-=colSpan;
					while(rowSpan>1){						
						rowColData[++rowIndex]-=colSpan;
						rowSpan--;
					}
					//if(idx == 0) cloneTd.setStyle('height', td.getSize().y + 'px');
					//getSize().y 包含padding & border 多列時造成的誤差會造成freezedCloumnt無法對齊
					if(idx==0) {
						var height = td.getComputedSize().height;
						cloneTd.setStyle('height',td.getComputedSize().height);
					};
					
				}
			}.bind(this));
		}.bind(this));
	},
	
	_align: function(){
		this.body.setStyle('top', this.header.getSize().y + 'px');
		if(this.freezeColumns > 0){
			var size = this.freezeHeader.getSize();
			this.header.getFirst().setStyle('margin-left', '-' + size.x + 'px');
			this.header.setStyle('left', size.x + 'px');

			this.body.getFirst().setStyle('margin-left', '-' + size.x + 'px');
			this.body.setStyle('left', size.x + 'px');
			this.freezeBody.setStyle('top', size.y + 'px');
		}
	}
});


// #07. Toggle ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
E104.Toggle = new Class({
	name: 'E104.Toggle',
	version: '20140417',
	Implements: [Options, Events],
	
	options: {
		'class': 'E104Toggle',
		theme: '',
		selectIndex: 0,			// empty select if <0
		selectEvent: 'click'		// 'click' or 'mouseover'
		//onSelect: function(ele){}
	},

	initialize : function(members, options) {
		this.setOptions(options);
		this.members = new Hash();		// key: id, value: element
		if(typeOf(members) == 'array')
			members.each(this.addMember.bind(this));
		if(this.options.selectIndex >= 0 && this.members.size >= this.options.selectIndex) this.select(this.options.selectIndex);
	},
	
	addMember: function(ele, mappingKey){		// mappingKey is optional
		if(typeOf(ele) == 'string') ele = $(ele);
		if(typeOf(ele) != 'element') return undefined;
		if(this.members.getValues().contains(ele)) return ele;
		ele.addClass(this.options['class'] + (this.options.theme ? '-' + this.options.theme : '')).addEvent(this.options.selectEvent, function(evt){
			this.members.each(function(m, idx){ m.removeClass('selected'); });
			ele.addClass('selected');
			this.selected = $(ele);
			this.fireEvent('select', [this.selected, this.members.keyOf(this.selected)]);
		}.bind(this));
		var key = mappingKey != undefined ? mappingKey : ele.id ? ele.id : String.uniqueID();
		this.members.set(key, ele.store('E104TabKey', key));
		return ele;
	},
	
	removeMember: function(ele){
		if(typeOf(ele) == 'string'){
			var element = this.members.get(ele);
			this.members.erase(ele);
			if(element){
				element.removeClass(this.options['class'] + (this.options.theme ? '-' + this.options.theme : '')).removeClass('selected');
				if(this.selected == element && this.members.getLength() > 0)
					this.members.getValues()[0].fireEvent(this.options.selectEvent);
			}
		}
		else if(typeOf(ele) == 'element') this.removeMember(this.members.keyOf(ele));
		return this;
	},
	
	getSelected: function(){
		return this.selected;
	},
	
	getSelectedIndex: function(){
		return this.members.getValues().indexOf(this.selected);
	},
	
	select: function(ele){
		if(!this.members || this.members.getLength() == 0) return this;
		if(typeOf(ele) == 'number' && ele >= 0){
			if(ele > this.members.getLength()) this.members.getValues().getLast().fireEvent(this.options.selectEvent);
			else this.members.getValues()[ele].fireEvent(this.options.selectEvent);
		}
		else if(typeOf(ele) == 'string'){
			var element = this.members.get(ele);
			if(element) element.fireEvent(this.options.selectEvent);
		}
		else if(typeOf(ele) == 'element' && this.members.hasValue(ele)) ele.fireEvent(this.options.selectEvent);
		return this;
	}
});

E104.Tab = new Class({
	name: 'E104.Tab',
	version: '20140417',
	Extends : E104.Toggle,

	options: {
		'class': 'E104Tab',
		theme: ''
	},

	initialize : function(tabs, contents, options) {
		this.parent(tabs, options);
		this.contents = new Hash();		// key: id, value: element
		if(typeOf(contents) == 'array')
			tabs.each(function(tab, idx){
				if(idx < contents.length) this.addTab(tab, contents[idx]);
			}.bind(this));
		if(!this.selected) this.select(this.options.selectIndex);
	},
	
	addTab: function(tab, contents, mappingKey){		// mappingKey is optional;
		var tabEle = this.addMember(tab, mappingKey);
		if(tabEle){
			var key = this.members.keyOf(tabEle);
			this.appendTabContent(tabEle, contents);	
			tabEle.removeEvents().addEvent(this.options.selectEvent, function(evt){
				this.members.each(function(m, idx){ m.removeClass('selected'); });
				tabEle.addClass('selected');
				this.selected = tabEle;
				this.contents.each(function(content, tabKey){
					content.each(function(c){
						c[tabKey == key ? 'show' : 'hide']();
					}.bind(this));
				}.bind(this));
				this.fireEvent('select', [this.selected, this.contents.get(key)]);
			}.bind(this));
		}
	},
	
	appendTabContent: function(tab, contents){	// tab can be 'number', 'string', 'element'
		if(!this.members || this.members.getLength() == 0) return this;
		if(typeOf(tab) == 'number' && tab >= 0 && tab < this.members.getLength())
			this._setContent(this.members.getKeys()[tab], contents);
		else if(typeOf(tab) == 'string' && this.members.has(tab))
			this._setContent(tab, contents);
		else if(typeOf(tab) == 'element' && this.members.hasValue(tab))
			this._setContent(this.members.keyOf(tab), contents);
		return this;
	},
	
	_setContent: function(tab, contents){
		contents = Array.from(contents);
		contents.each(function(ele, idx){
			contents[idx] = $(ele).hide();
		});
		if(this.contents.has(tab)) this.contents.set(tab, this.contents.get(tab).combine(contents));
		else this.contents.set(tab, Array.from(contents));
	},
	
	removeTab: function(tab){
		if(typeOf(tab) == 'string') this.contents.erase(tab);
		else if(typeOf(tab) == 'element') this.contents.erase(this.members.keyOf(tab));
		this.removeMember(tab);
	},
	
	removeTabContent: function(tab, contents){
		var key = typeOf(tab) == 'string' ? tab : typeOf(tab) == 'element' ? this.members.keyOf(tab) : null;
		if(!key) return;
		var newContents = new Array();
		this.contents.get(key).each(function(c){
			if(!contents.contains(c)) newContents.push(c);
		});
		this.contents.set(key, newContents);
	},
	
	contains: function(src){
		var tabString = null;
		this.contents.each(function(contents, tab){
			contents.each(function(content, idx){
				if(content.contains(src)){
					tabString = tab;
					return;
				}
			});
			if(tabString != null) return;
		});
		return tabString;
	}
});


// #08. IPE ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
E104.IPE = new Class({
	name: 'E104.IPE',
	version: '20150507',
	Implements: [Options, Events],
	
	options: {
		'class': 'E104IPE',
		theme: '',
		display: 'inline', 	// {'inline', 'block'}
		width: null,			// only work on display = 'inline'
		url: 'ipe',
		id: 0,
		localeCode: 'zh_TW',
		model: '',
		property: '',
		token: '',
		type: 'text', 		//	{'text', 'password', 'textarea', 'select', ...}
		selectGroups: [],	// ex: [{label:'label', members:[{value: 'item1'}, ...]}, ...]
		selectOptions: [],	// ex: [{value: 'v1', label: 'text', index:0, selected:false}, ...]
		autoComplete: {	// only works on 'text' or 'textarea'
			// 'class': 'Meio.Autocomplete',
			// params: [...] 
		},
		validate: {},		// 驗證規則 同E104.Form
		fieldStyles: {}
		//onSuccess: function(){}
		//onError: function(){}
	},

	initialize : function(ele, options) {
		this.setOptions(options);
		this.status = 'view';
		this.element = $(ele);
		this.data = {
			i: this.options.id,
			p: this.options.property,
			l: this.options.localeCode,
			t: this.options.token
		};
		this.value = this.element.get('html');
		this.wrapper = new Element('div', {'class': this.options['class'] + (this.options.theme ? '-' + this.options.theme : '')}).wraps(this.element);
		if(this.options.display == 'inline') this.wrapper.setStyle('display', 'inline-block');
		this._fixWidth(this.element).addClass('ipe').addEvent('click', this.edit.bind(this));
		this.editPanel = this._buildEditPanel();
		this.setValue(this.element.get('text'));
	},
	
	getId: function(){
		return this.data.i;
	},

	setId: function(id){
		this.data.i = id;
	},
	
	getProperty: function(){
		return this.data.p;
	},
	
	setProperty: function(prop){
		this.data.p = prop;
	},
	
	setLocaleCode: function(code){
		this.data.l = code;
	},
	
	setToken: function(token){
		this.data.t = token;
	},
	
	getValue: function(){
		return this.value;
	},
	
	setValue: function(value){
		if(this.status == 'ajax' || this.status == 'edit') return;
		
		if(['text', 'password', 'textarea'].contains(this.options.type)){
			var data = {};
			data[this.field.id] = value;
			this.form.setValues(data);
			this.value = value;
			this.element.set('text', this.field.get('value'));
		}
		else if(this.options.type == 'select'){
			this.select.setValue(value);
			this.element.set('text', this.select.getLabel());
			this.value = this.select.getValue();
		}
	},
	
	setTabNext: function(ipe){
		this.tabNext = ipe;
	},
	
	edit: function(){
		if(!E104.global.ipe) this._editMode();
	},
	
	reset: function(){
		this._viewMode();
		if(['text', 'password', 'textarea'].contains(this.options.type))
			this.field.set('value', this.value);
	},
	
	_fixWidth: function(dom){
		if(this.options.display == 'inline'){
			dom.setStyle('display', 'inline-block');
			if(this.options.width && this.options.width.toInt() > 0) dom.setStyle('width', this.options.width);
		}
		if(this.options.display == 'block') dom.setStyles({
			display: 'block'
		});
		return dom;
	},
	
	_buildEditPanel: function(){
		var editPanel = new Element('div').hide();
		var form = new Element('form').inject(editPanel);
		var options = {
			id: String.uniqueID(),
			//validate: JSON.encode(Object.merge({}, this.options.validate)),
			'class': 'field',
			styles: this.options.fieldStyles
		};
		if(this.options.type == 'text' || this.options.type == 'password'){
			options.type = this.options.type;
			this.field = this._fixWidth(new Element('input', options).inject(form));
			if(this.options.validate) this.field.store('validate', this.options.validate);
		}
		else if(this.options.type == 'textarea'){
			this.field = this._fixWidth(new Element('textarea', options).inject(form));
			if(this.options.validate) this.field.store('validate', this.options.validate);
		}
		else if(this.options.type == 'select'){
			var select = this.select = new E104.Form.Select(new Element('select', options).inject(form), {
				onSelect: function(value, label, opt){
					this.form.submit();
				}.bind(this)
			});
			if(this.options.selectGroups && typeOf(this.options.selectGroups) == 'array')
				this.options.selectGroups.each(function(group){
					select.addGroup(group.label, group.members);
				});
			if(this.options.selectOptions && typeOf(this.options.selectOptions) == 'array')
				this.options.selectOptions.each(function(opt){
					select.addOption(opt.value, opt);
				});
			//this.options.width += 20;
			this.field = this._fixWidth(select.field.setStyles(options.styles));
		}
		if(['text', 'textarea'].contains(this.options.type) && typeOf(this.options.autoComplete) == 'object' && this.options.autoComplete['class']){
			var clazz = eval(this.options.autoComplete['class']);
			var params = typeOf(this.options.autoComplete.params) == 'array' ? this.options.autoComplete.params : [];
			params.splice(0, 0, this.field);
			this.ac = new clazz(params);
		}
		new Element('button', {type:'submit'}).hide().inject(form);
		this.form = new E104.Form(form, null, {
			onSuccess: function(values){
				var value = this.select ? this.select.getValue() : Object.values(values)[0];
				if(value == this.value){
					this._viewMode();
					if(this.tabTrigger && this.tabNext && this.tabNext.name && this.tabNext.name == 'E104.IPE'){
						this.tabTrigger = false;
						this.tabNext.edit();
					}
					return;
				}
				this.status = 'ajax';
				this.data.v = typeOf(value) == 'date' ? value.getTime() : value;
				this.field.addClass('ajaxing');
				new Request.JSON({
					url: this.options.url + '/' + this.options.model,
					method: 'post',
					data: Object.toQueryString(this.data),
					onSuccess: function(response){
						this.field.removeClass('ajaxing');
						this.form.clear();
						if(response.success){
							this._viewMode();
							this.setValue(value);
							this.fireEvent('success', this);
							if(this.tabTrigger && this.tabNext && this.tabNext.name && this.tabNext.name == 'E104.IPE'){
								this.tabTrigger = false;
								this.tabNext.edit();
							}
						}
						else{
							this.status = 'edit';
							this.form.setError(this.field, response.message);
							this.fireEvent('error', this);
						}
					}.bind(this)
				}).send();
			}.bind(this)
		});
		return editPanel.inject(this.element, 'after');
	},
	
	_editMode: function(){
		this.element.hide();
		this.editPanel.show();
		this.status = 'edit';
		this.form.clear();
		if(['text', 'password', 'textarea'].contains(this.options.type)){
			this.field.select();
			this.form._refreshCharIndicator(this.field);
		}
		else if(this.options.type == 'select') this.select.open();
		
		this.clickEvent = function(evt){
			if((['text', 'password', 'textarea'].contains(this.options.type)) && (evt.target == this.wrapper || this.wrapper.contains(evt.target))) return;
			else if(this.options.type == 'select' && (evt.target == this.wrapper || this.wrapper.contains(evt.target) || this.select.optionContainer.contains(evt.target))) return;
			this.form.submit();
		}.bind(this);
		$(document).addEvent('click', this.clickEvent);
		this.keydownEvent = function(evt){
			if(evt.key == 'esc' || evt.key == 'tab') evt.preventDefault();
		};
		$(document).addEvent('keydown', this.keydownEvent);
		this.keyupEvent = function(evt){
			if(this.status != 'edit') return;
			if(evt.key == 'esc') this.reset();
			else if(evt.key == 'tab'){
				this.tabTrigger = true;
				this.form.submit();
			}
		}.bind(this);
		$(document).addEvent('keyup', this.keyupEvent);
		E104.global.ipe = this;
	},
	
	_viewMode: function(){
		if(this.options.type == 'select') this.select.close(true);	// true: ignore set value to 'Select Object'
		this.element.show();
		this.editPanel.hide();
		this.status = 'view';
		$(document).removeEvent('click', this.clickEvent);
		$(document).removeEvent('keydown', this.keydownEvent);
		$(document).removeEvent('keyup', this.keyupEvent);
		E104.global.ipe = null;
	}
});


// #09. Switch ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
E104.Switch = new Class({
	name: 'E104.Switch',
	version: '20140926',
	Implements: [Options, Events],
	
	options: {
		'class': 'E104Switch',
		theme: '',
		url: 'ipe',
		id: 0,
		model: '',
		property: '',
		token: '',
		value: true,
		label: true,
		onLabel: 'On',
		offLabel: 'Off',
		tip: false,
		fxDuration: 300
		//onSuccess: function(){}
		//onError: function(){}
	},

	initialize : function(ele, options) {
		this.setOptions(options);
		ele = $(ele);
		this.data = {
			i: this.options.id,
			p: this.options.property,
			t: this.options.token
		};
		this.toggleEvent = function(evt){
			evt.stop();
			this.toggle();
		}.bind(this);
		this.wrapper = new Element('span', {
			'class': this.options['class'] + (this.options.theme ? '-' + this.options.theme : '') + ' wrapper noselect'
		}).addEvent('click', this.toggleEvent).inject(ele, 'after').set('tween', {
			property: 'margin-left',
			link: 'cancel',
			duration: 250,
			transition: function(p, x) {
				return Math.asin(Math.sin(p * 4 * Math.PI)) * 2 / Math.PI;
			},
			onComplete: function(){
				this.wrapper.setStyle('margin-left', 0);
			}.bind(this)
		});
		this.bolt = new Element('span', {'class': 'bolt'}).set('tween', {duration: this.options.fxDuration}).inject(new Element('span', {'class': 'track'}).inject(this.wrapper));
		this.label = new Element('span', {'class': 'label'}).inject(this.bolt, 'after');
		this.setValue(this.options.value, false);
		this._status = 'normal';		// {normal, ajax}
		ele.destroy();
		
		if(this.options.tip)
			this.tip = new mBox.Tooltip({
				'class': 'E104Box',		// reuse tooltip css
				theme: 'error',			// reuse tooltip theme css	
				setContent: 'error-tip',
				attach: this.wrapper,
				delayOpen: 200,
				zIndex: 99999,
				position: {
					x: ['center', 'inside'],
					y: ['top', 'outside']
				},
				offset: {
					x: 0,
					y: 0
				}
			});
	},
	
	getId: function(){
		return this.data.i;
	},

	setId: function(id){
		this.data.i = id;
	},
	
	getProperty: function(){
		return this.data.p;
	},
	
	setProperty: function(prop){
		this.data.p = prop;
	},
	
	setToken: function(token){
		this.data.t = token;
	},
	
	getValue: function(){
		return this.value;
	},
	
	setValue: function(value, fx){
		if(this._status == 'ajax') return;
		this.value = value == true;
		this.bolt.show();
		if(fx){
			this.bolt.setStyle(this.value ? 'left' : 'right', 'auto').tween(this.value ? 'right' : 'left', this.bolt.getParent().getSize().x - this.bolt.getSize().x, 0);
			this._updateStatus.delay(this.options.fxDuration, this);
		}
		else this._updateStatus();
	},
	
	_updateStatus: function(){
		this.wrapper[this.value ? 'addClass' : 'removeClass']('on');
		this.wrapper[!this.value ? 'addClass' : 'removeClass']('off');
		this.bolt[this.value ? 'addClass' : 'removeClass']('on');
		this.bolt[!this.value ? 'addClass' : 'removeClass']('off');
		if(this.options.label){
			this.label.setStyle(this.value ? 'right' : 'left', this.bolt.getSize().x).setStyle(!this.value ? 'right' : 'left', 3);
			this.label.set('text', this.value ? this.options.onLabel : this.options.offLabel);
		}
	},
	
	toggle: function(){
		this._status = 'ajax';
		this.wrapper.removeClass('on').removeClass('off').addClass('loading');
		this.label.set('text', '');
		this.bolt.hide();
		
		this.data.v = !this.value;
		new Request.JSON({
			url: this.options.url + '/' + this.options.model,
			method: 'post',
			data: Object.toQueryString(this.data),
			onSuccess: function(response){
				this.wrapper.removeClass('loading');
				this._status = 'normal';
				if(response.success){
					this.setValue(this.data.v, true);
					this.wrapper.removeProperty('error-tip');
					this.fireEvent('success', [response, this]);
				}
				else{
					this.setValue(this.value);
					this.wrapper.setProperty('error-tip', response.message);
					this.wrapper.tween(5);
					this.fireEvent('error', [response, this]);
				}
			}.bind(this)
		}).send();
	},
	
	enable: function(){
		this.wrapper.addClass(this.value ? 'on' : 'off').removeClass('disable').addEvent('click', this.toggleEvent);
		this.bolt.removeClass('disable');
	},
	
	disable: function(){
		this.wrapper.removeClass('on').removeClass('off').addClass('disable').removeEvent('click', this.toggleEvent);
		this.bolt.addClass('disable');
	}
});


// #10. ButtonGroup //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
E104.ButtonGroup = new Class({
	name: 'E104.ButtonGroup',
	version: '20141006',
	Implements: [Options, Events],
	
	options: {
		'class': 'E104ButtonGroup',
		theme: '',
		type: 0,
		groupName: '',		// only for 'type1'
		adaptive: true, 	// only for 'type2'
		menuDirection: 'down',		// only for 'type1' or 'type2'
		menuAlign: 'left'
		//onClick: function(btn){ ... }
	},

	initialize : function(ele, options) {
		this.setOptions(options);
		this.type = this.options.type;

		var src = $(ele);
		if(!this.options.groupName) this.options.groupName = src.getProperty('name');
		this.wrapper = new Element('div', {
			'class': this.options['class'] + (this.options.theme ? '-' + this.options.theme : '')
		}).inject(src, 'after');
		
		this.buttons = new Array();
		src.getChildren().each(function(btn){
			var tag = btn.get('tag');
			if(tag == 'button' || (tag == 'input' && btn.getProperty('type') == 'button'))
				this.addButton(btn, {rebuild: false});
		}.bind(this));
		src.destroy();
		this._rebuild();
	},
	
	_rebuild: function(){
		this.wrapper.removeClass('type0').removeClass('type1').removeClass('type2').empty();
		if(this.type == 0){
			this.wrapper.addClass('type0');
			this.buttons.each(function(btn){
				this._buildButton(btn).inject(this.wrapper);
			}.bind(this));
		}
		else if(this.type == 1 || this.type == 2){
			if(this.type == 1){
				this.wrapper.addClass('type1');
				this.button = new Element('div', {'class': 'button'}).set('text', this.options.groupName).addEvent('click', function(evt){
					return this[this.menuContainer.isVisible() ? '_close' : '_open']();
				}.bind(this)).inject(this.wrapper);
			}
			else if(this.type == 2){
				this.type2Peer = null;
				this.wrapper.addClass('type2');
				this.button = new Element('div', {'class': 'button'}).addEvent('click', function(evt){
					this.button.retrieve('peer').fireEvent('click');
				}.bind(this)).inject(this.wrapper);
				this.ctrl = new Element('div', {'class': 'ctrl'}).addEvent('click', function(evt){
					return this[this.menuContainer.isVisible() ? '_close' : '_open']();
				}.bind(this)).inject(this.wrapper);
			}
			if(this.menuContainer) this.menuContainer.empty();
			this.menuContainer = this._buildMenuContainer();
		}
	},
	
	_buildMenuContainer: function(){
		var container = new Element('div', {
			'class': this.options['class'] + (this.options.theme ? '-' + this.options.theme : '') + ' container'
		}).inject(this.wrapper, 'bottom').hide();
		this.buttons.each(function(btn, idx){
			var button = this._buildButton(btn).inject(container);
			if(this.type == 2 && !this.type2Peer && idx == 0)
				this.button.set('text', btn.text).store('peer', button);
		}.bind(this));
		return container;
	},
	
	_buildButton: function(btn){
		var button = new Element('div', {
			'class': 'button'
		}).set('text', btn.text).addEvent('click', function(evt){
			if(btn.onclick) eval(btn.onclick);
			this.fireEvent('click', button);
			if(this.type == 1 || this.type == 2) this._close();
			if(this.type == 2 && this.options.adaptive && this.type2Peer != button)
				this.button.set('text', btn.text).store('peer', button);
		}.bind(this));
		return button;
	},
	
	_open: function(){
		if(this.menuContainer.isVisible()) return;
		
		(this.type == 1 ? this.button : this.ctrl).addClass('press');
		this.menuContainer.inject(document.body, 'bottom').show().position({
			relativeTo: this.button,
			position: (this.options.menuDirection == 'down' ? 'bottom' : 'top') + (this.options.menuAlign == 'left' ? 'Left' : 'Right'),
			edge: (this.options.menuDirection == 'down' ? 'top' : 'bottom') + (this.options.menuAlign == 'left' ? 'Left' : 'Right'),
			offset: {x:0, y:0}
		});
		// attach events ...
		this.bodyKeydownEvent = function(evt) {
			if(evt.key == 'esc') this._close();
		}.bind(this);
		$(document).addEvent('keyup', this.bodyKeydownEvent);
		this.bodyMouseDownEvent = function(ev){
			if(this.menuContainer.isVisible() && ev.target != this.button && ev.target != this.ctrl && !this.menuContainer.contains(ev.target)) this._close();
		}.bind(this);
		$(document).addEvent('mousedown', this.bodyMouseDownEvent);
		return this;
	},
	
	_close: function(){
		if(!this.menuContainer.isVisible()) return;
		
		(this.type == 1 ? this.button : this.ctrl).removeClass('press');
		this.menuContainer.inject(this.wrapper, 'bottom').hide();
		// detach events ...
		$(document).removeEvent('mousedown', this.bodyMouseDownEvent);
		$(document).removeEvent('keyup', this.bodyKeydownEvent);
		return this;
	},
	
	setType: function(type){
		type = type.toInt();
		if(type != 0 && type != 1 && type != 2) return this;
		this.type = type;
		this._rebuild();
		return this;
	},
	
	addButton: function(btn, options){		// btn: dom element
		options = Object.merge({
			rebuild: true
		}, options);
		var btnInfo = {
			text: btn.get('text'),
			onclick: btn.getProperty('onclick')
		};
		if(options.click && typeOf(options.click) == 'function') btnInfo.click = options.click;
		this.buttons.push(btnInfo);
		if(options.rebuild) this._rebuild();
		return this;
	}//,
	
	/* TODO
	removeButton: function(btn){	// btn: dom element or int (index)
		return this;
	},
	
	enableButton: function(btn){		// btn: dom element or int (index)
		return this;
	},
	
	disableButton: function(btn){	// btn: dom element or int (index)
		return this;
	}*/
});


//#11. Picker /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
E104.AbstractPicker = new Class({
	name: 'E104.AbstractPicker',
	version: '20150318',
	Implements: [Options, Events],
	
	options: {
		'class': '',
		theme: '',
		additionClass: '',
		width: 200,
		multiline: false,
		height: 50, 		// work on 'miltiline' = true
		clearMsg: '全部清除',
		indicatorFormat: '{length} / {max}',
		url: '',
		postData: {},
		searchUrl: '',
		searchPostData: {},
		emptyQuery: true,	// 是否允許不輸入keyword時查詢資料，若允許同時cache住 (only work when url != '' && editable=true)
		tagDisplay: function(item){ return item; },
		candidateDisplay: function(item){ return item; },
		matchingDisplay: function(item, kw){ return item; },
		candidates: null,
		menuDirection: 'auto',
		menuInjectTarget: document.body,
		editable: false,
		noneMatchMsg: '無符合項目',
		max: -1,
		min: -1,
		minMsg: '至少需選 {min} 項',
		keyinDelay: 300,
		valueFilter: null,	// string or string array. ex: 'id' or ['id', 'name']
		token: '',
		orderBy: function(a, b){		// for menu sorting
			var select1 = a.hasClass('selected');
			var select2 = b.hasClass('selected');
			if((select1 && select2) || (!select1 && !select2))
				return a.retrieve('index').toInt() - b.retrieve('index').toInt();
			else if(select1) return -1;
			else return 1;
		},
		zIndex: 10000,
		onMismatch: null,	// function(picker, key){}
		onOpen: null,
		onClose: null,
		onSelect: null,	// function(picker, value, select, tag){}
		onDeselect: null,	// function(picker, value, select, tag){}
		onChanged: null	// function(picker, values){}
	},

	initialize : function(ele, options) {
		this.setOptions(options);
		var src = $(ele);
		this.dom = {};
		this.values = new Array();
		this.dom.wrapper = new Element('span', {
			'class': this.options['class'] + (this.options.theme ? '-' + this.options.theme : '') + (this.options.additionClass ? (' ' + this.options.additionClass) : '')
		}).inject(src, 'after');
		src.destroy();
		
		this._buildPicker().setMax(this.options.max).setMin(this.options.min)._buildMenu();
		
		if(this.options.url) this.sendAjax(this.options.url, this.options.postData);			// dynamic candidates ... (ajax)
		else this.setCandidates(this.options.candidates ? this.options.candidates : []);		// static candidates
	},
	
	refreshIndicator: function(){
		if(this.dom.indicator)
			this.dom.indicator.set('html', this.options.indicatorFormat.substitute({length:this.values.length, max:this.$max}));
		return this._adjustPosition();
	},
	
	sendAjax: function(url, param){
		var reqInfo = {
			url: url,
			data: Object.merge({
				kw: '',
				token: this.options.token
			}, param)
		}
		if(this.options.editable && !this.options.emptyQuery && reqInfo.data.kw == '') return this;
			
		this.$ajax = new Request.JSON({
			url: reqInfo.url,
			method: 'post',
			data: reqInfo.data,
			onRequest: function(){
				this.$preKw = reqInfo.data.kw;
				if(reqInfo.data.kw != '') this.__hide(this.dom.menu).__show(this.dom.loadingMenu);
			}.bind(this),
			onSuccess: function(response){
				if(reqInfo.data.kw.length == 0){
					this.setCandidates(response);
					if(this.$open) this._openMenu();
				}
				else{
					this.setMatchings(response, reqInfo.data.kw);
					this._openMatching();
				}
			}.bind(this),
			onError: function(text, error){}.bind(this),
			onFailure: function(xhr){}.bind(this)
		}).send();
		return this;
	},
	
	setMax: function(max){
		if(max.toInt() > 0){
			this.$max = max.toInt();
			if(this.$max > 1 && !this.dom.indicator){
				var left = this.dom.picker.getDimensions().width;
				this.dom.indicator = new Element('div', {'class': 'indicator'}).setStyle('left', left).inject(this.dom.wrapper)
					.set('tween', {
						property: 'left',
						link: 'ignore',
						duration: 200,
						onStart: function(){ left = this.dom.indicator.getStyle('left').toInt(); }.bind(this),
						transition: function(p, x) { return Math.asin(Math.sin(p * 4 * Math.PI)) * 2 / Math.PI; },
						onComplete: function() { this.dom.indicator.setStyle('left', left); }.bind(this)
					});
			}
		}
		else this.$max = -1;
		return this.refreshIndicator();
	},
	
	setMin: function(min){
		min = min.toInt();
		this.$min = min > 0 ? (this.$max > 0 && this.$max < min ? this.$max : min) : -1;
		if(this.$min > 0)
			new mBox.Tooltip({
				'class': 'E104Box',		// reuse tooltip css
				setContent: 'tip',
				container: this.dom.wrapper,
				attach: this.dom.picker,
				delayOpen: 50,
				zIndex: 9999,
				position: {
					x: ['left', 'inside'],
					y: ['top', 'outside']
				},
				offset: {x:10, y:3}
			});
		return this;
	},
	
	setCandidates: function(candidates){
		if(this.$candidates == candidates) return;
		this.$candidates = candidates;
		if(this.dom.candidates) this.dom.candidates.each(function(candidate){ candidate.destroy(); });
		this.dom.candidates = new Array();
		candidates.each(function(item, idx){
			this.dom.candidates.push(this._buildItem(this.buildCandidate(item), item, idx));
		}.bind(this));
		return this;
	},
	
	setMatchings: function(matchings, kw){
		if(this.dom.matchings) this.dom.matchings.each(function(m){ m.destroy(); });
		this.dom.matchings = new Array();
		matchings.each(function(item, idx){
			this.dom.matchings.push(this._buildItem(this.buildMatching(item, kw), item, idx));
		}.bind(this));
		return this;		
	},
	
	_buildItem: function(ele, data, idx){
		return ele.store('value', data).store('index', idx).addClass('item').addEvents({
			'click': function(evt){
				this[this.containValue(data) ? 'removeValue' : 'addValue'](data);
				if(this.options.editable && !this.$full) this.dom.field.focus();
			}.bind(this),
			'mouseenter': function(evt, dom){
				if(dom == null) dom = evt.target;
				this.dom.menuContent.getChildren().each(function(ele){ele.removeClass('hover')});
				this.$hover = dom.addClass('hover');
				if(this.containValue(data)){
					this.dom.field.set('value', '');
					return;
				}
				else if(this.$full && this.$max > 1) return dom.addClass('notAllow');
				dom.removeClass('notAllow');
				this.dom.field.set('value', this.options.tagDisplay(data));
				if(typeOf(evt) == 'object') this._scroll(dom);
			}.bind(this)
		});
	},
	
	_scroll: function(dom){
		var pos = dom.getPosition(dom.getParent()).y;
		var h0 = dom.getSize().y;
		var scroll = dom.getParent().getScroll().y;
		var h1 = dom.getParent().getSize().y;
		if(pos < 0) dom.getParent().scrollTo(0, scroll + pos);
		else if((pos + h0) > h1) dom.getParent().scrollTo(0, pos + h0 - h1 + scroll);
	},
	
	buildCandidate: function(item){},	// abstract method
	buildMatching: function(item, kw){},	// abstract method
	
	getValues: function(){
		if(this.values.length == 0) return this.values;
		if(typeOf(this.options.valueFilter) == 'string' && typeOf(this.values[0]) == 'object'){
			var values = new Array();
			var key = this.options.valueFilter;
			this.values.each(function(v){ if(v[key]) values.push(v[key]); });
			return values;
		}
		else if(typeOf(this.options.valueFilter) == 'array' && typeOf(this.values[0]) == 'object'){
			var values = new Array();
			var keys = this.options.valueFilter;
			this.values.each(function(v){
				var obj = {};
				keys.each(function(key){ if(v[key]) obj[key] = v[key]; });
				values.push(obj);
			});
			return values;
		}
		else return this.values;
	},
	
	setValues: function(values){
		values.each(function(value){this.addValue(value);}.bind(this));
	},
	
	addValue: function(value){
		if(this.$max > 1 && this.values.length >= this.$max){
			this.dom.indicator.tween(this.dom.indicator.getStyle('left').toInt() + 4);
			return;
		}
		else if(this.$max == 1 && this.values.length > 0) this.removeValue(this.values[0]);
		
		if(!this.dom.candidates || this.dom.candidates.length == 0) this.setCandidates([value]);
		var selected = this._findCandidateDom(value);
		if(selected){
			selected.addClass('selected');
			value = selected.retrieve('value');
		}
		this.dom.field.set('value', '');

		var tag = new Element('span', {'class': 'tag'}).set('html', this.options.tagDisplay(value)).store('value', value).inject(this.dom.tags);
		new Element('span', {'class': 'delete'}).addEvent('click', function(evt){
			evt.stopPropagation();
			this.removeValue(value);
		}.bind(this)).inject(tag);
		
		this.values.push(value);
		this.$full = this.$max > 0 && this.values.length >= this.$max;
		
		if(this.values.length > 1) this.dom.clear.show();
		if(this.$full){
			this.dom.field.hide();
			this.blur();
		}
		this.fireEvent('select', [this, value, selected, tag]);
		this.fireEvent('changed', [this, this.values]);
		return this.refreshIndicator();
	},
	
	removeValue: function(value){
		var selected = this._findCandidateDom(value);
		if(selected) value = selected.removeClass('selected').retrieve('value');

		var tag = this.dom.tags.getChildren().filter(function(tag, idx){
			return E104.Utils.partialEqual(value, tag.retrieve('value'), this.options.valueFilter); 
		}.bind(this));
		if(tag && tag.length > 0) tag[0].destroy();

		this.values.each(function(v){
			if(E104.Utils.partialEqual(value, v, this.options.valueFilter)){
				this.values.erase(v);
				return;
			}
		}.bind(this));
		this.$full = this.$max > 0 && this.values.length >= this.$max;

		if(this.values.length < 2) this.dom.clear.hide();
		if(!this.$full && this.options.editable) this.dom.field.show();
		this.fireEvent('deselect', [this, value, selected, tag]);
		this.fireEvent('changed', [this, this.values]);
		this.refreshIndicator();
		if(!this.$open) this.blur();
		return this;
	},
	
	containValue: function(value){
		return this.values.some(function(v){
			return E104.Utils.partialEqual(value, v, this.options.valueFilter); 
		}.bind(this));
	},
	
	reset: function(){
		this.values = new Array();
		this.$full = false;
		this.$hover = null;
		this.$preKw = null;
		this.$preKeyinTimestamp = null;
		this._closeMenu();
		this.dom.field.set('value', '').blur();
		this.dom.picker.removeClass('focus');
		this.dom.tags.getChildren().each(function(tag){ tag.destroy(); });
		if(this.options.editable && this.options.url != '' && !this.options.emptyQuery) this.setCandidates([]);
		if (this.dom.candidates) this.dom.candidates.each(function(candidate){
			candidate.removeClass('hover').removeClass('selected');
		});
		this.dom.clear.hide();
		if(this.options.editable) this.dom.field.show();
		this.fireEvent('changed', [this, this.values]);
		return this.refreshIndicator();
	},
	
	focus: function(){
		this.dom.picker.addClass('focus').removeClass('error').removeProperty('tip');
		if(this.dom.field.isDisplayed()) this.dom.field.focus();
		if(!this.options.editable || !(this.options.url != '' && !this.options.emptyQuery)) this._openMenu();
	},
	
	blur: function(){
		this._closeMenu();
		this.dom.field.set('value', '').blur();
		this.dom.picker.removeClass('focus');
		if(this.$min > 0 && (this.values && this.values.length < this.$min)){
			this.dom.picker.addClass('error').setProperty('tip', this.options.minMsg.substitute({min:this.$min}));
			[50, 150, 200, 300].each(function(sec, index) {
				(function(fn){ this.dom.picker[fn + 'Class']('error'); }).delay(sec, this, [index % 2 == 0 ? 'remove' : 'add']);
			}.bind(this));
		}
	},
	
	searchStaticData: function(kw){	// overridden method ...
		var pattern = new RegExp(kw.escapeRegExp(), "i");
		var passCount = 0;
		this.$hover = null;
		var matchings = new Array();
		this.$candidates.each(function(data){
			var pass = pattern.test(this.options.candidateDisplay(data).replace(/(<([^>]+)>)/ig,""));
			if(pass) matchings.push(data);
			passCount += pass ? 1 : 0;
		}, this);
		if((passCount == 0 && kw.length > 0) || this.dom.candidates.length == 0) this.dom.noneMatch.inject(this.dom.menuContent.empty());
		else{
			this.setMatchings(matchings, kw);
			this._openMatching();
		}
		return this;
	},
	
	_findCandidateDom: function(value){
		var selected = this.dom.menuContent.getChildren().filter(function(dom, idx){
			return E104.Utils.partialEqual(value, dom.retrieve('value'), this.options.valueFilter);
		}.bind(this));
		return (selected && selected.length > 0) ? selected[0] : false;
	},
	
	_buildPicker: function(){
		this.dom.picker = new Element('div', {'class': 'picker'}).addEvent('click', function(){
			this.focus();
		}.bind(this)).inject(this.dom.wrapper);
		this.dom.picker.setStyle('width', (this.options.width && this.options.width.toInt() > 100) ? this.options.width.toInt() : 100);
		if(this.options.multiline){
			this.dom.picker.setStyles({
				height: (this.options.height && this.options.height.toInt() > 50) ? this.options.height.toInt() : 50,
				'white-space': 'normal',
				'overflow-x': 'hidden',
				'overflow-y': 'auto'
			});
		}
		this.dom.tags = new Element('div', {'class': 'tags'}).setStyles({
			'margin-left': 2
		}).inject(this.dom.picker);
		this.dom.field = new Element('input', {
			type: 'text',
			'class': 'field',
			style: 'margin-left:2px'
		}).addEvent('keyup', function(evt){
			if(evt && ['esc', 'tab', 'enter'].contains(evt.key)) return;
			else if(evt && ['up', 'down'].contains(evt.key)){
				this.dom.field.blur();
				return;
			}
			var now = new Date().getTime();
			var kw = this.dom.field.get('value').trim();
			if(this.$preKw && this.$preKw == kw) return;
			if(this.options.url){
				clearTimeout(this.$timer);
				if(kw.length == 0 && !this.options.emptyQuery) return this._closeMenu();
				if(kw.length == 0 && this.options.emptyQuery) return this._openMenu();
				this.$timer = (function(){
					if(this.$preKeyinTimestamp && (now - this.$preKeyinTimestamp <= this.options.keyinDelay)) return;
					this.$preKeyinTimestamp = now;
					if(this.$ajax && this.$ajax.isRunning()) this.$ajax.cancel();
					this.sendAjax(this.options.searchUrl || this.options.url, Object.merge(this.options.searchPostData, {kw: kw}));
				}.bind(this)).delay(this.options.keyinDelay, this);
			}
			else{
				if(kw.length > 0) this.searchStaticData(kw).__show(this.dom.menu);
				else this._openMenu();
				this.$preKw = kw;
			}
		}.bind(this)).addEvent('focus', function(evt){
			evt.stop();
			if(this.$open) return;
			(function(){
				if(!this.$open) this.dom.picker.fireEvent('click');
			}).delay(200, this);
		}.bind(this)).inject(this.dom.picker);
		if(!this.options.editable) this.dom.field.hide();
		this.dom.clear = new Element('div', {'class': 'clear', tip:this.options.clearMsg}).addEvent('click', function(evt){
			evt.stopPropagation();
			this.reset();
		}.bind(this)).setStyle('left', this.dom.picker.getComputedSize().totalWidth + this.dom.picker.getStyle('margin-right').toInt() + 2).inject(this.dom.wrapper).hide();
		new mBox.Tooltip({
			'class': 'E104Box',		// reuse tooltip css
			setContent: 'tip',
			container: this.dom.wrapper,
			attach: this.dom.clear,
			delayOpen: 50,
			zIndex: 99999,
			position: {
				x: ['center', 'inside'],
				y: ['top', 'outside']
			},
			offset: {x:0, y:3}
		});
		
		// fix css
		if(this.options.multiline){
			this.dom.tags.setStyles({
				'max-width': this.dom.picker.getComputedSize().width
			});
			this.dom.field.setStyles({
				width: '95%'
			});
		}
		else{
			this.dom.tags.setStyles({
				position: 'absolute',
				overflow: 'hidden',
				'white-space': 'nowrap',
				'max-width': this.dom.picker.getComputedSize().width - 25 - 8
			});
			this.dom.field.setStyles({
				position: 'relative',
				'min-width': 25
			});
		}
		return this;
	},
	
	_buildMenu: function(){
		this.dom.menu = new Element('div', {
			'class': this.options['class'] + (this.options.theme ? '-' + this.options.theme : '') + (this.options.additionClass ? (' ' + this.options.additionClass) : '') + ' menu noselect'
		}).setStyles({
			'width': this.dom.picker.getComputedSize().width,
			'z-index': this.options.zIndex
		}).inject(this.dom.wrapper, 'bottom').hide();
		
		this.dom.menuContent = new Element('div', {'class': 'menuContent'}).inject(this.dom.menu);

		this.dom.loadingMenu = new Element('div', {
			'class': this.options['class'] + (this.options.theme ? '-' + this.options.theme : '') + ' loadingMenu noselect'
		}).setStyle('width', this.dom.picker.getComputedSize().width).inject(this.dom.wrapper, 'bottom').hide();
		
		this.dom.noneMatch = new Element('div', {'class': 'item noneMatch'}).set('html', this.options.noneMatchMsg);
		return this;
	},
	
	_adjustPosition: function(){
		if(!this.options.multiline){
			var w = this.dom.tags.getDimensions().width + 2;
			this.dom.field.setStyles({
				left: w,
				width: this.dom.picker.getComputedSize().width - w - (2 * 2)
			});
		}
		var margin = 0;
		if(this.dom.clear.isDisplayed()) margin += this.dom.clear.getSize().x + 2;
		if(this.dom.indicator){
			margin += this.dom.indicator.getSize().x;
			this.dom.indicator.setStyle('left', this.dom.picker.getComputedSize().totalWidth + this.dom.picker.getStyle('margin-right').toInt() + (this.dom.clear.isDisplayed() ? this.dom.clear.getSize().x : 0));
		}
		this.dom.wrapper.setStyle('margin-right', margin);
		return this;
	},
	
	_openMenu: function(content){
		if(this.$hover) this.$hover = null;
		
		this.__refreshMenu(content == 'matching' ? this.dom.matchings : this.dom.candidates);
		if(this.$open) return this;
		this.$open = true;
		this.__attachBodyEvents();
		this.fireEvent('open');
		return this;
	},
	
	_openMatching: function(){
		return this._openMenu('matching');
	},
	
	__refreshMenu: function(src){
		this.dom.menuContent.empty();
		if(this.$ajax && this.$ajax.isRunning()) this.__hide(this.dom.menu).__show(this.dom.loadingMenu);
		else{
			if(!src || src.length == 0){
				this.dom.noneMatch.inject(this.dom.menuContent);
				this.fireEvent('mismatch', [this, this.$preKw]);
			}
			else{
				src.each(function(item){
					item[this.containValue(item.retrieve('value')) ? 'addClass' : 'removeClass']('selected');
				}.bind(this));
				if(typeOf(this.options.orderBy) == 'function') src.sort(this.options.orderBy);
				src.each(function(item){
					item.removeClass('hover').inject(this.dom.menuContent);
				}.bind(this));
				if(this.$hover) this.$hover = null;
			}
			this.__hide(this.dom.loadingMenu).__show(this.dom.menu);
		}
	},
	
	_closeMenu: function(){
		this.$preKw = null;
		this.__hide(this.dom.menu).__hide(this.dom.loadingMenu);

		if(!this.$open) return this;
		this.$open = false;
		// detach events ...
		$(document).removeEvent('keyup', this.bodyKeyupEvent);
		$(document).removeEvent('keydown', this.bodyKeydownEvent);
		$(document).removeEvent('mousedown', this.bodyMouseEvent);
		this.fireEvent('close');
		return this;
	},
	
	__show: function(container){
		var dir = this.options.menuDirection;
		if(!['up', 'down'].contains(dir)){
			var space = E104.Utils.getDirectionSpace(this.dom.picker);
			dir = space.bottom >= this.dom.menu.getDimensions().height ? 'down' : space.top > space.bottom ? 'up' : 'down';
		}
		var target = this.options.menuInjectTarget ? this.options.menuInjectTarget : document.body;
		container.inject(target, 'bottom').position({
			relativeTo: this.dom.picker,
			position: (dir == 'up' ? 'topLeft' : 'bottomLeft'),
			edge: (dir == 'up' ? 'bottomLeft' : 'topLeft'),
			offset: {x:0, y: dir == 'up' ? -1 : 1}
		}).show();
		return this;
	},
	
	__hide: function(container){
		container.inject(this.dom.wrapper, 'bottom').hide();
		return this;
	},
	
	__attachBodyEvents: function() {
		// key event ...
		this.bodyKeyupEvent = function(evt) {
			if(this.$ajax && this.$ajax.isRunning()) return; 
			if(evt.key == 'up' || evt.key == 'down') {
				evt.stop();
				var options = this.dom.menuContent.getChildren().filter(function(ele){ return ele.isDisplayed(); });
				if(options.length == 0) return;
				if(!this.$hover) options[0].fireEvent('mouseenter', [this, options[0]]);
				else{
					var idx = -1;
					options.each(function(opt, i){ if(this.$hover == opt){idx = i; } }.bind(this));
					if(idx == -1) return;
					if(evt.key == 'down' && idx < options.length - 1) options[idx + 1].fireEvent('mouseenter', [this, options[idx + 1]]);
					else if(evt.key == 'up' && idx > 0) options[idx - 1].fireEvent('mouseenter', [this, options[idx - 1]]);
				}
			}
			else if (evt.key == 'enter') {
				evt.stop();
				if(this.$hover) this.$hover.fireEvent('click');
			}
			else if(evt.key == 'esc' || evt.key == 'tab') this.blur();
		}.bind(this);
		this.bodyKeydownEvent = function(evt) {
			if(evt.key == 'up' || evt.key == 'down') evt.stop();
		}
		$(document).addEvent('keyup', this.bodyKeyupEvent);
		$(document).addEvent('keydown', this.bodyKeydownEvent);
		// mouse event ...
		this.bodyMouseEvent = function(ev){
			if(this.$ajax && this.$ajax.isRunning()) return; 
			if(this.$open && ev.target != this.dom.wrapper && !this.dom.wrapper.contains(ev.target) && !this.dom.menu.contains(ev.target)) this.blur();
		}.bind(this);
		$(document).addEvent('mousedown', this.bodyMouseEvent);
	}
});

E104.Picker = new Class({
	name: 'E104.Picker',
	version: '20150319',
	Extends : E104.AbstractPicker,

	options: {
		'class': 'E104Picker',
		theme: ''
	},

	initialize : function(ele, options) {
		this.parent(ele, options);
	},
	
	buildCandidate: function(item){	// implement function ...
		return new Element('div').set('html', this.options.candidateDisplay(item));
	},
	
	buildMatching: function(item, kw){	// implement function ...
		return new Element('div').set('html', this.options.matchingDisplay(item, kw));
	}
});

E104.TreePicker = new Class({
	name: 'E104.TreePicker',
	version: '20150610',
	Extends : E104.AbstractPicker,

	options: {
		'class': 'E104TreePicker',
		theme: '',
		leafOnly: true,
		deepLimited: false,	// false or number > 0
		orderBy: false,
		searchDisplay: function(item, kw){ return item; },
		parentProperty: 'id'
	},

	initialize : function(ele, options) {
		this.parent(ele, options);
		this.$deepLimited = (this.options.deepLimited && this.options.deepLimited.toInt() > 0) ? this.options.deepLimited.toInt() : 999;
	},
	
	reset: function(){
		this.parent();
		this.dom.candidates.each(function(candidate){
			this._clearSubCandidates(candidate);
		}.bind(this));
	},
	
	_clearSubCandidates: function(item){
		var children = item.retrieve('children');
		if(children)
			children.each(function(child){
				child.removeClass('hover').removeClass('selected');
				this._clearSubCandidates(child);
			}.bind(this));
	},
	
	buildCandidate: function(item){	// implement function ...
		return new Element('div').set('html', this.options.candidateDisplay(item));
	},
	
	buildMatching: function(item, kw){	// implement function ...
		return new Element('div').set('html', this.options.matchingDisplay(item, kw));
	},

	searchStaticData: function(kw){	// overridding super ...
		this.$hover = null;
		this.dom.menuContent.empty();
		var matchings = new Array();
		this._deepSeek(this.$candidates, kw, matchings);
		if((matchings.length == 0 && kw.length > 0) || this.$candidates.length == 0) this.dom.noneMatch.inject(this.dom.menuContent);
		else{
			matchings.each(function(data, idx){
				var dom = this.buildMatching(data, kw).store('value', data).store('index', idx)
					.addClass('item').addClass(this.containValue(data) ? 'selected' : '').inject(this.dom.menuContent);
				dom.addEvent('mouseenter', this._candidateEnterEvent.bind(this, dom, data, this.dom.menuContent));
				dom.addEvent('mouseover', this._candidateEnterEvent.bind(this, dom, data, this.dom.menuContent));
				dom.addEvent('click', this._candidateClickEvent.bind(this, data))
			}, this);			
		}
		return this;
	},
	
	_deepSeek: function(targets, kw, matchings){
		var pattern = new RegExp(kw.escapeRegExp(), "i");
		targets.each(function(item, idx){
			if(!item.children || (typeOf(item.children) == 'array' && !this.options.leafOnly)){
				var pass = pattern.test(this.options.candidateDisplay(item).replace(/(<([^>]+)>)/ig,""));
				if(pass) matchings.push(item);
			}
			if(typeOf(item.children) == 'array')
				this._deepSeek(item.children, kw, matchings);
		}, this);
	},
	
	setCandidates: function(candidates){		// overriding super ...
		if(this.$candidates == candidates) return;
		this.$candidates = candidates;
		if(this.dom.candidates) this.dom.candidates.each(function(candidate){ candidate.destroy(); });
		this.dom.candidates = new Array();
		candidates.each(function(data, idx){
			var dom = this.buildCandidate(data)
				.store('value', data).store('index', idx).store('deep', 0)
				.addClass('item').addClass(this.containValue(data) ? 'selected' : '')
				.addClass((!data.leaf && this.options.url != '') || data.children ? (this.options.leafOnly ? 'hasChildren notAllow' : 'hasChildren') : '').inject(this.dom.menuContent);
			dom.addEvent('mouseenter', this._candidateEnterEvent.bind(this, dom, data, this.dom.menuContent));
			if(!this.options.leafOnly || !dom.hasClass('notAllow')) dom.addEvent('click', this._candidateClickEvent.bind(this, data));
			this.dom.candidates.push(dom);
		}, this);
		return this;
	},
	
	_candidateClickEvent: function(data, evt){
		if(evt) evt.stop();
		this[this.containValue(data) ? 'removeValue' : 'addValue'](data);
		if(this.options.editable && !this.$full && evt) this.dom.field.focus();
	},
	
	_candidateEnterEvent: function(dom, data, siblingContainer, evt){
		if(typeOf(evt) == 'object') this._scroll(dom);
		siblingContainer.getChildren().each(function(ele){ele.removeClass('hover')});
		this.$hover = dom.addClass('hover');
		
		var peerValue = dom.retrieve('value');
		var deep = dom.retrieve('deep') + 1;
		var subMenu = this.dom['subMenu' + deep];
		if(dom.hasClass('hasChildren')){
			if(!subMenu) subMenu = this._buildSubMenu(deep);
			var subMenuContent = this.dom['subMenuContent' + deep].empty();
			var children = dom.retrieve('children');
			if(!children){
				if(peerValue.children == undefined){
					if(this.options.url == '') dom.removeClass('hasChildren');
					else this.$ajax = this._loadSubMenu(this.options.url, {p: peerValue[this.options.parentProperty]}, dom, subMenu, subMenuContent);	// ajax....				
				}
				else if(typeOf(peerValue.children) == 'string')
					this.$ajax = this._loadSubMenu(peerValue.children, {}, dom, subMenu, subMenuContent);	// ajax....
				else if(typeOf(peerValue.children) == 'array'){
					children = this._buildSubCandidates(dom, peerValue.children);
					children.each(function(child, idx){ child.inject(subMenuContent); }, this);
				}
			}
			else children.each(function(child, idx){ child.inject(subMenuContent); }, this);
			if(this.options.leafOnly) this.dom.field.set('value', '');
			else this.dom.field.set('value', this.options.tagDisplay(data));
			this.__showSubMenu(dom, subMenu);
		}
		else{
			if(!this.containValue(data)){
				if(this.$full && this.$max > 1) return dom.addClass('notAllow');
				dom.removeClass('notAllow');
				this.dom.field.set('value', this.options.tagDisplay(data));
			}
			if(subMenu) subMenu.hide();
		}
	},

	_buildSubCandidates: function(parent, candidates){
		var deep = parent.retrieve('deep') + 1;
		var doms = new Array();
		candidates.each(function(data, idx){
			var dom = this.buildCandidate(data)
				.store('value', data).store('index', idx).store('deep', deep).store('parent', parent)
				.addClass('item sub').addClass(this.containValue(data) ? 'selected' : '')
				.addClass((!data.leaf && this.options.url != '' && deep + 1 < this.$deepLimited) || data.children ? (this.options.leafOnly ? 'hasChildren notAllow' : 'hasChildren') : '');
			dom.addEvent('mouseenter', this._candidateEnterEvent.bind(this, dom, data, this.dom['subMenuContent' + deep]));
			if(!this.options.leafOnly || !dom.hasClass('notAllow')) dom.addEvent('click', this._candidateClickEvent.bind(this, data));
			doms.push(dom);
		}, this);
		parent.store('children', doms);
		return doms;
	},
	
	_buildSubMenu: function(deep){
		var zIndexBase = this.options.zIndex;
		if(isNaN(zIndexBase)) zIndexBase = 0;
		var m = this.dom['subMenu' + deep] = new Element('div').store('deep', deep).setStyle('z-index', 2 * deep + zIndexBase).inject(this.dom.wrapper, 'bottom').hide();
		var border = new Element('div', {'class': this.options['class'] + (this.options.theme ? '-' + this.options.theme : '') + ' menu'}).inject(m);
		new Element('div', {'class': this.options['class'] + (this.options.theme ? '-' + this.options.theme : '') + ' menuPointer pointerLeft'}).inject(m);
		this.dom['subMenuContent' + deep] = new Element('div', {'class': 'menuContent'}).inject(border);
		return m;
	},
	
	__showSubMenu: function(parent, menu){
		var space = E104.Utils.getDirectionSpace(parent);
		dir = space.right >= menu.getDimensions().width ? 'right' : space.left > space.right ? 'left' : 'right';

		menu.show().inject(parent).position({
			relativeTo: parent,
			position: (dir == 'left' ? 'leftCenter' : 'rightCenter'),
			edge: (dir == 'left' ? 'rightCenter' : 'leftCenter'),
			offset: {x: dir == 'left' ? -12 : 7, y: 0},
			minimum: {
				y: -30
			}
		});

		var m = menu.getFirst();
		m.getFirst().getChildren().each(function(ele){
			ele.removeClass('hover');
		});
		var pointer = menu.getLast().removeClass('pointerLeft').removeClass('pointerRight').addClass(dir == 'right' ? 'pointerLeft' : 'pointerRight');
		pointer.position({
			relativeTo: parent,
			position: (dir == 'left' ? 'leftCenter' : 'rightCenter'),
			edge: (dir == 'left' ? 'rightCenter' : 'leftCenter'),
			offset: {x: dir == 'left' ? 3 : -6, y: 0}
		});

		var deep = menu.retrieve('deep') + 1;
		if(this.dom['subMenu' + deep]) this.dom['subMenu' + deep].hide();
		return this;
	},
	
	_openMenu: function(content){		// overriding super ...
		this.parent(content);
		if(this.dom.subMenu1) this.dom.subMenu1.hide();
	},
	
	_findCandidateDom: function(value){		// overriding super ...
		var selected = this.parent(value);
		if(!selected) selected = this.__deepFindCandidateDom(this.dom.candidates, value);
		return selected;
	},
	
	__deepFindCandidateDom: function(parent, value){
		var selected = false;
		for(var i = 0; i < parent.length; i++){
			var children = parent[i].retrieve('children');
			if(children){
				selected = children.filter(function(child, idx){
					return E104.Utils.partialEqual(value, child.retrieve('value'), this.options.valueFilter);
				}.bind(this));
				selected = (selected && selected.length > 0) ? selected[0] : false;
				if(!selected) selected = this.__deepFindCandidateDom(children, value);
			}
			if(selected) break;
		}
		return selected;
	},
	
	_loadSubMenu: function(url, postData, parent, menu, menuContent){
		var req = {
			url: url,
			data: Object.merge({}, postData)
		};
		return new Request.JSON({
			url: req.url,
			method: 'post',
			data: Object.toQueryString(req.data),
			onRequest: function(){	
				menuContent.addClass('loading');
			}.bind(this),
			onSuccess: function(response){
				menuContent.removeClass('loading');
				var children = this._buildSubCandidates(parent, response);
				children.each(function(child, idx){ child.inject(menuContent); }, this);
				this.__showSubMenu(parent, menu);
			}.bind(this),
			onError: function(text, error){}.bind(this),
			onFailure: function(xhr){}.bind(this)
		}).send();
	},
	
	__attachBodyEvents: function() {
		this.parent();
		this.bodyKeyupEvent1 = function(evt) {
			if(evt.key == 'left' || evt.key == 'right') {
				evt.stop();
				if(!this.$hover) return;
				var deep = this.$hover.retrieve('deep');
				if(deep == 0){
					if(this.$hover.retrieve('children') == undefined) return;
					if(evt.key == 'left') return;
				} 
				if(evt.key == 'right' && this.dom['subMenuContent' + (deep + 1)]) this.dom['subMenuContent' + (deep + 1)].getFirst().fireEvent('mouseenter');
				else if(evt.key == 'left') this.$hover.retrieve('parent').fireEvent('mouseenter');
			}
			else if(evt.key == 'up' || evt.key == 'down'){
				evt.stop();
				if(!this.$hover) return;
				var deep = this.$hover.retrieve('deep');
				if(deep == undefined || deep == 0) return;
				var idx = this.$hover.retrieve('index');
				var options = this.dom['subMenuContent' + deep].getChildren();
				if(evt.key == 'down' && idx < options.length - 1) options[idx + 1].fireEvent('mouseenter');
				else if(evt.key == 'up' && idx > 0) options[idx - 1].fireEvent('mouseenter');
			}
		}.bind(this);
		this.bodyKeydownEvent1 = function(evt) {
			if(evt.key == 'left' || evt.key == 'right') evt.stop();
		}
		$(document).addEvent('keyup', this.bodyKeyupEvent1);
		$(document).addEvent('keydown', this.bodyKeydownEvent1);
	},
	
	_closeMenu: function(){
		this.parent();
		$(document).removeEvent('keyup', this.bodyKeyupEvent1);
		$(document).removeEvent('keydown', this.bodyKeydownEvent1);
	}
});