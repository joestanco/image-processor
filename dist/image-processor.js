/**
 * ImageProcessor v.0.0.1
 * jQuery plugin for effects and canvas manipulation
 * 
 * Created by Joe Stanco (https://github.com/joestanco)
 *
 * Library dependencies: jQuery, EaselJS, Pixastic
 *
 */

;(function ( $, window, document, undefined ) {

	var pluginName = "imageProcessor",
		defaults = {
			scratchCanvasId: "scratchCanvas",
			scratchImageId: "img",
			stageId: "stage",
			stageWidth: 0,
			stageHeight: 0,
			scratchCanvasWidth: 0,
			scratchCanvasHeight: 0,
			scratchImageWidth: 0,
			scratchImageHeight: 0,
			effectTimeout: 30000
		},

		/***************************************************************
		 * PRIVATE METHODS
		 ***************************************************************/

		/**
		 * Set the width of an element
		 *
		 * @param {object} el - HTML element
		 * @param {number} w - desired width
		 */
		_setWidth = function (el, w) {
			if (isNaN(parseInt(w, 10))) return;
			el.attr("width", w);
		},

		/**
		 * Set the height of an element
		 *
		 * @param {object} el - HTML element
		 * @param {number} h - desired height
		 */
		_setHeight = function (el, h) {
			if (isNaN(parseInt(h, 10))) return;
			el.attr("height", h);
		},

		/**
		 * Set the width and height of an element
		 *
		 * @param {object} el - HTML element
		 * @param {object} dims - desired width and height
		 */
		_setDimensions = function (el, dims) {
			if (typeof el === "undefined" || typeof dims === "undefined") return;
			_setWidth(el, dims.width);
			_setHeight(el, dims.height);
		},

		/**
		 * Add a canvas element to the body of the page, if it doesn't exist
		 *
		 * @param {object} target - HTML element to append to
		 * @param {string} id - id attribute for the new element
		 */
		_appendCanvas = function(target, id) {
			var self = this;
			if (!$(target).find("#"+id).length) {
				$(target).append('<canvas id="' + id + '"></canvas>');
			}
			$("#"+id).crossOrigin = "Anonymous";
			self.moveOffscreen($("#"+id));
		},

		/**
		 * Add an image element to the body of the page, if it doesn't exist
		 *
		 * @param {object} target - HTML element to append to
		 * @param {string} id - id attribute for the new element
		 */
		_appendImage = function(target, id) {
			var self = this;
			if (!$(target).find("#"+id).length) {
				$(target).after('<img id="' + id + '" />');
			}
			$("#"+id).crossOrigin = "Anonymous";
			self.moveOffscreen($("#"+id));
		},

		/**
		 * Detect whether image element has failed to load
		 *
		 * @param {object} imgEl - image element
		 * @return {boolean}
		 */
		_checkImageNotFound = function(imgEl) {
			return imgEl.complete && typeof imgEl.naturalWidth != "undefined" && imgEl.naturalWidth == 0;
		},

		/**
		 * Detect loaded state of the image and trigger the appropriate handler
		 */
		_checkImageLoaded = function() {
			var self = this;
			if (_checkImageNotFound(self.element)) {
				self.$element.trigger("image:loadError");
			} else if (self.element.complete) {
				self.$element.trigger("image:loaded");
			} else {
				self.$element.on("load", function() {
					self.$element.trigger("image:loaded");
				});
			}
		},

		/**
		 * Assign event handler to an event triggered on the plugin element
		 *
		 * @param {string} eventName - event name to bind to
		 * @param {function} handler - handler for event
		 */
		_addHandler = function(eventName, handler) {
			var self = this;
			if (typeof handler === "function") {
				self.$element.on(eventName, handler);
			}
		};

	function Plugin ( element, options ) {
		if (!element.id) element.id = "_" + (new Date().getTime());
		this.element = element;
		this.$element = $(element);
		this.settings = $.extend( {}, defaults, options );
		this._defaults = defaults;
		this._name = pluginName;
		this.init();
	}

	Plugin.prototype = {

		/***************************************************************
		 * PUBLIC METHODS
		 ***************************************************************/

		/**
		 * Move an element offscreen using absolute positioning
		 *
		 * @param {object} $el - jQuery element
		 */
		moveOffscreen: function($el) {
			$el.css({
				position: "absolute",
				top: "-9999em",
				left: "-9999em"
			});
		},

		/**
		 * Move an element onscreen by resetting positioning to default
		 *
		 * @param {object} $el - jQuery element
		 */
		moveOnscreen: function($el) {
			$el.css({
				position: "static",
				top: "inherit",
				left: "inherit"
			});
		},

		/**
		 * Swap visibility of two elements on the screen
		 *
		 * @param {object} $offEl - jQuery element to be moved offscreen
		 * @param {object} $onEl - jQuery element to be moved onscreen
		 */
		swapOnscreen: function($offEl, $onEl) {
			this.moveOffscreen($offEl);
			this.moveOnscreen($onEl);
		},

		/**
		 * Get the stage object for a canvas element
		 *
		 * @param {object} $el - jQuery (canvas) element
		 * @return {object}
		 */
		getStage: function($el) {
			switch (this.canvasLib) {
				case "easeljs":
				default:
					return new this.canvasAPI.Stage($el[0]);
					break;
			}
		},

		/**
		 * Convert a canvas element to a bitmap
		 *
		 * @param {object} $el - jQuery (canvas) element
		 * @return {object}
		 */
		getBitmap: function($el) {
			switch (this.canvasLib) {
				case "easeljs":
				default:
					return new this.canvasAPI.Bitmap($el);
					break;
			}
		},

		/**
		 * Get a shape object from canvas API
		 *
		 * @return {object}
		 */
		getShape: function() {
			switch (this.canvasLib) {
				case "easeljs":
				default:
					return new this.canvasAPI.Shape();
					break;
			}
		},

		/**
		 * Apply an effect to a canvas element using effects API
		 *
		 * @param {string} effectName - name of effect to apply
		 * @param {object} target - jQuery or native (canvas) element
		 * @param {function} callback - function to execute when the effect is done
		 */
		applyEffect: function(effectName, target, callback) {

			var effect, timer, options,
				self = this,
				timedOut = false;
			if (this.effects.hasOwnProperty(effectName) && typeof target !== "undefined") {
				if (target.length) target = target[0];
				effect = this.effects[effectName];
				options = effect.options || {};
				switch (this.effectsLib) {
					case "pixastic":
					default:

						timer = setTimeout(function() {
								timedOut = true;
								self.$element.trigger("image:effectError");
							}, this.settings.effectTimeout);

						this.effectsAPI.process(target, effectName, options, function(resultCanvas) {
							if (!timedOut && typeof callback === "function") {
								clearTimeout(timer);
								callback(resultCanvas);
							}
						});
						break;
				}
			}

		},

		/**
		 * Draw a grid on a canvas element
		 *
		 * @param {object} canvas - native canvas element
		 * @param {number} gridSize - size of grid to be drawn
		 * @param {string} color - color value of grid lines (hex or rgb)
		 * @param {number} lineWidth - width of gridline
		 */
		buildGrid: function(canvas, gridSize, color, lineWidth) {

			var x = 0, y = 0,
				ctx = canvas.getContext("2d");

			ctx.lineWidth = lineWidth;
			ctx.strokeStyle = color;

			for (; x < canvas.width; x += gridSize) {
			  ctx.moveTo(x, 0);
			  ctx.lineTo(x, canvas.height);
			}
			for (; y < canvas.height; y += gridSize) {
			  ctx.moveTo(0, y);
			  ctx.lineTo(canvas.width-1, y);
			}
			ctx.stroke();

		},

		/**
		 * Clean up elements generated by the plugin
		 */
		destroy: function() {
			this.$stageEl.remove();
			this.$scratchCanvasEl.remove();
			$("#"+this.element.id).remove();
		},

		init: function () {
			var scratchImageId = this.settings.scratchImageId + "_" + this.$element.attr("id");

			this.canvasLib = this.settings.canvasAPI.name;
			this.effectsLib = this.settings.effectsAPI.name;
			this.effectsAPI = this.settings.effectsAPI.api;
			this.canvasAPI = this.settings.canvasAPI.api;
			this.effects = this.settings.effects;

			// Stage canvas is the primary element for canvas manipulation
			_appendCanvas.call(this, "body", this.settings.stageId);

			// Scratch canvas is for canvas manipulation
			_appendCanvas.call(this, "body", this.settings.scratchCanvasId);

			// Scratch image is for image manipulation or final generated image
			_appendImage.call(this, this.element, scratchImageId);

			this.$scratchImageEl = $("#"+scratchImageId);
			this.$stageEl = $("#"+this.settings.stageId);
			this.$scratchCanvasEl = $("#"+this.settings.scratchCanvasId);

			// Set canvas dimensions
			_setDimensions(this.$stageEl, { 
				width: this.settings.stageWidth,
				height: this.settings.stageHeight
			});
			_setDimensions(this.$scratchCanvasEl, { 
				width: this.settings.scratchCanvasWidth,
				height: this.settings.scratchCanvasHeight
			});

			// Assign shortcuts for stage objects and canvas contexts
			this.stage = this.getStage(this.$stageEl);
			this.stageContext = this.stage.canvas.getContext("2d");
			this.scratchCanvas = this.getStage(this.$scratchCanvasEl);
			this.scratchContext = this.scratchCanvas.canvas.getContext("2d");

			// Assign event handlers
			_addHandler.call(this, "image:loaded", this.settings.onLoad);
			_addHandler.call(this, "image:loadError", this.settings.onLoadError);
			_addHandler.call(this, "image:effectError", this.settings.onEffectError);

			// Wait for plugin to completely initialize before checking for image
			setTimeout(_checkImageLoaded.bind(this));

		}
	};

	$.fn[ pluginName ] = function ( options ) {
		this.each(function() {
			if ( !$.data( this, "plugin_" + pluginName ) ) {
				$.data( this, "plugin_" + pluginName, new Plugin( this, options ) );
			}
		});
		return this;
	};

})( jQuery, window, document );