/*!
    shootdown
    v0.0.1
    built 2015-04-16
    
    Copyright (c) 2015 Jeremy Osborne <jeremywosborne@gmail.com>
    Licensed MIT 
 */
(function() {
    /*
     * Check for features that we need in the browser, and fail
     * out if we fail these checks.
     */
    try {
        if (!document.querySelector) {
            throw new Error();
        }
        if (!document.createElement("canvas").getContext) {
            throw new Error();
        }
        if (!Array.prototype.filter) {
            throw new Error();
        }
    }
    catch(err) {
        alert("This game will likely not work on your browser. Please consider upgrading to a newer browser like Google Chrome or Mozilla Firefox.");
    }
})();
;/*!
    dasspiel
    v0.0.1
    built 2013-04-15
    
    Copyright (c) 2013 Jeremy Osborne <jeremywosborne@gmail.com>
    Licensed MIT 
 */
 /*
  * Copyright (c) 2010 James Brantly
  *
  * Permission is hereby granted, free of charge, to any person
  * obtaining a copy of this software and associated documentation
  * files (the "Software"), to deal in the Software without
  * restriction, including without limitation the rights to use,
  * copy, modify, merge, publish, distribute, sublicense, and/or sell
  * copies of the Software, and to permit persons to whom the
  * Software is furnished to do so, subject to the following
  * conditions:
  *
  * The above copyright notice and this permission notice shall be
  * included in all copies or substantial portions of the Software.
  *
  * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
  * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
  * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
  * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
  * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
  * OTHER DEALINGS IN THE SOFTWARE.
  */

(function(globalFunctionEval) {

    var Yabble = function() {
        throw "Synchronous require() is not supported.";
    };

    Yabble.unit = {};

    var _moduleRoot = '',
        _modules,
        _callbacks,
        _fetchFunc,
        _timeoutLength = 20000,
        _mainProgram;

    var isWebWorker = this.importScripts !== undefined;


    var head = !isWebWorker && document.getElementsByTagName('head')[0];

    // Shortcut to native hasOwnProperty
    var hasOwnProperty = Object.prototype.hasOwnProperty;

    // A for..in implementation which uses hasOwnProperty and fixes IE non-enumerable issues
    if ((function() {for (var prop in {hasOwnProperty: true}) { return prop; }})() == 'hasOwnProperty') {
        var forIn = function(obj, func, ctx) {
            for (var prop in obj) {
                if (hasOwnProperty.call(obj, prop)) {
                    func.call(ctx, prop);
                }
            }
        };
    }
    else {
        var ieBadProps = [
          'isPrototypeOf',
          'hasOwnProperty',
          'toLocaleString',
          'toString',
          'valueOf'
        ];

        var forIn = function(obj, func, ctx) {
            for (var prop in obj) {
                if (hasOwnProperty.call(obj, prop)) {
                    func.call(ctx, prop);
                }
            }

            for (var i = ieBadProps.length; i--;) {
                var prop = ieBadProps[i];
                if (hasOwnProperty.call(obj, prop)) {
                    func.call(ctx, prop);
                }
            }
        };
    }

    // Array convenience functions
    var indexOf = function(arr, val) {
        for (var i = arr.length; i--;) {
            if (arr[i] == val) { return i; }
        }
        return -1;
    };

    var removeWhere = function(arr, func) {
        var i = 0;
        while (i < arr.length) {
            if (func.call(null, arr[i], i) === true) {
                arr.splice(i, 1);
            }
            else {
                i++;
            }
        }
    };

    var combinePaths = function(relPath, refPath) {
        var relPathParts = relPath.split('/');
        refPath = refPath || '';
        if (refPath.length && refPath.charAt(refPath.length-1) != '/') {
            refPath += '/';
        }
        var refPathParts = refPath.split('/');
        refPathParts.pop();
        var part;
        while (part = relPathParts.shift()) {
            if (part == '.') { continue; }
            else if (part == '..'
                && refPathParts.length
                && refPathParts[refPathParts.length-1] != '..') { refPathParts.pop(); }
            else { refPathParts.push(part); }
        }
        return refPathParts.join('/');
    };

    // Takes a relative path to a module and resolves it according to the reference path
    var resolveModuleId = Yabble.unit.resolveModuleId = function(relModuleId, refPath) {
        if (relModuleId.charAt(0) != '.') {
            return relModuleId;
        }
        else {
            return combinePaths(relModuleId, refPath);
        }
    };

    // Takes a module's ID and resolves a URI according to the module root path
    var resolveModuleUri = function(moduleId) {
        if (moduleId.charAt(0) != '.') {
            return _moduleRoot+moduleId+'.js';
        }
        else {
            return this._resolveModuleId(moduleId, _moduleRoot)+'.js';
        }
    };

    // Returns a module object from the module ID
    var getModule = function(moduleId) {
        if (!hasOwnProperty.call(_modules, moduleId)) {
            return null;
        }
        return _modules[moduleId];
    };

    // Adds a callback which is executed when all deep dependencies are loaded
    var addCallback = function(deps, cb) {
        _callbacks.push([deps.slice(0), cb]);
    };

    // Generic implementation of require.ensure() which takes a reference path to
    // use when resolving relative module IDs
    var ensureImpl = function(deps, cb, refPath) {
        var unreadyModules = [];

        for (var i = deps.length; i--;) {
            var moduleId = resolveModuleId(deps[i], refPath),
                module = getModule(moduleId);

            if (!areDeepDepsDefined(moduleId)) {
                unreadyModules.push(moduleId);
            }
        }

        if (unreadyModules.length) {
            addCallback(unreadyModules, function() {
                cb(createRequireFunc(refPath));
            });
            queueModules(unreadyModules);
        }
        else {
            setTimeout(function() {
                cb(createRequireFunc(refPath));
            }, 0);
        }
    };

    // Creates a require function that is passed into module factory functions
    // and require.ensure() callbacks. It is bound to a reference path for
    // relative require()s
    var createRequireFunc = function(refPath) {
        var require = function(relModuleId) {
            var moduleId = resolveModuleId(relModuleId, refPath),
                module = getModule(moduleId);

            if (!module) {
                throw "Module not loaded";
            }
            else if (module.error) {
                throw "Error loading module";
            }

            if (!module.exports) {
                module.exports = {};
                var moduleDir = moduleId.substring(0, moduleId.lastIndexOf('/')+1),
                    injects = module.injects,
                    args = [];

                for (var i = 0, n = injects.length; i<n; i++) {
                    if (injects[i] == 'require') {
                        args.push(createRequireFunc(moduleDir));
                    }
                    else if (injects[i] == 'exports') {
                        args.push(module.exports);
                    }
                    else if (injects[i] == 'module') {
                        args.push(module.module);
                    }
                }

                module.factory.apply(null, args);
            }
            return module.exports;
        };

        require.ensure = function(deps, cb) {
            ensureImpl(deps, cb, refPath);
        };

        if (_mainProgram != null) {
            require.main = getModule(_mainProgram).module;
        }

        return require;
    };

    // Begins loading modules asynchronously
    var queueModules = function(moduleIds) {
        for (var i = moduleIds.length; i--;) {
            var moduleId = moduleIds[i],
                module = getModule(moduleId);

            if (module == null) {
                module = _modules[moduleId] = {};
                _fetchFunc(moduleId);
            }
        }
    };

    // Returns true if all deep dependencies are satisfied (in other words,
    // can more or less safely run the module factory function)
    var areDeepDepsDefined = function(moduleId) {
        var visitedModules = {};
        var recurse = function(moduleId) {
            if (visitedModules[moduleId] == true) { return true; }
            visitedModules[moduleId] = true;
            var module = getModule(moduleId);
            if (!module || !module.defined) { return false; }
            else {
                var deps = module.deps || [];
                for (var i = deps.length; i--;) {
                    if (!recurse(deps[i])) {
                        return false;
                    }
                }
                return true;
            }
        };
        return recurse(moduleId);
    };

    // Checks dependency callbacks and fires as necessary
    var fireCallbacks = function() {
        var i = 0;
        while (i<_callbacks.length) {
            var deps = _callbacks[i][0],
                func = _callbacks[i][1],
                n = 0;
            while (n<deps.length) {
                if (areDeepDepsDefined(deps[n])) {
                    deps.splice(n, 1);
                }
                else {
                    n++;
                }
            }
            if (!deps.length) {
                _callbacks.splice(i, 1);
                if (func != null) {
                    setTimeout(func, 0);
                }
            }
            else {
                i++;
            }
        }
    };

    // Load an unwrapped module using XHR and eval()
    var loadModuleByEval = _fetchFunc = function(moduleId) {
        var timeoutHandle;

        var errorFunc = function() {
            var module = getModule(moduleId);
            if (!module.defined) {
                module.defined = module.error = true;
                fireCallbacks();
            }
        };

        var xhr = this.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
        var moduleUri = resolveModuleUri(moduleId);
        xhr.open('GET', moduleUri, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                clearTimeout(timeoutHandle);
                if (xhr.status == 200 || xhr.status === 0) {
                    var moduleCode = xhr.responseText,
                        deps = determineShallowDependencies(moduleCode),
                        moduleDir = moduleId.substring(0, moduleId.lastIndexOf('/')+1),
                        moduleDefs = {};
                    for (var i = deps.length; i--;) {
                        deps[i] = resolveModuleId(deps[i], moduleDir);
                    }
                    try {
                        moduleDefs[moduleId] = globalFunctionEval('\r\n' + moduleCode + '\r\n');
                    } catch (e) {
                        if (e instanceof SyntaxError) {
                            var msg = 'Syntax Error: ';
                            if (e.lineNumber) {
                                msg += 'line ' + (e.lineNumber - 581);
                            } else {
                                console.log('GameJs tip: use Firefox to see line numbers in Syntax Errors.');
                            }
                            msg += ' in file ' + moduleUri;
                            console.log(msg);
                        }
                        throw e;
                    }

                    Yabble.define(moduleDefs, deps);
                }
                else {
                    errorFunc();
                }
            }
        };

        timeoutHandle = setTimeout(errorFunc, _timeoutLength);

        xhr.send(null);
    };

    // Used by loadModuleByEval and by the packager. Determines shallow dependencies of
    // a module via static analysis. This can currently break with require.ensure().
    var determineShallowDependencies = Yabble.unit.determineShallowDependencies = function(moduleCode) {
        // TODO: account for comments
        var deps = {}, match, unique = {};

        var requireRegex = /(?:^|[^\w\$_.])require\s*\(\s*("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')\s*\)/g;
        while (match = requireRegex.exec(moduleCode)) {
            var module = eval(match[1]);
            if (!hasOwnProperty.call(deps, module)) {
                deps[module] = true;
            }
        }

        var ensureRegex = /(?:^|[^\w\$_.])require.ensure\s*\(\s*(\[("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|\s*|,)*\])/g;
        while (match = ensureRegex.exec(moduleCode)) {
            var moduleArray = eval(match[1]);
            for (var i = moduleArray.length; i--;) {
                var module = moduleArray[i];
                delete deps[module];
            }
        }

        var depsArray = [];
        forIn(deps, function(module) {
            depsArray.push(module);
        });

        return depsArray;
    };

    // Load a wrapped module via script tags
    var loadModuleByScript = function(moduleId) {
        var scriptEl = document.createElement('script');
        scriptEl.type = 'text/javascript';
        scriptEl.src = resolveModuleUri(moduleId);

        var useStandard = !!scriptEl.addEventListener,
            timeoutHandle;

        var errorFunc = function() {
            postLoadFunc(false);
        };

        var loadFunc = function() {
            if (useStandard || (scriptEl.readyState == 'complete' || scriptEl.readyState == 'loaded')) {
                postLoadFunc(getModule(moduleId).defined);
            }
        };

        var postLoadFunc = function(loaded) {
            clearTimeout(timeoutHandle);

            if (useStandard) {
                scriptEl.removeEventListener('load', loadFunc, false);
                scriptEl.removeEventListener('error', errorFunc, false);
            }
            else {
                scriptEl.detachEvent('onreadystatechange', loadFunc);
            }

            if (!loaded) {
                var module = getModule(moduleId);
                if (!module.defined) {
                    module.defined = module.error = true;
                    fireCallbacks();
                }
            }
        };

        if (useStandard) {
            scriptEl.addEventListener('load', loadFunc, false);
            scriptEl.addEventListener('error', errorFunc, false);
        }
        else {
            scriptEl.attachEvent('onreadystatechange', loadFunc);
        }

        timeoutHandle = setTimeout(errorFunc, _timeoutLength);

        head.appendChild(scriptEl);
    };

    var normalizeTransport = function() {
        var transport = {modules: []};
        var standardInjects = ['require', 'exports', 'module'];
        if (typeof arguments[0] == 'object') { // Transport/D
            transport.deps = arguments[1] || [];
            var moduleDefs = arguments[0];
            forIn(moduleDefs, function(moduleId) {
                var module = {
                    id: moduleId
                };

                if (typeof moduleDefs[moduleId] == 'function') {
                    module.factory = moduleDefs[moduleId];
                    module.injects = standardInjects;
                }
                else {
                    module.factory = moduleDefs[moduleId].factory;
                    module.injects = moduleDefs[moduleId].injects || standardInjects;
                }
                transport.modules.push(module);
            });
        }
        else { // Transport/C
            transport.deps = arguments[1].slice(0);
            removeWhere(transport.deps, function(dep) {
                return indexOf(standardInjects, dep) >= 0;
            });

            transport.modules.push({
                id: arguments[0],
                factory: arguments[2],
                injects: arguments[1]
            });
        }
        return transport;
    };

    // Set the uri which forms the conceptual module namespace root
    Yabble.setModuleRoot = function(path) {
        if (this.window && !(/^http(s?):\/\//.test(path))) {
            var href = window.location.href;
            href = href.substr(0, href.lastIndexOf('/')+1);
            path = combinePaths(path, href);
        }

        if (path.length && path.charAt(path.length-1) != '/') {
            path += '/';
        }

        _moduleRoot = path;
    };
    Yabble.getModuleRoot = function() {
       return _moduleRoot;
    }
    // Set a timeout period for async module loading
    Yabble.setTimeoutLength = function(milliseconds) {
        _timeoutLength = milliseconds;
    };

    // Use script tags with wrapped code instead of XHR+eval()
    Yabble.useScriptTags = function() {
        _fetchFunc = loadModuleByScript;
    };

    // Define a module per various transport specifications
    Yabble.def = Yabble.define = function() {
        var transport = normalizeTransport.apply(null, arguments);

        var unreadyModules = [],
            definedModules = [];

        var deps = transport.deps;

        for (var i = transport.modules.length; i--;) {
            var moduleDef = transport.modules[i],
                moduleId = moduleDef.id,
                module = getModule(moduleId);

            if (!module) {
                module = _modules[moduleId] = {};
            }
            module.module = {
                id: moduleId,
                uri: resolveModuleUri(moduleId)
            };

            module.defined = true;
            module.deps = deps.slice(0);
            module.injects = moduleDef.injects;
            module.factory = moduleDef.factory;
            definedModules.push(module);
        }

        for (var i = deps.length; i--;) {
            var moduleId = deps[i],
                module = getModule(moduleId);

            if (!module || !areDeepDepsDefined(moduleId)) {
                unreadyModules.push(moduleId);
            }
        }

        if (unreadyModules.length) {
            setTimeout(function() {
                queueModules(unreadyModules);
            }, 0);
        }

        fireCallbacks();
    };

    Yabble.isKnown = function(moduleId) {
        return getModule(moduleId) != null;
    };

    Yabble.isDefined = function(moduleId) {
        var module = getModule(moduleId);
        return !!(module && module.defined);
    };

    // Do an async lazy-load of modules
    Yabble.ensure = function(deps, cb) {
        ensureImpl(deps, cb, '');
    };

    // Start an application via a main program module
    Yabble.run = function(program, cb) {
        program = _mainProgram = resolveModuleId(program, '');
        Yabble.ensure([program], function(require) {
            require(program);
            if (cb != null) { cb(); }
        });
    };

    // Reset internal state. Used mostly for unit tests.
    Yabble.reset = function() {
        _mainProgram = null;
        _modules = {};
        _callbacks = [];

        // Built-in system module
        Yabble.define({
            'system': function(require, exports, module) {}
        });
    };

    Yabble.reset();

    // Export to the require global
    if (isWebWorker) {
        self.require = Yabble;
    } else {
        window.require = Yabble;
    }
})(function(code) {
   with (this.importScripts ? self : window) {
      return (new Function('require', 'exports', 'module', code));
   };
});
;/* This file has been generated by yabbler.js */
require.define({
"gamejs/display": function(require, exports, module) {
var Surface = require('../gamejs').Surface;

/**
 * @fileoverview Methods to create, access and manipulate the display Surface.
 *
 * @example
 * var display = gamejs.display.setMode([800, 600]);
 * // blit sunflower picture in top left corner of display
 * var sunflower = gamejs.image.load("images/sunflower");
 * display.blit(sunflower);
 *
 */

var CANVAS_ID = "gjs-canvas";
var LOADER_ID = "gjs-loader";
var SURFACE = null;

/**
 * Pass this flag to `gamejs.display.setMode(resolution, flags)` to disable
 * pixel smoothing; this is, for example, useful for retro-style, low resolution graphics
 * where you don't want the browser to smooth them when scaling & drawing.
 */
var DISABLE_SMOOTHING = exports.DISABLE_SMOOTHING = 2;

var _SURFACE_SMOOTHING = true;

/**
 * @returns {document.Element} the canvas dom element
 */
var getCanvas = function() {
   return document.getElementById(CANVAS_ID);
};

/**
 * Create the master Canvas plane.
 * @ignore
 */
exports.init = function() {
   // create canvas element if not yet present
   var jsGameCanvas = null;
   if ((jsGameCanvas = getCanvas()) === null) {
      jsGameCanvas = document.createElement("canvas");
      jsGameCanvas.setAttribute("id", CANVAS_ID);
      document.body.appendChild(jsGameCanvas);
   }
   // to be focusable, tabindex must be set
   jsGameCanvas.setAttribute("tabindex", 1);
   jsGameCanvas.focus();
   // remove loader if any;
   var $loader = document.getElementById('gjs-loader');
   if ($loader) {
      $loader.style.display = "none";
   }
   return;
};

/** @ignore **/
exports._hasFocus = function() {
   return document.activeElement == getCanvas();
}

/** @ignore **/
exports._isSmoothingEnabled = function() {
   return (_SURFACE_SMOOTHING === true);
}

/**
 * Set the width and height of the Display. Conviniently this will
 * return the actual display Surface - the same as calling [gamejs.display.getSurface()](#getSurface))
 * later on.
 * @param {Array} dimensions [width, height] of the display surface
 * @param {Number} flags currently only gamejs.display.DISABLE_SMOOTHING supported
 */
exports.setMode = function(dimensions, flags) {
   SURFACE = null;
   var canvas = getCanvas();
   canvas.width = dimensions[0];
   canvas.height = dimensions[1];
   _SURFACE_SMOOTHING = (flags !== DISABLE_SMOOTHING);
   return getSurface();
};

/**
 * Set the Caption of the Display (document.title)
 * @param {String} title the title of the app
 * @param {gamejs.Image} icon FIXME implement favicon support
 */
exports.setCaption = function(title, icon) {
   document.title = title;
};


/**
 * The Display (the canvas element) is most likely not in the top left corner
 * of the browser due to CSS styling. To calculate the mouseposition within the
 * canvas we need this offset.
 * @see gamejs/event
 * @ignore
 *
 * @returns {Array} [x, y] offset of the canvas
 */

exports._getCanvasOffset = function() {
   var boundRect = getCanvas().getBoundingClientRect();
   return [boundRect.left, boundRect.top];
};

/**
 * Drawing on the Surface returned by `getSurface()` will draw on the screen.
 * @returns {gamejs.Surface} the display Surface
 */
var getSurface = exports.getSurface = function() {
   if (SURFACE === null) {
      var canvas = getCanvas();
      SURFACE = new Surface([canvas.clientWidth, canvas.clientHeight]);
      SURFACE._canvas = canvas;
      SURFACE._context = canvas.getContext('2d');
   }
   return SURFACE;
};

}}, ["gamejs"]);/* This file has been generated by yabbler.js */
require.define({
"gamejs/draw": function(require, exports, module) {
/**
 * @fileoverview Utilities for drawing geometrical objects to Surfaces. If you want to put images on
 * the screen see gamejs/image.
 *
 * There are several ways to specify colors. Whenever the docs says "valid #RGB string"
 * you can pass in any of the following formats.
 *
 *
 * @example
 *     "#ff00ff"
 *     "rgb(255, 0, 255)"
 *     "rgba(255,0, 255, 1)"
 * @see gamejs/image
 */

// FIXME all draw functions must return a minimal rect containing the drawn shape

/**
 * @param {gamejs.Surface} surface the Surface to draw on
 * @param {String} color valid #RGB string, e.g., "#ff0000"
 * @param {Array} startPos [x, y] position of line start
 * @param {Array} endPos [x, y] position of line end
 * @param {Number} width of the line, defaults to 1
 */
exports.line = function(surface, color, startPos, endPos, width) {
   var ctx = surface.context;
   ctx.save();
   ctx.beginPath();
   ctx.strokeStyle = color;
   ctx.lineWidth = width || 1;
   ctx.moveTo(startPos[0], startPos[1]);
   ctx.lineTo(endPos[0], endPos[1]);
   ctx.stroke();
   ctx.restore();
   return;
};

/**
 * Draw connected lines. Use this instead of indiviudal line() calls for
 * better performance
 *
 * @param {gamejs.Surface} surface the Surface to draw on
 * @param {String} color a valid #RGB string, "#ff0000"
 * @param {Boolean} closed if true the last and first point are connected
 * @param {Array} pointlist holding array [x,y] arrays of points
 * @param {Number} width width of the lines, defaults to 1
 */
exports.lines = function(surface, color, closed, pointlist, width) {
   closed = closed || false;
   var ctx = surface.context;
   ctx.save();
   ctx.beginPath();
   ctx.strokeStyle = ctx.fillStyle = color;
   ctx.lineWidth = width || 1;
   pointlist.forEach(function(point, idx) {
      if (idx === 0) {
         ctx.moveTo(point[0], point[1]);
      } else {
         ctx.lineTo(point[0], point[1]);
      }
   });
   if (closed) {
      ctx.lineTo(pointlist[0][0], pointlist[0][1]);
   }
   ctx.stroke();
   ctx.restore();
   return;
};

/**
 * Draw a circle on Surface
 *
 * @param {gamejs.Surface} surface the Surface to draw on
 * @param {String} color a valid #RGB String, #ff00cc
 * @param {Array} pos [x, y] position of the circle center
 * @param {Number} radius of the circle
 * @param {Number} width width of the circle, if not given or 0 the circle is filled
 */
exports.circle = function(surface, color, pos, radius, width) {
   if (!radius) {
      throw new Error('[circle] radius required argument');
   }
   if (!pos || !(pos instanceof Array)) {
      throw new Error('[circle] pos must be given & array' + pos);
   }

   var ctx = surface.context;
   ctx.save();
   ctx.beginPath();
   ctx.strokeStyle = ctx.fillStyle = color;
   ctx.lineWidth = width || 1;
   ctx.arc(pos[0], pos[1], radius, 0, 2*Math.PI, true);
   if (width === undefined || width === 0) {
      ctx.fill();
   } else {
      ctx.stroke();
   }
   ctx.restore();
   return;
};

/**
 * @param {gamejs.Surface} surface the Surface to draw on
 * @param {String} color a valid #RGB String, #ff00cc
 * @param {gamejs.Rect} rect the position and dimension attributes of this Rect will be used
 * @param {Number} width the width of line drawing the Rect, if 0 or not given the Rect is filled.
 */
exports.rect = function(surface, color, rect, width) {
   var ctx =surface.context;
   ctx.save();
   ctx.beginPath();
   ctx.strokeStyle = ctx.fillStyle = color;
   if (isNaN(width) || width === 0) {
      ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
   } else {
      ctx.lineWidth = width || 1;
      ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
   }
   ctx.restore();
};

/**
 * @param {gamejs.Surface} surface the Surface to draw on
 * @param {String} color a valid #RGB String, #ff00cc
 * @param {gamejs.Rect} rect the position and dimension attributes of this Rect will be used
 * @param {Number} startAngle
 * @param {Number} stopAngle
 * @param {Number} width the width of line, if 0 or not given the arc is filled.
 */
exports.arc= function(surface, color, rect, startAngle, stopAngle, width) {
   var ctx = surface.context;
   ctx.save();
   ctx.beginPath();
   ctx.strokeStyle = ctx.fillStyle = color;
   ctx.arc(rect.center[0], rect.center[1],
            rect.width/2,
            startAngle * (Math.PI/180), stopAngle * (Math.PI/180),
            false
         );
   if (isNaN(width) || width === 0) {
      ctx.fill();
   } else {
      ctx.lineWidth = width || 1;
      ctx.stroke();
   }
   ctx.restore();
};

/**
 * Draw a polygon on the surface. The pointlist argument are the vertices
 * for the polygon.
 *
 * @param {gamejs.Surface} surface the Surface to draw on
 * @param {String} color a valid #RGB String, #ff00cc
 * @param {Array} pointlist array of vertices [x, y] of the polygon
 * @param {Number} width the width of line, if 0 or not given the polygon is filled.
 */
exports.polygon = function(surface, color, pointlist, width) {
   var ctx = surface.context;
   ctx.save();
   ctx.fillStyle = ctx.strokeStyle = color;
   ctx.beginPath();
   pointlist.forEach(function(point, idx) {
      if (idx == 0) {
         ctx.moveTo(point[0], point[1]);
      } else {
         ctx.lineTo(point[0], point[1]);
      }
   });
   ctx.closePath();
   if (isNaN(width) || width === 0) {
      ctx.fill();
   } else {
      ctx.lineWidth = width || 1;
      ctx.stroke();
   }
   ctx.restore();
};

}}, []);/* This file has been generated by yabbler.js */
require.define({
"gamejs/event": function(require, exports, module) {
var display = require('./display');
var gamejs = require('../gamejs');
/**
 * @fileoverview Methods for polling mouse and keyboard.
 *
 * Call `gamejs.event.get()` in your main loop to get a list of events that happend
 * since your last call.
 *
 * Note that some events, which would trigger a default browser action, are prevented
 * from triggering their default behaviour if and only if the game's display canvas has
 * focus (the game gets focus if the user clicked on the game).
 *
 * All events have a type identifier. This event type is in between the values
 * of NOEVENT and NUMEVENTS. Each event has a constant in `gamejs.event.*`
 * All user defined events can have the value of USEREVENT or higher.
 * Make sure your custom event ids* follow this system.
 *
 * A pattern for using the event loop: your main game function (tick in this example)
 * is being called by [gamejs.time.interval()](../time/#interval).
 * Inside tick we call [gamejs.event.get()](#get) for a list of events that happened since the last
 * tick and we loop over each event and act on the event properties.
 *
 * @example
 *     var events = gamejs.event.get()
 *     events.forEach(function(event) {
 *        if (event.type === gamejs.event.MOUSE_UP) {
 *          gamejs.log(event.pos, event.button);
 *        } else if (event.type === gamejs.event.KEY_UP) {
 *          gamejs.log(event.key);
 *        }
 *     });
 *
 */
// key constants
exports.K_UP = 38;
exports.K_DOWN = 40;
exports.K_RIGHT = 39;
exports.K_LEFT = 37;

exports.K_SPACE = 32;
exports.K_BACKSPACE = 8;
exports.K_TAB = 9;
exports.K_ENTER = 13;
exports.K_SHIFT = 16;
exports.K_CTRL = 17;
exports.K_ALT = 18;
exports.K_ESC = 27;

exports.K_0 = 48;
exports.K_1 = 49;
exports.K_2 = 50;
exports.K_3 = 51;
exports.K_4 = 52;
exports.K_5 = 53;
exports.K_6 = 54;
exports.K_7 = 55;
exports.K_8 = 56;
exports.K_9 = 57;
exports.K_a = 65;
exports.K_b = 66;
exports.K_c = 67;
exports.K_d = 68;
exports.K_e = 69;
exports.K_f = 70;
exports.K_g = 71;
exports.K_h = 72;
exports.K_i = 73;
exports.K_j = 74;
exports.K_k = 75;
exports.K_l = 76;
exports.K_m = 77;
exports.K_n = 78;
exports.K_o = 79;
exports.K_p = 80;
exports.K_q = 81;
exports.K_r = 82;
exports.K_s = 83;
exports.K_t = 84;
exports.K_u = 85;
exports.K_v = 86;
exports.K_w = 87;
exports.K_x = 88;
exports.K_y = 89;
exports.K_z = 90;

exports.K_KP1 = 97;
exports.K_KP2 = 98;
exports.K_KP3 = 99;
exports.K_KP4 = 100;
exports.K_KP5 = 101;
exports.K_KP6 = 102;
exports.K_KP7 = 103;
exports.K_KP8 = 104;
exports.K_KP9 = 105;

// event type constants
exports.NOEVENT = 0
exports.NUMEVENTS = 32000

exports.QUIT = 0;
exports.KEY_DOWN = 1;
exports.KEY_UP = 2;
exports.MOUSE_MOTION = 3;
exports.MOUSE_UP = 4;
exports.MOUSE_DOWN = 5;
exports.MOUSE_WHEEL = 6;
exports.USEREVENT = 2000;

exports.WORKER = 1000;
exports.WORKER_RESULT = 1001;
/** @ignore **/
exports.WORKER_ERROR = 1002;
/** @ignore **/
exports.WORKER_ALIVE = 1003;
/** @ignore **/
exports.WORKER_LOG = 1004;

var QUEUE = [];

/**
 * Get all events from the event queue
 * @returns {Array}
 */
exports.get = function(eventTypes) {
  if (eventTypes === undefined) {
    return QUEUE.splice(0, QUEUE.length);
  } else {
    if (! (eventTypes instanceof Array)) {
      eventTypes = [eventTypes];
    }
    var result = [];
    QUEUE = QUEUE.filter(function(event) {
      if (eventTypes.indexOf(event.type) === -1) {
        return true;
      }
      result.push(event)
      return false;
    })
    return result;
  }
};

/**
 * Get the newest event of the event queue
 * @returns {gamejs.event.Event}
 */
exports.poll = function() {
   return QUEUE.pop();
};

/**
 * Post an event to the event queue.
 * @param {gamejs.event.Event} userEvent the event to post to the queue
 */
exports.post = function(userEvent) {
   if (userEvent.type === exports.WORKER_RESULT && gamejs.worker.inWorker === true) {
      gamejs.worker._messageMain(userEvent);
   } else if (userEvent.type === exports.WORKER && gamejs.worker.inWorker === false) {
      if (!userEvent.worker || !userEvent.worker.post) {
         throw new Error('Missing "worker" property on event');
      }
      userEvent.worker.post(userEvent.data);
   } else {
      QUEUE.push(userEvent);
   }
   return;
};

/**
 * Remove all events from the queue
 */
exports.clear = function() {
   QUEUE = [];
};

/**
 * Holds all information about an event.
 * @class
 */

exports.Event = function() {
    /**
     * The type of the event. e.g., gamejs.event.QUIT, KEYDOWN, MOUSEUP.
     */
    this.type = null;
    /**
     * key the keyCode of the key. compare with gamejs.event.K_a, gamejs.event.K_b,...
     */
    this.key = null;
    /**
     * relative movement for a mousemove event
     */
    this.rel = null;
    /**
     * the number of the mousebutton pressed
     */
    this.button = null;
    /**
     * pos the position of the event for mouse events
     */
    this.pos = null;
};

/**
 * @ignore
 */
exports.init = function() {

   var lastPos = [];

   // anonymous functions as event handlers = memory leak, see MDC:elementAddEventListener

   function onMouseDown (ev) {
      var canvasOffset = display._getCanvasOffset();
      QUEUE.push({
         'type': gamejs.event.MOUSE_DOWN,
         'pos': [ev.clientX - canvasOffset[0], ev.clientY - canvasOffset[1]],
         'button': ev.button,
         'shiftKey': ev.shiftKey,
         'ctrlKey': ev.ctrlKey,
         'metaKey': ev.metaKey
      });
   }

   function onMouseUp (ev) {
      var canvasOffset = display._getCanvasOffset();
      QUEUE.push({
         'type':gamejs.event.MOUSE_UP,
         'pos': [ev.clientX - canvasOffset[0], ev.clientY - canvasOffset[1]],
         'button': ev.button,
         'shiftKey': ev.shiftKey,
         'ctrlKey': ev.ctrlKey,
         'metaKey': ev.metaKey
      });
   }

   function onKeyDown (ev) {
      var key = ev.keyCode || ev.which;
      QUEUE.push({
         'type': gamejs.event.KEY_DOWN,
         'key': key,
         'shiftKey': ev.shiftKey,
         'ctrlKey': ev.ctrlKey,
         'metaKey': ev.metaKey
      });

      // if the display has focus, we surpress default action
      // for most keys
      if (display._hasFocus() && (!ev.ctrlKey && !ev.metaKey &&
         ((key >= exports.K_LEFT && key <= exports.K_DOWN) ||
         (key >= exports.K_0    && key <= exports.K_z) ||
         (key >= exports.K_KP1  && key <= exports.K_KP9) ||
         key === exports.K_SPACE ||
         key === exports.K_TAB ||
         key === exports.K_ENTER)) ||
         key === exports.K_ALT ||
         key === exports.K_BACKSPACE) {
        ev.preventDefault();
      }
   }

   function onKeyUp (ev) {
      QUEUE.push({
         'type': gamejs.event.KEY_UP,
         'key': ev.keyCode,
         'shiftKey': ev.shiftKey,
         'ctrlKey': ev.ctrlKey,
         'metaKey': ev.metaKey
      });
   }

   function onMouseMove (ev) {
      var canvasOffset = display._getCanvasOffset();
      var currentPos = [ev.clientX - canvasOffset[0], ev.clientY - canvasOffset[1]];
      var relativePos = [];
      if (lastPos.length) {
         relativePos = [
            lastPos[0] - currentPos[0],
            lastPos[1] - currentPos[1]
         ];
      }
      QUEUE.push({
         'type': gamejs.event.MOUSE_MOTION,
         'pos': currentPos,
         'rel': relativePos,
         'buttons': null, // FIXME, fixable?
         'timestamp': ev.timeStamp
      });
      lastPos = currentPos;
      return;
   }

   function onMouseScroll(ev) {
      var canvasOffset = display._getCanvasOffset();
      var currentPos = [ev.clientX - canvasOffset[0], ev.clientY - canvasOffset[1]];
      QUEUE.push({
         type: gamejs.event.MOUSE_WHEEL,
         pos: currentPos,
         delta: ev.detail || (- ev.wheelDeltaY / 40)
      });
      return;
   }

   function onBeforeUnload (ev) {
      QUEUE.push({
         'type': gamejs.event.QUIT
      });
      return;
   }

   // IEFIX does not support addEventListener on document itself
   // MOZFIX but in moz & opera events don't reach body if mouse outside window or on menubar
   var canvas = display.getSurface()._canvas;
   document.addEventListener('mousedown', onMouseDown, false);
   document.addEventListener('mouseup', onMouseUp, false);
   document.addEventListener('keydown', onKeyDown, false);
   document.addEventListener('keyup', onKeyUp, false);
   canvas.addEventListener('mousemove', onMouseMove, false);
   canvas.addEventListener('mousewheel', onMouseScroll, false);
   // MOZFIX
   // https://developer.mozilla.org/en/Code_snippets/Miscellaneous#Detecting_mouse_wheel_events
   canvas.addEventListener('DOMMouseScroll', onMouseScroll, false);
   canvas.addEventListener('beforeunload', onBeforeUnload, false);

};

}}, ["gamejs/display", "gamejs"]);/* This file has been generated by yabbler.js */
require.define({
"gamejs/font": function(require, exports, module) {
var Surface = require('../gamejs').Surface;
var objects = require('./utils/objects');

/**
 * @fileoverview Methods for creating Font objects which can render text
 * to a Surface.
 *
 * @example
 *     // create a font
 *     var font = new Font('20px monospace');
 *     // render text - this returns a surface with the text written on it.
 *     var helloSurface = font.render('Hello World')
 */

/**
 * Create a Font to draw on the screen. The Font allows you to
 * `render()` text. Rendering text returns a Surface which
 * in turn can be put on screen.
 *
 * @constructor
 * @property {Number} fontHeight the line height of this Font
 *
 * @param {String} fontSettings a css font definition, e.g., "20px monospace"
 * @param {STring} backgroundColor valid #rgb string, "#ff00cc"
 */
var Font = exports.Font = function(fontSettings, backgroundColor) {
    /**
     * @ignore
     */
   this.sampleSurface = new Surface([10,10]);
   this.sampleSurface.context.font = fontSettings;
   this.sampleSurface.context.textAlign = 'start';
   // http://diveintohtml5.org/canvas.html#text
   this.sampleSurface.context.textBaseline = 'bottom';
   this.backgroundColor = backgroundColor || false;
   return this;
};

/**
 * Returns a Surface with the given text on it.
 * @param {String} text the text to render
 * @param {String} color a valid #RGB String, "#ffcc00"
 * @returns {gamejs.Surface} Surface with the rendered text on it.
 */
Font.prototype.render = function(text, color) {
   var dims = this.size(text);
   var surface = new Surface(dims);
   var ctx = surface.context;
   ctx.save();
   if ( this.backgroundColor ) {
       ctx.fillStyle = this.backgroundColor;
       ctx.fillRect(0, 0, surface.rect.width, surface.rect.height);
   }
   ctx.font = this.sampleSurface.context.font;
   ctx.textBaseline = this.sampleSurface.context.textBaseline;
   ctx.textAlign = this.sampleSurface.context.textAlign;
   ctx.fillStyle = ctx.strokeStyle = color || "#000000";
   ctx.fillText(text, 0, surface.rect.height, surface.rect.width);
   ctx.restore();
   return surface;
};

/**
 * Determine the width and height of the given text if rendered
 * with this Font.
 * @param {String} text the text to measure
 * @returns {Array} the [width, height] of the text if rendered with this Font
 */
Font.prototype.size = function(text) {
   var metrics = this.sampleSurface.context.measureText(text);
   // FIXME measuretext is buggy, make extra wide
   return [metrics.width, this.fontHeight];
};

/**
 * Height of the font in pixels.
 */
objects.accessors(Font.prototype, {
   'fontHeight': {
      get: function() {
         // Returns an approximate line height of the text
         // »This version of the specification does not provide a way to obtain
         // the bounding box dimensions of the text.«
         // see http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#dom-context-2d-measuretext
         return this.sampleSurface.context.measureText('M').width * 1.5;
      }
   }

});

}}, ["gamejs", "gamejs/utils/objects"]);/* This file has been generated by yabbler.js */
require.define({
"gamejs/http": function(require, exports, module) {
/**
 * @fileoverview Make synchronous http requests to your game's serverside component.
 *
 * If you configure a ajax base URL you can make http requests to your
 * server using those functions.

 * The most high-level functions are `load()` and `save()` which take
 * and return a JavaScript object, which they will send to / recieve from
 * the server-side in JSON format.
 *
 * @example
 *
 *     <script>
 *     // Same Origin policy applies! You can only make requests
 *     // to the server from which the html page is served.
 *      var $g = {
 *         ajaxBaseHref: "http://the-same-server.com/ajax/"
 *      };
 *      </script>
 *      <script src="./public/gamejs-wrapped.js"></script>
 *      ....
 *      typeof gamejs.load('userdata/') === 'object'
 *      typeof gamejs.get('userdata/') === 'string'
 *      ...
 *
 */

/**
 * Response object returned by http functions `get` and `post`. This
 * class is not instantiable.
 *
 * @param{String} responseText
 * @param {String} responseXML
 * @param {Number} status
 * @param {String} statusText
 */
exports.Response = function() {
   /**
    * @param {String} header
    */
   this.getResponseHeader = function(header)  {
   };
   throw new Error('response class not instantiable');
};

/**
 * Make http request to server-side
 * @param {String} method http method
 * @param {String} url
 * @param {String|Object} data
 * @param {String|Object} type "Accept" header value
 * @return {Response} response
 */
var ajax = exports.ajax = function(method, url, data, type) {
   data = data || null;
   var response = new XMLHttpRequest();
   response.open(method, url, false);
   if (type) {
      response.setRequestHeader("Accept", type);
   }
   if (data instanceof Object) {
      data = JSON.stringify(data);
      response.setRequestHeader('Content-Type', 'application/json');
   }
   response.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
   response.send(data);
   return response;
};

/**
 * Make http GET request to server-side
 * @param {String} url
 */
var get = exports.get = function(url) {
   return ajax('GET', url);
};

/**
 * Make http POST request to server-side
 * @param {String} url
 * @param {String|Object} data
 * @param {String|Object} type "Accept" header value
 * @returns {Response}
 */
var post = exports.post = function(url, data, type) {
   return ajax('POST', url, data, type);
};

function stringify(response) {
   // eval is evil
   return eval('(' + response.responseText + ')');
}

function ajaxBaseHref() {
    return (window.$g && window.$g.ajaxBaseHref) || './';
}

/**
 * Load an object from the server-side.
 * @param {String} url
 * @return {Object} the object loaded from the server
 */
exports.load = function(url) {
   return stringify(get(ajaxBaseHref() + url));
};

/**
 * Send an object to a server-side function.
 * @param {String} url
 * @param {String|Object} data
 * @param {String|Object} type "Accept" header value
 * @returns {Object} the response object
 */
exports.save = function(url, data, type) {
   return stringify(post(ajaxBaseHref() + url, {payload: data}, type));
};

}}, []);/* This file has been generated by yabbler.js */
require.define({
"gamejs/image": function(require, exports, module) {
var gamejs = require('../gamejs');

/**
 * @fileoverview Load images as Surfaces.
 *
 * Sounds & Images are loaded relative to your game's html page
 * (the html which includes the GameJs code) or relative to the 
 * property `window.$g.resourceBaseHref`
 * if it is set.
 *
 *
 */

var CACHE = {};

/**
 * need to export preloading status for require
 * @ignore
 */
var _PRELOADING = false;

/**
 * Load image and return it on a Surface.
 *
 * All images must be preloaded before they can be used.
 * @example
 
 *     gamejs.preload(["./images/ship.png", "./images/sunflower.png"]);
 *     // ...later...
 *     display.blit(gamejs.image.load('images/ship.png'))
 *
 * @param {String|dom.Image} uriOrImage resource uri for image
 * @returns {gamejs.Surface} surface with the image on it.
 */
exports.load = function(key) {
   var img;
   if (typeof key === 'string') {
      img = CACHE[key];
      if (!img) {
         // TODO sync image loading
            throw new Error('Missing "' + key + '", gamejs.preload() all images before trying to load them.');
      }
   } else {
      img = key;
   }
   var canvas = document.createElement('canvas');
   // IEFIX missing html5 feature naturalWidth/Height
   canvas.width = img.naturalWidth || img.width;
   canvas.height = img.naturalHeight || img.height;
   var context = canvas.getContext('2d');
   context.drawImage(img, 0, 0);
   img.getSize = function() { return [img.naturalWidth, img.naturalHeight]; };
   var surface = new gamejs.Surface(img.getSize());
   // NOTE hack setting protected _canvas directly
   surface._canvas = canvas;
   surface._context = context;
   return surface;
};


/**
 * add all images on the currrent page into cache
 * @ignore
 */
exports.init = function() {
   return;
};

/**
 * preload the given img URIs
 * @returns {Function} which returns 0-1 for preload progress
 * @ignore
 */
exports.preload = function(imgIdents) {

   var countLoaded = 0;
   var countTotal = 0;

   function incrementLoaded() {
      countLoaded++;
      if (countLoaded == countTotal) {
         _PRELOADING = false;
      }
      if (countLoaded % 10 === 0) {
         gamejs.log('gamejs.image: preloaded  ' + countLoaded + ' of ' + countTotal);
      }
   }

   function getProgress() {
      return countTotal > 0 ? countLoaded / countTotal : 1;
   }

   function successHandler() {
      addToCache(this);
      incrementLoaded();
   }
   function errorHandler() {
      incrementLoaded();
      throw new Error('Error loading ' + this.src);
   }

   for (var key in imgIdents) {
      var lowerKey = key.toLowerCase();
      if (lowerKey.indexOf('.png') == -1 &&
            lowerKey.indexOf('.jpg') == -1 &&
            lowerKey.indexOf('.jpeg') == -1 &&
            lowerKey.indexOf('.svg') == -1 &&
            lowerKey.indexOf('.gif') == -1) {
         continue;
      }
      var img = new Image();
      img.addEventListener('load', successHandler, true);
      img.addEventListener('error', errorHandler, true);
      img.src = imgIdents[key];
      img.gamejsKey = key;
      countTotal++;
   }
   if (countTotal > 0) {
      _PRELOADING = true;
   }
   return getProgress;
};

/**
 * add the given <img> dom elements into the cache.
 * @private
 */
var addToCache = function(img) {
   CACHE[img.gamejsKey] = img;
   return;
};

}}, ["gamejs"]);/* This file has been generated by yabbler.js */
require.define({
"gamejs/mask": function(require, exports, module) {
var gamejs = require('../gamejs');
var objects = require('./utils/objects');

/**
 * @fileoverview Image masks. Usefull for pixel perfect collision detection.
 */

/**
 * Creates an image mask from the given Surface. The alpha of each pixel is checked
 * to see if it is greater than the given threshold. If it is greater then
 * that pixel is set as non-colliding.
 *
 * @param {gamejs.Surface} surface
 * @param {Number} threshold 0 to 255. defaults to: 255, fully transparent
 */
exports.fromSurface = function(surface, threshold) {
   threshold = threshold && (255 - threshold) || 255;
   var imgData = surface.getImageData().data;
   var dims = surface.getSize();
   var mask = new Mask(dims);
   for (var i=0;i<imgData.length;i += 4) {
      // y: pixel # / width
      var y = parseInt((i / 4) / dims[0], 10);
      // x: pixel # % width
      var x = parseInt((i / 4) % dims[0], 10);
      var alpha = imgData[i+3];
      if (alpha >= threshold) {
         mask.setAt(x, y);
      }
   }
   return mask;
};

/**
 * Image Mask
 * @param {Array} dimensions [width, height]
 *
 */
var Mask = exports.Mask = function(dims) {
   /**
    * @ignore
    */
   this.width = dims[0];
   /**
    * @ignore
    */
   this.height = dims[1];
   /**
    * @ignore
    */
   this._bits = [];
   for (var i=0;i<this.width;i++) {
      this._bits[i] = [];
      for (var j=0;j<this.height;j++) {
         this._bits[i][j] = false;
      }
   }
   return;
};

/**
 * @param {gamejs.mask.Mask} otherMask
 * @param {Array} offset [x,y]
 * @returns the overlapping rectangle or null if there is no overlap;
 */
Mask.prototype.overlapRect = function(otherMask, offset) {
   var arect = this.rect;
   var brect = otherMask.rect;
   if (offset) {
      brect.moveIp(offset);
   }
   // bounding box intersect
   if (!brect.collideRect(arect)) {
      return null;
   }
   var xStart = Math.max(arect.left, brect.left);
   var xEnd = Math.min(arect.right, brect.right);

   var yStart = Math.max(arect.top, brect.top);
   var yEnd = Math.min(arect.bottom, brect.bottom);

   return new gamejs.Rect([xStart, yStart], [xEnd - xStart, yEnd - yStart]);
};

/**
 *
 * @returns True if the otherMask overlaps with this map.
 * @param {Mask} otherMask
 * @param {Array} offset
 */
Mask.prototype.overlap = function(otherMask, offset) {
   var overlapRect = this.overlapRect(otherMask, offset);
   if (overlapRect === null) {
      return false;
   }

   var arect = this.rect;
   var brect = otherMask.rect;
   if (offset) {
      brect.moveIp(offset);
   }

   var count = 0;
   for (var y=overlapRect.top; y<=overlapRect.bottom; y++) {
      for (var x=overlapRect.left; x<=overlapRect.right; x++) {
         if (this.getAt(x - arect.left, y - arect.top) &&
             otherMask.getAt(x - brect.left, y - brect.top)) {
             return true;
         }
      }
   }
   // NOTE this should not happen because either we bailed out
   // long ago because the rects do not overlap or there is an
   // overlap and we should not have gotten this far.
   // throw new Error("Maks.overlap: overlap detected but could not create mask for it.");
   return false;
};

/**
 * @param {gamejs.mask.Mask} otherMask
 * @param {Array} offset [x,y]
 * @returns the number of overlapping pixels
 */
Mask.prototype.overlapArea = function(otherMask, offset) {
   var overlapRect = this.overlapRect(otherMask, offset);
   if (overlapRect === null) {
      return 0;
   }

   var arect = this.rect;
   var brect = otherMask.rect;
   if (offset) {
      brect.moveIp(offset);
   }

   var count = 0;
   for (var y=overlapRect.top; y<=overlapRect.bottom; y++) {
      for (var x=overlapRect.left; x<=overlapRect.right; x++) {
         if (this.getAt(x - arect.left, y - arect.top) &&
             otherMask.getAt(x - brect.left, y - brect.top)) {
             count++;
         }
      }
   }
   return count;
};

/**
 * @param {gamejs.mask.Mask} otherMask
 * @param {Array} offset [x,y]
 * @returns a mask of the overlapping pixels
 */
Mask.prototype.overlapMask = function(otherMask, offset) {
   var overlapRect = this.overlapRect(otherMask, offset);
   if (overlapRect === null) {
      return 0;
   }

   var arect = this.rect;
   var brect = otherMask.rect;
   if (offset) {
      brect.moveIp(offset);
   }

   var mask = new Mask([overlapRect.width, overlapRect.height]);
   for (var y=overlapRect.top; y<=overlapRect.bottom; y++) {
      for (var x=overlapRect.left; x<=overlapRect.right; x++) {
         if (this.getAt(x - arect.left, y - arect.top) &&
             otherMask.getAt(x - brect.left, y - brect.top)) {
             mask.setAt(x, y);
         }
      }
   }
   return mask;
};

/**
 * Set bit at position.
 * @param {Number} x
 * @param {Number} y
 */
Mask.prototype.setAt = function(x, y) {
   this._bits[x][y] = true;
};

/**
 * Get bit at position.
 *
 * @param {Number} x
 * @param {Number} y
 */
Mask.prototype.getAt = function(x, y) {
   x = parseInt(x, 10);
   y = parseInt(y, 10);
   if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return false;
   }
   return this._bits[x][y];
};


/**
 * Flip the bits in this map.
 */
Mask.prototype.invert = function() {
   this._bits = this._bits.map(function(row) {
      return row.map(function(b) {
         return !b;
      });
   });
};

/**
 * @returns {Array} the dimensions of the map
 */
Mask.prototype.getSize = function() {
   return [this.width, this.height];
};

objects.accessors(Mask.prototype, {
   /**
    * Rect of this Mask.
    */
   'rect': {
      get: function() {
         return new gamejs.Rect([0, 0], [this.width, this.height]);
      }
   },
   /**
    * @returns {Number} number of set pixels in this mask.
    */
   'length': {
      get: function() {
         var c = 0;
         this._bits.forEach(function(row) {
            row.forEach(function(b) {
               if (b) {
                  c++;
               }
            });
         });
         return c;
      }
   }
});

}}, ["gamejs", "gamejs/utils/objects"]);/* This file has been generated by yabbler.js */
require.define({
"gamejs/mixer": function(require, exports, module) {
var gamejs = require('../gamejs');

/**
 * @fileoverview Playing sounds with the html5 audio tag. Audio files must be preloaded
 * with the usual `gamejs.preload()` function. Ogg, wav and webm supported.
 *
 * Sounds & Images are loaded relative to './'.
 */

var CACHE = {};

/**
 * need to export preloading status for require
 * @ignore
 */
var _PRELOADING = false;

/**
 * @ignore
 */
var NUM_CHANNELS = 8;

/**
 * Sets the number of available channels for the mixer. The default value is 8.
 */
exports.setNumChannels = function(count) {
   NUM_CHANNELS = parseInt(count, 10) || NUM_CHANNELS;
};

exports.getNumChannels = function() {
   return NUM_CHANNELS;
};

/**
 * put all audios on page in cache
 * if same domain as current page, remove common href-prefix
 * @ignore
 */
exports.init = function() {
   var audios = Array.prototype.slice.call(document.getElementsByTagName("audio"), 0);
   addToCache(audios);
   return;
};

/**
 * Preload the audios into cache
 * @param {String[]} List of audio URIs to load
 * @returns {Function} which returns 0-1 for preload progress
 * @ignore
 */
exports.preload = function(audioUrls, showProgressOrImage) {
   var countTotal = 0;
   var countLoaded = 0;

   function incrementLoaded() {
      countLoaded++;
      if (countLoaded == countTotal) {
         _PRELOADING = false;
      }
   }

   function getProgress() {
      return countTotal > 0 ? countLoaded / countTotal : 1;
   }

   function successHandler() {
      addToCache(this);
      incrementLoaded();
   }
   function errorHandler() {
      incrementLoaded();
      throw new Error('Error loading ' + this.src);
   }

   for (var key in audioUrls) {
      if (key.indexOf('wav') == -1 && key.indexOf('ogg') == -1 && key.indexOf('webm') == -1) {
         continue;
      }
      countTotal++;
      var audio = new Audio();
      audio.addEventListener('canplay', successHandler, true);
      audio.addEventListener('error', errorHandler, true);
      audio.src = audioUrls[key];
      audio.gamejsKey = key;
      audio.load();
   }
   if (countTotal > 0) {
      _PRELOADING = true;
   }
   return getProgress;
};

/**
 * @ignore
 */
exports.isPreloading = function() {
   return _PRELOADING;
};

/**
 * @param {dom.ImgElement} audios the <audio> elements to put into cache
 * @ignore
 */
function addToCache(audios) {
   if (!(audios instanceof Array)) {
      audios = [audios];
   }

   var docLoc = document.location.href;
   audios.forEach(function(audio) {
      CACHE[audio.gamejsKey] = audio;
   });
   return;
}

/**
 * Sounds can be played back.
 * @constructor
 * @param {String|dom.AudioElement} uriOrAudio the uri of <audio> dom element
 *                of the sound
 */
exports.Sound = function Sound(uriOrAudio) {
   var cachedAudio;
   if (typeof uriOrAudio === 'string') {
      cachedAudio = CACHE[uriOrAudio];
   } else {
      cachedAudio = uriOrAudio;
   }
   if (!cachedAudio) {
      // TODO sync audio loading
      throw new Error('Missing "' + uriOrAudio + '", gamejs.preload() all audio files before loading');
   }

   var channels = [];
   var i = NUM_CHANNELS;
   while (i-->0) {
      var audio = new Audio();
      audio.preload = "auto";
      audio.loop = false;
      audio.src = cachedAudio.src;
      channels.push(audio);
   }
   /**
    * start the sound
    * @param {Boolean} loop whether the audio should loop for ever or not
    */
   this.play = function(loop) {
      channels.some(function(audio) {
         if (audio.ended || audio.paused) {
            audio.loop = !!loop;
            audio.play();
            return true;
         }
         return false;
      });
   };

   /**
    * Stop the sound.
    * This will stop the playback of this Sound on any active Channels.
    */
   this.stop = function() {
      channels.forEach(function(audio) {
         audio.stop();
      });
   };

   /**
    * Set volume of this sound
    * @param {Number} value volume from 0 to 1
    */
   this.setVolume = function(value) {
      channels.forEach(function(audio) {
         audio.volume = value;
      });
   };

   /**
    * @returns {Number} the sound's volume from 0 to 1
    */
   this.getVolume = function() {
      return channels[0].volume;
   };

   /**
    * @returns {Number} Duration of this sound in seconds
    */
   this.getLength = function() {
      return channels[0].duration;
   };

   return this;
};

}}, ["gamejs"]);/* This file has been generated by yabbler.js */
require.define({
"gamejs/noise": function(require, exports, module) {
/**
 * @fileoverview
 * A noise generator comparable to Perlin noise, which is useful
 * for generating procedural content.
 * @see gamejs/utils/prng
 */

// Ported to JS by by zz85 <https://github.com/zz85> from Stefan
// Gustavson's java implementation
// <http://staffwww.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf>
// Read Stefan's excellent paper for details on how this code works.
//
// Sean McCullough banksean@gmail.com

/**
 * This implementation provides 2D and 3D noise. You can optionally
 * pass a seedable pseudo-random number generator to its constructor. This
 * generator object is assumed to have a `random()` method; `Math` is used
 * per default.
 *
 * Also see `gamejs/utils/prng` for a seedable pseudo random number generator
 *
 * @param {Object} prng the random number generator to use; most provide `random()` method
 * @usage
 *  var simplex = new gamejs.noise.Simplex();
 *  simplex.get(x, y);
 *  // or for 3d noise
 *  simple.get(x, y, y);
 */
var Simplex = exports.Simplex = function(r) {
  if (r == undefined) r = Math;
  /** @ignore */
  this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
               [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
               [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
  /** @ignore */
  this.p = [];
  for (var i=0; i<256; i++) {
   this.p[i] = Math.floor(r.random()*256);
  }
  // To remove the need for index wrapping, double the permutation table length
  /** @ignore */
  this.perm = [];
  for(var i=0; i<512; i++) {
   this.perm[i]=this.p[i & 255];
   }

  // A lookup table to traverse the simplex around a given point in 4D.
  // Details can be found where this table is used, in the 4D noise method.
  /** @ignore */
  this.simplex = [
    [0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],
    [0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],
    [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],
    [1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],
    [1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],
    [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],
    [2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],
    [2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]];
};

/** @ignore */
Simplex.prototype.dot = function(g, x, y) {
   return g[0]*x + g[1]*y;
};

/**
 * @param {Number} x
 * @param {Number} y
 * @returns {Number} noise for given position, in range [-1, 1]
 */
Simplex.prototype.get = function(xin, yin) {
  var n0, n1, n2; // Noise contributions from the three corners
  // Skew the input space to determine which simplex cell we're in
  var F2 = 0.5*(Math.sqrt(3.0)-1.0);
  var s = (xin+yin)*F2; // Hairy factor for 2D
  var i = Math.floor(xin+s);
  var j = Math.floor(yin+s);
  var G2 = (3.0-Math.sqrt(3.0))/6.0;
  var t = (i+j)*G2;
  var X0 = i-t; // Unskew the cell origin back to (x,y) space
  var Y0 = j-t;
  var x0 = xin-X0; // The x,y distances from the cell origin
  var y0 = yin-Y0;
  // For the 2D case, the simplex shape is an equilateral triangle.
  // Determine which simplex we are in.
  var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
  if(x0>y0) {i1=1; j1=0;} // lower triangle, XY order: (0,0)->(1,0)->(1,1)
  else {i1=0; j1=1;} // upper triangle, YX order: (0,0)->(0,1)->(1,1)
  // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
  // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
  // c = (3-sqrt(3))/6
  var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
  var y1 = y0 - j1 + G2;
  var x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
  var y2 = y0 - 1.0 + 2.0 * G2;
  // Work out the hashed gradient indices of the three simplex corners
  var ii = i & 255;
  var jj = j & 255;
  var gi0 = this.perm[ii+this.perm[jj]] % 12;
  var gi1 = this.perm[ii+i1+this.perm[jj+j1]] % 12;
  var gi2 = this.perm[ii+1+this.perm[jj+1]] % 12;
  // Calculate the contribution from the three corners
  var t0 = 0.5 - x0*x0-y0*y0;
  if(t0<0) n0 = 0.0;
  else {
    t0 *= t0;
    n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0); // (x,y) of grad3 used for 2D gradient
  }
  var t1 = 0.5 - x1*x1-y1*y1;
  if(t1<0) n1 = 0.0;
  else {
    t1 *= t1;
    n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
  }
  var t2 = 0.5 - x2*x2-y2*y2;
  if(t2<0) n2 = 0.0;
  else {
    t2 *= t2;
    n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
  }
  // Add contributions from each corner to get the final noise value.
  // The result is scaled to return values in the interval [-1,1].
  return 70.0 * (n0 + n1 + n2);
};


/**
 * @param {Number} x
 * @param {Number} y
 * @param {Number} y
 * @returns {Number} noise for given position, in range [-1, 1]
 */
Simplex.prototype.get3d = function(xin, yin, zin) {
  var n0, n1, n2, n3; // Noise contributions from the four corners
  // Skew the input space to determine which simplex cell we're in
  var F3 = 1.0/3.0;
  var s = (xin+yin+zin)*F3; // Very nice and simple skew factor for 3D
  var i = Math.floor(xin+s);
  var j = Math.floor(yin+s);
  var k = Math.floor(zin+s);
  var G3 = 1.0/6.0; // Very nice and simple unskew factor, too
  var t = (i+j+k)*G3;
  var X0 = i-t; // Unskew the cell origin back to (x,y,z) space
  var Y0 = j-t;
  var Z0 = k-t;
  var x0 = xin-X0; // The x,y,z distances from the cell origin
  var y0 = yin-Y0;
  var z0 = zin-Z0;
  // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
  // Determine which simplex we are in.
  var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
  var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
  if(x0>=y0) {
    if(y0>=z0)
      { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; } // X Y Z order
      else if(x0>=z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; } // X Z Y order
      else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; } // Z X Y order
    }
  else { // x0<y0
    if(y0<z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; } // Z Y X order
    else if(x0<z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; } // Y Z X order
    else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; } // Y X Z order
  }
  // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
  // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
  // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
  // c = 1/6.
  var x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
  var y1 = y0 - j1 + G3;
  var z1 = z0 - k1 + G3;
  var x2 = x0 - i2 + 2.0*G3; // Offsets for third corner in (x,y,z) coords
  var y2 = y0 - j2 + 2.0*G3;
  var z2 = z0 - k2 + 2.0*G3;
  var x3 = x0 - 1.0 + 3.0*G3; // Offsets for last corner in (x,y,z) coords
  var y3 = y0 - 1.0 + 3.0*G3;
  var z3 = z0 - 1.0 + 3.0*G3;
  // Work out the hashed gradient indices of the four simplex corners
  var ii = i & 255;
  var jj = j & 255;
  var kk = k & 255;
  var gi0 = this.perm[ii+this.perm[jj+this.perm[kk]]] % 12;
  var gi1 = this.perm[ii+i1+this.perm[jj+j1+this.perm[kk+k1]]] % 12;
  var gi2 = this.perm[ii+i2+this.perm[jj+j2+this.perm[kk+k2]]] % 12;
  var gi3 = this.perm[ii+1+this.perm[jj+1+this.perm[kk+1]]] % 12;
  // Calculate the contribution from the four corners
  var t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
  if(t0<0) n0 = 0.0;
  else {
    t0 *= t0;
    n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0, z0);
  }
  var t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
  if(t1<0) n1 = 0.0;
  else {
    t1 *= t1;
    n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1, z1);
  }
  var t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
  if(t2<0) n2 = 0.0;
  else {
    t2 *= t2;
    n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2, z2);
  }
  var t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
  if(t3<0) n3 = 0.0;
  else {
    t3 *= t3;
    n3 = t3 * t3 * this.dot(this.grad3[gi3], x3, y3, z3);
  }
  // Add contributions from each corner to get the final noise value.
  // The result is scaled to stay just inside [-1,1]
  return 32.0*(n0 + n1 + n2 + n3);
};

}}, []);/* This file has been generated by yabbler.js */
require.define({
"gamejs/pathfinding/astar": function(require, exports, module) {
/**
 * @fileoverview
 * AStar Path finding algorithm
 *
 * Use the `findRoute(map, from, to, [timeout])` function to get the linked list
 * leading `from` a point `to` another on the given `map`.
 *
 * The map must implement interface `gamejs.pathfinding.Map`. This
 * class really holds an example implementation & data for you to study. If you
 * understand what this calls provides, you understand this module.
 *
 * Optionally, the search is canceld after `timeout` in millseconds.
 *
 * If there is no route `null` is returned.
 *
 * @see http://eloquentjavascript.net/chapter7.html
 */
var BinaryHeap = require('../utils/binaryheap').BinaryHeap;

/**
 * helper function for A*
 */
function ReachedList(hashFn) {
   var list = {};

   this.store = function(point, route) {
      list[hashFn(point)] = route;
      return;
   };

   this.find = function(point) {
      return list[hashFn(point)];
   };
   return this;
}


/** A* search function.
 *
 * This function expects a `Map` implementation and the origin and destination
 * points given. If there is a path between the two it will return the optimal
 * path as a linked list. If there is no path it will return null.
 *
 * The linked list is in reverse order: the first item is the destination and
 * the path to the origin follows.
 *
 * @param {Map} map map instance, must follow interface defined in {Map}
 * @param {Array} origin
 * @param {Array} destination
 * @param {Number} timeout milliseconds after which search should be canceled
 * @returns {Object} the linked list leading from `to` to `from` (sic!).
 **/
exports.findRoute = function(map, from, to, timeout) {
   var open = new BinaryHeap(routeScore);
   var hashFn = typeof map.hash === 'function' ? map.hash : defaultHash;
   var reached = new ReachedList(hashFn);

   function routeScore(route) {
      if (route.score === undefined) {
         route.score = map.estimatedDistance(route.point, to) + route.length;
      }
      return route.score;
   }
   function addOpenRoute(route) {
      open.push(route);
      reached.store(route.point, route);
   }

   function processNewPoints(direction) {
      var known = reached.find(direction);
      var newLength = route.length + map.actualDistance(route.point, direction);
      if (!known || known.length > newLength){
         if (known) {
            open.remove(known);
         }
         addOpenRoute({
            point: direction,
            from: route,
            length: newLength
         });
      }
   }
   var startMs = Date.now();
   var route = null;
   addOpenRoute({
      point: from,
      from: null,
      length: 0
   });
   var equalsFn = typeof map.equals === 'function' ? map.equals : defaultEquals;
   while (open.size() > 0 && (!timeout || Date.now() - startMs < timeout)) {
      route = open.pop();
      if (equalsFn(to, route.point)) {
         return route;
      }
      map.adjacent(route.point).forEach(processNewPoints);
   } // end while
   return null;
};

var defaultEquals = function(a, b) {
   return a[0] === b[0] && a[1] === b[1];
};

var defaultHash = function(a) {
   return a[0] + '-' + a[1];
};

/**
 * This is the interface for a Map that can be passed to the `findRoute()`
 * function. `Map` is not instantiable - see the unit tests for an example
 * implementation of Map.
 */
var Map = exports.Map = function() {
   throw new Error('not instantiable, this is an interface');
};

/**
 * @param {Array} origin
 * @returns {Array} list of points accessible from given Point
 */
Map.prototype.adjacent = function(origin) {
};

/**
 * @param {Object} a one of the points ot test for equality
 * @param {Object} b ... the other point
 * @returns Wheter the two points are equal.
 */
Map.prototype.equals = defaultEquals;

/**
 * @param {Object} a point
 * @returns {String} hash for the point
 */
Map.prototype.hash = defaultHash;

/**
 * Estimated lower bound distance between two points.
 * @param {Object} pointA
 * @param {Object} pointB
 * @returns {Number} the estimated distance between two points
 */
Map.prototype.estimatedDistance = function(pointA, pointB) {
   return 1;
};

/**
 * Actual distance between two points.
 * @param {Object} pointA
 * @param {Object} pointB
 * @returns {Number} the actual distance between two points
 */
Map.prototype.actualDistance = function(pointA, pointB) {
   return 1;
};

}}, ["gamejs/utils/binaryheap"]);/* This file has been generated by yabbler.js */
require.define({
"gamejs/sprite": function(require, exports, module) {
var gamejs = require('../gamejs');
var arrays = require('./utils/arrays');
var $o = require('./utils/objects');
var $v = require('./utils/vectors');

/**
 * @fileoverview Provides `Sprite` the basic building block for any game and
 * `SpriteGroups`, which are an efficient
 * way for doing collision detection between groups as well as drawing layered
 * groups of objects on the screen.
 *
 */

/**
 * Your visible game objects will typically subclass Sprite. By setting it's image
 * and rect attributes you can control its appeareance. Those attributes control
 * where and what `Sprite.draw(surface)` will blit on the the surface.
 *
 * Your subclass should overwrite `update(msDuration)` with its own implementation.
 * This function is called once every game tick, it is typically used to update
 * the status of that object.
 * @constructor
 */
var Sprite = exports.Sprite = function() {
   /** @ignore */
   this._groups = [];
   /** @ignore */
   this._alive = true;

   /**
    * Image to be rendered for this Sprite.
    * @type gamejs.Surface
    */
   this.image = null;
   /**
    * Rect describing the position of this sprite on the display.
    * @type gamejs.Rect
    */
   this.rect = null;

   /**
    * List of all groups that contain this sprite.
    */
   $o.accessor(this, 'groups', function() {
      return this._groups;
   });

   return this;
};

/**
 * Kill this sprite. This removes the sprite from all associated groups and
 * makes future calls to `Sprite.isDead()` return `true`
 */
Sprite.prototype.kill = function() {
   this._alive = false;
   this._groups.forEach(function(group) {
      group.remove(this);
   }, this);
   return;
};

/**
 * Remove the sprite from the passed groups
 * @param {Array|gamejs.sprite.Group} groups One or more `gamejs.Group`
 * instances
 */
Sprite.prototype.remove = function(groups) {
   if (!(groups instanceof Array)) {
      groups = [groups];
   }

   groups.forEach(function(group) {
      group.remove(this);
   }, this);
   return;
};

/**
 * Add the sprite to the passed groups
 * @param {Array|gamejs.sprite.Group} groups One or more `gamejs.sprite.Group`
 * instances
 */
Sprite.prototype.add = function(groups) {
   if (!(groups instanceof Array)) {
      groups = [groups];
   }

   groups.forEach(function(group) {
      group.add(this);
   }, this);
   return;
};


/**
 * Returns an array of all the Groups that contain this Sprite.
 * @returns {Array} an array of groups
 */
Sprite.prototype.groups = function() {
   return this._groups.slice(0);
}

/**
 * Draw this sprite onto the given surface. The position is defined by this
 * sprite's rect.
 * @param {gamejs.Surface} surface The surface to draw on
 */
Sprite.prototype.draw = function(surface) {
   surface.blit(this.image, this.rect);
   return;
};

/**
 * Update this sprite. You **should** override this method with your own to
 * update the position, status, etc.
 */
Sprite.prototype.update = function() {};

/**
 * @returns {Boolean} True if this sprite has had `Sprite.kill()` called on it
 * previously, otherwise false
 */
Sprite.prototype.isDead = function() {
   return !this._alive;
};

/**
 * Sprites are often grouped. That makes collision detection more efficient and
 * improves rendering performance. It also allows you to easly keep track of layers
 * of objects which are rendered to the screen in a particular order.
 *
 * `Group.update()` calls `update()` on all the contained sprites; the same is true for `draw()`.
 * @constructor
 */
var Group = exports.Group = function() {
   /** @ignore */
   this._sprites = [];


   if (arguments[0] instanceof Sprite ||
      (arguments[0] instanceof Array &&
       arguments[0].length &&
       arguments[0][0] instanceof Sprite
   )) {
      this.add(arguments[0]);
   }
   return this;
};

/**
 * Update all the sprites in this group. This is equivalent to calling the
 * update method on each sprite in this group.
 */
Group.prototype.update = function() {
   var updateArgs = arguments;

   this._sprites.forEach(function(sp) {
      sp.update.apply(sp, updateArgs);
   }, this);
   return;
};

/**
 * Add one or more sprites to this group
 * @param {Array|gamejs.sprite.Sprite} sprites One or more
 * `gamejs.sprite.Sprite` instances
 */
Group.prototype.add = function(sprites) {
   if (!(sprites instanceof Array)) {
      sprites = [sprites];
   }

   sprites.forEach(function(sprite) {
      this._sprites.push(sprite);
      sprite._groups.push(this);
   }, this);
   return;
};

/**
 * Remove one or more sprites from this group
 * @param {Array|gamejs.sprite.Sprite} sprites One or more
 * `gamejs.sprite.Sprite` instances
 */
Group.prototype.remove = function(sprites) {
   if (!(sprites instanceof Array)) {
      sprites = [sprites];
   }

   sprites.forEach(function(sp) {
      arrays.remove(sp, this._sprites);
      arrays.remove(this, sp._groups);
   }, this);
   return;
};

/**
 * Check for the existence of one or more sprites within a group
 * @param {Array|gamejs.sprite.Sprite} sprites One or more
 * `gamejs.sprite.Sprite` instances
 * @returns {Boolean} True if every sprite is in this group, false otherwise
 */
Group.prototype.has = function(sprites) {
   if (!(sprites instanceof Array)) {
      sprites = [sprites];
   }

   return sprites.every(function(sp) {
      return this._sprites.indexOf(sp) !== -1;
   }, this);
};

/**
 * Get the sprites in this group
 * @returns {Array} An array of `gamejs.sprite.Sprite` instances
 */
Group.prototype.sprites = function() {
   return this._sprites;
};

/**
 * Draw all the sprites in this group. This is equivalent to calling each
 * sprite's draw method.
 */
Group.prototype.draw = function() {
   var args = arguments;
   this._sprites.forEach(function(sprite) {
      sprite.draw.apply(sprite, args);
   }, this);
   return;
};

/**
 * Draw background (`source` argument) over each sprite in the group
 * on the `destination` surface.
 *
 * This can, for example, be used to clear the
 * display surface to a a static background image in all the places
 * occupied by the sprites of all group.
 *
 * @param {gamejs.Surface} destination the surface to draw on
 * @param {gamejs.Surface} source surface
 */
Group.prototype.clear = function(destination, source) {
   this._sprites.forEach(function(sprite) {
      destination.blit(source, sprite.rect);
   }, this);
};

/**
 * Remove all sprites from this group
 */
Group.prototype.empty = function() {
   this._sprites = [];
   return;
};

/**
 * @returns {Array} of sprites colliding with the point
 */
Group.prototype.collidePoint = function() {
   var args = Array.prototype.slice.apply(arguments);
   return this._sprites.filter(function(sprite) {
      return sprite.rect.collidePoint.apply(sprite.rect, args);
   }, this);
};

/**
 * Loop over each sprite in this group. This is a shortcut for
 * `group.sprites().forEach(...)`.
 */
Group.prototype.forEach = function(callback, thisArg) {
   return this._sprites.forEach(callback, thisArg);
};

/**
 * Check whether some sprite in this group passes a test. This is a shortcut
 * for `group.sprites().some(...)`.
 */
Group.prototype.some = function(callback, thisArg) {
   return this._sprites.some(callback, thisArg);
};

/**
 * Find sprites in a group that intersect another sprite
 * @param {gamejs.sprite.Sprite} sprite The sprite to check
 * @param {gamejs.sprite.Group} group The group to check
 * @param {Boolean} doKill If true, kill sprites in the group when collided
 * @param {function} collided Collision function to use, defaults to `gamejs.sprite.collideRect`
 * @returns {Array} An array of `gamejs.sprite.Sprite` instances that collided
 */
exports.spriteCollide = function(sprite, group, doKill, collided) {
   collided = collided || collideRect;
   doKill = doKill || false;

   var collidingSprites = [];
   group.sprites().forEach(function(groupSprite) {
      if (collided(sprite, groupSprite)) {
         if (doKill) {
            groupSprite.kill();
         }
         collidingSprites.push(groupSprite);
      }
   });
   return collidingSprites;
};

/**
 * Find all Sprites that collide between two Groups.
 *
 * @example
 * groupCollide(group1, group2).forEach(function (collision) {
 *    var group1Sprite = collision.a;
 *    var group2Sprite = collision.b;
 *    // Do processing here!
 * });
 *
 * @param {gamejs.sprite.Group} groupA First group to check
 * @param {gamejs.sprite.Group} groupB Second group to check
 * @param {Boolean} doKillA If true, kill sprites in the first group when
 * collided
 * @param {Boolean} doKillB If true, kill sprites in the second group when
 * collided
 * @param {function} collided Collision function to use, defaults to `gamejs.sprite.collideRect`
 * @returns {Array} A list of objects where properties 'a' and 'b' that
 * correspond with objects from the first and second groups
 */
exports.groupCollide = function(groupA, groupB, doKillA, doKillB, collided) {
   doKillA = doKillA || false;
   doKillB = doKillB || false;

   var collideList = [];
   var collideFn = collided || collideRect;
   groupA.sprites().forEach(function(groupSpriteA) {
      groupB.sprites().forEach(function(groupSpriteB) {
         if (collideFn(groupSpriteA, groupSpriteB)) {
            if (doKillA) {
               groupSpriteA.kill();
            }
            if (doKillB) {
               groupSpriteB.kill();
            }

            collideList.push({
               'a': groupSpriteA,
               'b': groupSpriteB
            });
         }
      });
   });

   return collideList;
};

/**
 * Check for collisions between two sprites using their rects.
 *
 * @param {gamejs.sprite.Sprite} spriteA First sprite to check
 * @param {gamejs.sprite.Sprite} spriteB Second sprite to check
 * @returns {Boolean} True if they collide, false otherwise
 */
var collideRect = exports.collideRect = function (spriteA, spriteB) {
   return spriteA.rect.collideRect(spriteB.rect);
};

/**
 * Collision detection between two sprites utilizing the optional `mask`
 * attribute on the sprites. Beware: expensive operation.
 *
 * @param {gamejs.sprite.Sprite} spriteA Sprite with 'mask' property set to a `gamejs.mask.Mask`
 * @param {gamejs.sprite.Sprite} spriteB Sprite with 'mask' property set to a `gamejs.mask.Mask`
 * @returns {Boolean} True if any mask pixels collide, false otherwise
 */
exports.collideMask = function(spriteA, spriteB) {
   if (!spriteA.mask || !spriteB.mask) {
      throw new Error("Both sprites must have 'mask' attribute set to an gamejs.mask.Mask");
   }
   var offset = [
      spriteB.rect.left - spriteA.rect.left,
      spriteB.rect.top - spriteA.rect.top
   ];
   return spriteA.mask.overlap(spriteB.mask, offset);
};

/**
 * Collision detection between two sprites using circles at centers.
 * There sprite property `radius` is used if present, otherwise derived from bounding rect.
 * @param {gamejs.sprite.Sprite} spriteA First sprite to check
 * @param {gamejs.sprite.Sprite} spriteB Second sprite to check
 * @returns {Boolean} True if they collide, false otherwise
 */
exports.collideCircle = function(spriteA, spriteB) {
   var rA = spriteA.radius || Math.max(spriteA.rect.width, spriteA.rect.height);
   var rB = spriteB.radius || Math.max(spriteB.rect.width, spriteB.rect.height);
   return $v.distance(spriteA.rect.center, spriteB.rect.center) <= rA + rB;
};

}}, ["gamejs", "gamejs/utils/arrays", "gamejs/utils/objects", "gamejs/utils/vectors"]);/* This file has been generated by yabbler.js */
require.define({
"gamejs/surfacearray": function(require, exports, module) {
var gamejs = require('../gamejs');
var accessors = require('./utils/objects').accessors;
/**
 * @fileoverview Fast pixel access.
 *
 * @example
 *
 *   // create array from display surface
 *   var srfArray = new SurfaceArray(display);
 *   // direct pixel access
 *   srfArray.set(50, 100, [255, 0, 0, 100]);
 *   console.log(srfArray.get(30, 50));
 *   // blit modified array back to display surface
 *   blitArray(display, srfArray);
 */

/**
 * Directly copy values from an array into a Surface.
 *
 * This is faster than blitting the `surface` property on a SurfaceArray
 *
 * The array must be the same dimensions as the Surface and will completely
 * replace all pixel values.
 * @param {gamejs.Surface} surface
 * @param {gamejs.surfacearray.SurfaceArray} surfaceArray
 */
exports.blitArray = function(surface, surfaceArray) {
   surface.context.putImageData(surfaceArray.imageData, 0, 0);
   return;
};

/**
 * The SurfaceArray can be constructed with a surface whose values
 * are then used to initialize the pixel array.
 *
 * The surface passed as argument is not modified by the SurfaceArray.
 *
 * If an array is used to construct SurfaceArray, the array must describe
 * the dimensions of the SurfaceArray [width, height].
 *
 * @param {gamejs.Surface|Array} surfaceOrDimensions
 * @see http://dev.w3.org/html5/2dcontext/#pixel-manipulation
 */
var SurfaceArray = exports.SurfaceArray = function(surfaceOrDimensions) {
   var size = null;
   var data = null;
   var imageData = null;

   /**
    * Set rgba value at position x, y.
    *
    * For performance reasons this function has only one signature
    * being Number, Number, Array[4].
    *
    * @param {Number} x x position of pixel
    * @param {Number} y y position of pixel
    * @param {Array} rgba [red, green, blue, alpha] values [255, 255, 255, 255] (alpha, the last argument defaults to 255)
    * @throws Error if x, y out of range
    */
   this.set = function(x, y, rgba) {
      var offset = (x * 4) + (y * size[0] * 4);
      /** faster without
      if (offset + 3 >= data.length || x < 0 || y < 0) {
         throw new Error('x, y out of range', x, y);
      }
      **/
      data[offset] = rgba[0];
      data[offset+1] = rgba[1];
      data[offset+2] = rgba[2];
      data[offset+3] = rgba[3] === undefined ? 255 : rgba[3];
      return;
   };

   /**
    * Get rgba value at position xy,
    * @param {Number} x
    * @param {Number} y
    * @returns {Array} [red, green, blue, alpha]
    */
   this.get = function(x, y) {
      var offset = (x * 4) + (y * size[0] * 4);
      return [
         data[offset],
         data[offset+1],
         data[offset+2],
         data[offset+3]
      ];
   };

   /**
    * a new gamejs.Surface on every access, representing
    * the current state of the SurfaceArray.
    * @type {gamejs.Surface}
    */
   // for jsdoc only
   this.surface = null;

   accessors(this, {
      surface: {
         get: function() {
            var s = new gamejs.Surface(size);
            s.context.putImageData(imageData, 0, 0);
            return s;
         }
      },
      imageData: {
         get: function() {
            return imageData;
         }
      }
   });

   this.getSize = function() {
      return size;
   };

   /**
    * constructor
    */
   if (surfaceOrDimensions instanceof Array) {
      size = surfaceOrDimensions;
      imageData = gamejs.display.getSurface().context.createImageData(size[0], size[1]);
      data = imageData.data;
   } else {
      size = surfaceOrDimensions.getSize();
      imageData = surfaceOrDimensions.getImageData(0, 0, size[0], size[1]);
      data = imageData.data;
   }
   return this;
};

}}, ["gamejs", "gamejs/utils/objects"]);/* This file has been generated by yabbler.js */
require.define({
"gamejs/time": function(require, exports, module) {
/**
 * @fileoverview
 * Provides tools for game time managment.
 *
 * This is very different from how PyGame works. We can not
 * pause the execution of the script in Browser JavaScript, so what
 * we do you do is write a main function which contains the code
 * you would put into your main loop and pass that to `gamejs.time.interval()`:
 *
 * @example
 *  // call function `tick` as fast as the browser thinks is appropriate
 *  gamejs.time.interval(tick);
 *  // call the function `tick` maximally 20 times per second
 *  gamejs.time.interval(tick, 20);
 *
 *
 */


var TIMER_LASTCALL = null;
var CALLBACKS = {};
var CALLBACKS_LASTCALL = {};
var STARTTIME = null;

// `window` is not accessible in webworker (would lead to TypeError)
// @@ this cross-browser fuckery has to go away ASAP.
var reqAnimationFrame = typeof(window) != 'undefined' ?
                        window.requestAnimationFrame ||
                        window.webkitRequestAnimationFrame ||
                        window.mozRequestAnimationFrame ||
                        window.oRequestAnimationFrame ||
                        window.msRequestAnimationFrame ||
                        null : null;

var reqAniFrameRecursive = function() {
   perInterval();
   reqAnimationFrame(reqAniFrameRecursive)
}

/**
 * @ignore
 */
exports.init = function() {
   STARTTIME = Date.now();

   if (reqAnimationFrame) {
      reqAnimationFrame(reqAniFrameRecursive);
   } else {
      setInterval(perInterval, 10);
   }
   return;
};

/**
 * Call a function as fast as the browser thinks is good for an animation.
 *
 * Alternatively, the desired "frames per second" (fps) can be passed as
 * the second argument. This will limit the calls to the function to happen
 * at most this often per second. "fps" is thus a colloquial term for
 * "callback frequency per second".
 *
 * If you do not specify a required callback frequency but let the browser
 * decided how often the function should get called, then beware that the browser
 * can schedule your function to only be called as rarely as once per second
 * (for example, if the browser window is not visible).

 * @param {Function} fn the function to be called
 * @param {Number} fps optional callback frequency per second
 * @param {Object} thisObj optional context for callback function
 */
exports.interval = function(fn, fps, thisObj) {
   // both args are optional
   if (thisObj === undefined && isNaN(fps)) {
      thisObj = fps;
      fps = undefined;
   }
   fpsCallback(fn, thisObj, fps);
   return;
}

/**
 * This function is deprecated in favor of `gamejs.time.interval`
 * @see #interval
 *
 * @param {Function} fn the function to call back
 * @param {Object} thisObj `this` will be set to that object when executing the callback function
 * @param {Number} fps specify the framerate by which you want the callback to be called. (e.g. 30 = 30 times per seconds). default: 60
 * @deprecated
 * @ignore
 */
var fpsCallback = exports.fpsCallback = function(fn, thisObj, fps) {
   if (fps === undefined) {
     fps = 60;
   }

   fps = parseInt(1000/fps, 10);
   CALLBACKS[fps] = CALLBACKS[fps] || [];
   CALLBACKS_LASTCALL[fps] = CALLBACKS_LASTCALL[fps] || 0;

   CALLBACKS[fps].push({
      'rawFn': fn,
      'callback': function(msWaited) {
         fn.apply(thisObj, [msWaited]);
      }
   });
   return;
};

/**
 * @param {Function} callback the function delete
 * @param {Number} fps
 * @deprecated
 * @ignore
 */
exports.deleteCallback = function(callback, fps) {
   fps = parseInt(1000/fps, 10);
   var callbacks = CALLBACKS[fps];
   if (!callbacks) {
      return;
   }

   CALLBACKS[fps] = callbacks.filter(function(fnInfo, idx) {
      if (fnInfo.rawFn !== callback) {
         return true;
      }
      return false;
   });
   return;
};

var perInterval = function() {
   var msNow = Date.now();
   var lastCalls = CALLBACKS_LASTCALL;
   function callbackWrapper(fnInfo) {
      fnInfo.callback(msWaited);
   }
   for (var fpsKey in lastCalls) {
      if (!lastCalls[fpsKey]) {
         CALLBACKS_LASTCALL[fpsKey] = msNow;
      }
      var msWaited = msNow - lastCalls[fpsKey];
      if (fpsKey <= msWaited) {
         CALLBACKS_LASTCALL[fpsKey] = msNow;
         CALLBACKS[fpsKey].forEach(callbackWrapper, this);
      }
   }
   return;
};

}}, []);/* This file has been generated by yabbler.js */
require.define({
"gamejs/tmx": function(require, exports, module) {
var gamejs = require('../gamejs');
var objects = require('./utils/objects');
var xml = require('./xml');
var base64 = require('./utils/base64');
var uri = require('./utils/uri');

/**
 * @fileoverview
 * This is a loader for the general purpose tile map editor "Tiled".
 *
 * This module can load all ".tmx" files even if additionally base64 encoded
 * (can be configured in Tiled).
 *
 * This module loads the whole map definition, including the TileSets with
 * all necessary images. For an example on how to render a map loaded with
 * this module, see `examples/tiledmap`.
 *
 * You will typically create a Map instance with `Map(url)` and deal
 * with the layers, tilesets, etc. through the Map instance
 * instead of loading & creating them yourself.
 *
 * Only orthogonol maps are supported (no isometric maps).
 *
 * @see http://www.mapeditor.org/
 * @see https://github.com/bjorn/tiled/wiki/TMX-Map-Format
 */

/**
 * My code is inspired by:
 *   * https://bitbucket.org/maikg/tiled2cocos/
 *   * https://github.com/obiot/melonJS/
 *
 */

/**
 * A Tiled Map holds all layers defined in the tmx file as well
 * as the necessary tiles to render the map.
 * @param {String} url Relative or absolute URL to the tmx file
 */
var Map = exports.Map = function(url) {

   var url = uri.resolve(document.location.href, url);
   var xmlDoc = xml.Document.fromURL(url);
   var mapNode = xmlDoc.element('map');

   /**
    * Width of a single tile in pixels
    * @type Number
    */
   this.tileWidth = mapNode.attribute('tilewidth');
   /**
    * Height of a single tile in pixels
    * @type Number
    */
   this.tileHeight = mapNode.attribute('tileheight');
   /**
    * Width of the map in tiles
    * @type Number
    */
   this.width = mapNode.attribute('width');
   /**
    * Height of the map in tiles
    * @type Number
    */
   this.height = mapNode.attribute('height');

   var orientation = mapNode.attribute('orientation');
   if (orientation !== 'orthogonal') {
      throw new Error('only orthogonol maps supported');
   }

   /**
    * Custom properties of the map
    */
   this.properties = {};
   setProperties(this.properties, mapNode);

   /**
    * All tiles of this map.
    * @type TileSets
    */
   this.tiles = new TileSets(mapNode, url);
   this.layers = loadLayers(mapNode);
   return this;
};

/**
 * A Tile. Can not be instantiated. Get a Tile by calling `getTile(gid)`
 * on a `TileSets` instance.
 */
var Tile = exports.Tile = function() {
   throw new Error('Can not be instantiated.')
   /**
    * @type {gamejs.Surface} this tile's Surface
    */
   this.surface = null;
   /**
    * @type {Object} custom properties attach for this tile
    */
   this.properties = null;
   return;
}

/**
 * A TileSets instance holds all tilesets of a map. This class
 * makes it easy to get the image for a certain tile ID. You usually
 * don't care about in which specific TileSet an image is so this
 * class holds them all and deals with the lookup.
 *
 * You don't usually create a `TileSets` instance yourself, instead
 * it is automatically created and attached to a `Map`.
 */
var TileSets = exports.TileSets = function(mapNode, mapUrl) {
   var tileSets = [];

   /**
    * Retrieve the image for a tile ID (gid).
    *
    * @param {Number} gid global tile id to retrieve
    * @returns {gamejs.Surface} the Surface for the gid
    */
   this.getSurface = function(gid) {
      var tile = this.getTile(gid);
      return tile && tile.surface || null;
   };

   /**
    * @param {Number} gid global tile id
    * @returns {Object} the custom properties of this tile
    */
   this.getProperties = function(gid) {
      var tile = this.getTile(gid);
      return tile && tile.properties || {};
   };

   /**
    * @param {Number} gid global tile id
    * @returns {Object} the Tile object for this gid
    */
   this.getTile = function(gid) {
      var tile = null;
      tileSets.some(function(tileSet, idx) {
         if (tileSet.firstGid <= gid) {
            tile = tileSet.tiles[gid - tileSet.firstGid];
            return true;
         }
         return false;
      }, this);
      return tile;
   };

   var loadTileSet = function(tileSetNode) {
      var tiles = [];
      var tileWidth = tileSetNode.attribute('tilewidth');
      var tileHeight = tileSetNode.attribute('tileheight');
      var spacing = tileSetNode.attribute('spacing') || 0;
      // broken in tiled?
      var margin = 0;

      var imageNode = tileSetNode.element('image');
      var imageAtlasFile = imageNode.attribute('source');
      var imageUrl = uri.makeRelative(uri.resolve(mapUrl, imageAtlasFile));
      var atlas = gamejs.image.load(imageUrl);
      // FIXME set transparency if imageNode.attribute('trans') is set

      var tileNodes = tileSetNode.elements('tile')
      var dims = atlas.getSize();
      var imgSize = new gamejs.Rect([0,0], [tileWidth, tileHeight]);
      var idx = 0;
      var y = 0;
      while (y + tileHeight <= dims[1]) {
         x = 0;
         while (x + tileWidth <= dims[0]) {
            var tileImage = new gamejs.Surface(tileWidth, tileHeight);
            var rect = new gamejs.Rect([x, y], [tileWidth, tileHeight]);
            tileImage.blit(atlas, imgSize, rect);
            var tileProperties = {};
            tileNodes.some(function(tileNode) {
               if (tileNode.attribute('id') === idx) {
                  setProperties(tileProperties, tileNode);
                  return true;
               }
            }, this);
            tiles.push({
               surface: tileImage,
               properties: tileProperties
            });
            x += tileWidth + spacing;
            idx++;
         }
         y += tileHeight + spacing;
      }
      return tiles;
   }

   /**
    *
    * constructor
    **/
   mapNode.elements('tileset').forEach(function(tileSetNode) {
      var firstGid = tileSetNode.attribute('firstgid');
      var externalSource = tileSetNode.attribute('source');
      if (externalSource) {
         var tileSetDocument = xml.Document.fromURL(uri.resolve(mapUrl, externalSource));
         tileSetNode = tileSetDocument.element('tileset');
      }
      tileSets.push({
         tiles: loadTileSet(tileSetNode),
         firstGid: firstGid
      });
   });
   tileSets.reverse();

   return this;
};

/**
 * loadLayers
 */
var H_FLIP = 0x80000000;
var V_FLIP = 0x40000000;
var loadLayers = function(mapNode) {
   var layers = [];

   var getGids = function(layerNode) {
      var dataNode = layerNode.element('data');
      var encoding = dataNode.attribute('encoding');
      var compression = dataNode.attribute('compression')
      var data = "";
      dataNode.children().forEach(function(textNode) {
         data += textNode.value();
      });
      var byteData = [];
      if (encoding === 'base64') {
         if (compression) {
            throw new Error('Compression of map data unsupported');
         }
         byteData = base64.decodeAsArray(data, 4);
      } else if (encoding === 'csv') {
         data.trim().split('\n').forEach(function(row) {
            row.split(',', width).forEach(function(entry) {
               byteData.push(parseInt(entry, 10));
            });
         });
      } else {
         // FIXME individual XML tile elements
         throw new Error('individual tile format not supported');
      }
      return byteData;
   };

   var width = mapNode.attribute('width');
   var height = mapNode.attribute('height');
   mapNode.elements('layer').forEach(function(layerNode) {
      // create empty gid matrix
      var gidMatrix = [];
      var i = height;
      while (i-->0) {
         var j = width;
         gidMatrix[i] = [];
         while (j-->0) {
            gidMatrix[i][j] = 0;
         }
      }

      getGids(layerNode).forEach(function(gid, idx) {
         // FIXME flipX/Y currently ignored
         var flipX = gid & H_FLIP;
         var flipY = gid & V_FLIP;
         // clear flags
         gid &= ~(H_FLIP | V_FLIP);
         gidMatrix[parseInt(idx / width, 10)][parseInt(idx % width, 10)] = gid;
      });
      layers.push({
         gids: gidMatrix,
         opacity: layerNode.attribute('opacity'),
         visible: layerNode.attribute('visible'),
         properties: setProperties({}, layerNode)
      });
   });
   return layers;
}

/**
 * set generic <properties><property name="" value="">... on given object
 */
var setProperties = function(object, node) {
   var props = node.element('properties');
   if (!props) {
      return;
   }
   props.elements('property').forEach(function(propertyNode) {
      var name = propertyNode.attribute('name');
      var value = propertyNode.attribute('value');
      object[name] = value;
   });
   return object;
};

}}, ["gamejs", "gamejs/utils/objects", "gamejs/xml", "gamejs/utils/base64", "gamejs/utils/uri"]);/* This file has been generated by yabbler.js */
require.define({
"gamejs/transform": function(require, exports, module) {
var Surface = require('../gamejs').Surface;
var matrix = require('./utils/matrix');
var math = require('./utils/math');
var vectors = require('./utils/vectors');

/**
 * @fileoverview Rotate and scale Surfaces.
 */

/**
 * Returns a new surface which holds the original surface rotate by angle degrees.
 * Unless rotating by 90 degree increments, the image will be padded larger to hold the new size.
 * @param {Surface} surface
 * @param {angel} angle Clockwise angle by which to rotate
 * @returns {Surface} new, rotated surface
 */
exports.rotate = function (surface, angle) {
   var origSize = surface.getSize();
   var radians = (angle * Math.PI / 180);
   var newSize = origSize;
   // find new bounding box
   if (angle % 360 !== 0) {
      var rect = surface.getRect();
      var points = [
         [-rect.width/2, rect.height/2],
         [rect.width/2, rect.height/2],
         [-rect.width/2, -rect.height/2],
         [rect.width/2, -rect.height/2]
      ];
      var rotPoints = points.map(function(p) {
         return vectors.rotate(p, radians);
      });
      var xs = rotPoints.map(function(p) { return p[0]; });
      var ys = rotPoints.map(function(p) { return p[1]; });
      var left = Math.min.apply(Math, xs);
      var right = Math.max.apply(Math, xs);
      var bottom = Math.min.apply(Math, ys);
      var top = Math.max.apply(Math, ys);
      newSize = [right-left, top-bottom];
   }
   var newSurface = new Surface(newSize);
   var oldMatrix = surface._matrix;
   surface._matrix = matrix.translate(surface._matrix, origSize[0]/2, origSize[1]/2);
   surface._matrix = matrix.rotate(surface._matrix, radians);
   surface._matrix = matrix.translate(surface._matrix, -origSize[0]/2, -origSize[1]/2);
   var offset = [(newSize[0] - origSize[0]) / 2, (newSize[1] - origSize[1]) / 2];
   newSurface.blit(surface, offset);
   surface._matrix = oldMatrix;
   return newSurface;
};

/**
 * Returns a new surface holding the scaled surface.
 * @param {Surface} surface
 * @param {Array} dimensions new [width, height] of surface after scaling
 * @returns {Surface} new, scaled surface
 */
exports.scale = function(surface, dims) {
   var width = dims[0];
   var height = dims[1];
   if (width <= 0 || height <= 0) {
      throw new Error('[gamejs.transform.scale] Invalid arguments for height and width', [width, height]);
   }
   var oldDims = surface.getSize();
   var ws = width / oldDims[0];
   var hs = height / oldDims[1];
   var newSurface = new Surface([width, height]);
   var originalMatrix = surface._matrix.slice(0);
   surface._matrix = matrix.scale(surface._matrix, [ws, hs]);
   newSurface.blit(surface);
   surface._matrix = originalMatrix;
   return newSurface;
};

/**
 * Flip a Surface either vertically, horizontally or both. This returns
 * a new Surface (i.e: nondestructive).
 * @param {gamejs.Surface} surface
 * @param {Boolean} flipHorizontal
 * @param {Boolean} flipVertical
 * @returns {Surface} new, flipped surface
 */
exports.flip = function(surface, flipHorizontal, flipVertical) {
   var dims = surface.getSize();
   var newSurface = new Surface(dims);
   var scaleX = 1;
   var scaleY = 1;
   var xPos = 0;
   var yPos = 0;
   if (flipHorizontal === true) {
      scaleX = -1;
      xPos = -dims[0];
   }
   if (flipVertical === true) {
      scaleY = -1;
      yPos = -dims[1];
   }
   newSurface.context.save();
   newSurface.context.scale(scaleX, scaleY);
   newSurface.context.drawImage(surface.canvas, xPos, yPos);
   newSurface.context.restore();
   return newSurface;
};

}}, ["gamejs", "gamejs/utils/matrix", "gamejs/utils/math", "gamejs/utils/vectors"]);/* This file has been generated by yabbler.js */
require.define({
"gamejs/utils/arrays": function(require, exports, module) {
/**
 * @fileoverview Utility functions for working with Obiects
 * @param {Object} item
 * @param {Array} array
 * @param {Object} returns removed item or null
 */

exports.remove = function(item, array) {
   var index = array.indexOf(item);
   if (index !== -1) {
      return array.splice(array.indexOf(item), 1);
   }
   return null;
};

/**
 * Shuffles the array *in place*.
 * @see http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
 */
exports.shuffle = function(array) {
    var len = array.length -1;
    for (i = len; i > 0; i--) {
        var idx = parseInt(Math.random() * (i + 1));
        var item = array[i];
        array[i] = array[idx];
        array[idx] = item;
    }
    return array;
};

}}, []);/* This file has been generated by yabbler.js */
require.define({
"gamejs/utils/base64": function(require, exports, module) {
/**
 * @fileoverview
 * Base64 encode / decode
 * @author http://www.webtoolkit.info
 */


var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

/**
 * Decodes a base64 encoded string to a string.
 */
var decode = exports.decode = function(input) {
   var output = [], chr1, chr2, chr3, enc1, enc2, enc3, enc4, i = 0;
   input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

   while (i < input.length) {
      enc1 = keyStr.indexOf(input.charAt(i++));
      enc2 = keyStr.indexOf(input.charAt(i++));
      enc3 = keyStr.indexOf(input.charAt(i++));
      enc4 = keyStr.indexOf(input.charAt(i++));

      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;

      output.push(String.fromCharCode(chr1));

      if (enc3 != 64) {
         output.push(String.fromCharCode(chr2));
      }
      if (enc4 != 64) {
         output.push(String.fromCharCode(chr3));
      }
   }

   output = output.join('');
   return output;
};

/**
 * Decodes a base64 encoded string into a byte array
 * @param {String} input
 * @param {Array} bytes bytes per character, defaults to 1
 */
exports.decodeAsArray = function(input, bytes) {
   bytes = bytes || 1;
   var decoded = decode(input);
   var len = decoded.length / bytes;
   var array = [];
   for (var i=0; i< len; i++) {
      array[i] = 0;
      for (var j = bytes - 1; j >=0; --j) {
         array[i] += decoded.charCodeAt((i * bytes) + j) << (j <<3 )
      }
   }
   return array;
}

}}, []);/* This file has been generated by yabbler.js */
require.define({
"gamejs/utils/binaryheap": function(require, exports, module) {
/**
 * Binary Heap
 *
 * @see http://eloquentjavascript.net/appendix2.html
 */
var BinaryHeap = exports.BinaryHeap = function(scoreFunction){
   /**
    * @ignore
    */
   this.content = [];
   /**
    * @ignore
    */
   this.scoreFunction = scoreFunction;
   return this;
};

/**
 * Add element to heap.
 * @param {Object} element
 */
BinaryHeap.prototype.push = function(element) {
   this.content.push(element);
   this.sinkDown(this.content.length - 1);
   return;
};

/**
 * Return first element from heap.
 * @param {Object} element
 * @returns {Object} element
 */
BinaryHeap.prototype.pop = function() {
   // Store the first element so we can return it later.
   var result = this.content[0];
   // Get the element at the end of the array.
   var end = this.content.pop();
   // If there are any elements left, put the end element at the
   // start, and let it bubble up.
   if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
   }
   return result;
};

/**
 * Remove the given element from the heap.
 * @param {Object} element
 * @throws {Error} if node not found
 */
BinaryHeap.prototype.remove = function(node) {
   // To remove a value, we must search through the array to find
   // it.
   var isFound = this.content.some(function(cNode, idx) {
      if (cNode == node) {
         var end = this.content.pop();
         if (idx != this.content.length) {
            this.content[idx] = end;
            if (this.scoreFunction(end) < this.scoreFunction(node)) {
               this.sinkDown(idx);
            } else {
               this.bubbleUp(idx);
            }
         }
         return true;
      }
      return false;
   }, this);
   if (!isFound) {
      //throw new Error("Node not found.");
   }
   return;
};

/**
 * Number of elements in heap.
 */
BinaryHeap.prototype.size = function() {
   return this.content.length;
};

/**
 * @ignore
 */
BinaryHeap.prototype.sinkDown = function(idx) {
   // Fetch the element that has to be sunk
   var element = this.content[idx];
   // When at 0, an element can not sink any further.
   while (idx > 0) {
      // Compute the parent element's index, and fetch it.
      var parentIdx = Math.floor((idx + 1) / 2) - 1;
      var parent = this.content[parentIdx];
      // Swap the elements if the parent is greater.
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
         this.content[parentIdx] = element;
         this.content[idx] = parent;
         // Update 'n' to continue at the new position.
         idx = parentIdx;
      // Found a parent that is less, no need to sink any further.
      } else {
         break;
      }
   }
   return;
};

/**
 * @ignore
 */
BinaryHeap.prototype.bubbleUp = function(idx) {
   // Look up the target element and its score.
   var length = this.content.length;
   var element = this.content[idx];
   var elemScore = this.scoreFunction(element);

   while(true) {
      // Compute the indices of the child elements.
      var child2Idx = (idx + 1) * 2;
      var child1Idx= child2Idx - 1;
      // This is used to store the new position of the element,
      // if any.
      var swapIdx = null;
      // If the first child exists (is inside the array)...
      if (child1Idx < length) {
         // Look it up and compute its score.
         var child1 = this.content[child1Idx];
         var child1Score = this.scoreFunction(child1);
         // If the score is less than our element's, we need to swap.
         if (child1Score < elemScore) {
            swapIdx = child1Idx;
         }
      }
      // Do the same checks for the other child.
      if (child2Idx < length) {
         var child2 = this.content[child2Idx];
         var child2Score = this.scoreFunction(child2);
         if (child2Score < (swapIdx === null ? elemScore : child1Score)) {
            swapIdx = child2Idx;
         }
      }

      // If the element needs to be moved, swap it, and continue.
      if (swapIdx !== null) {
         this.content[idx] = this.content[swapIdx];
         this.content[swapIdx] = element;
         idx = swapIdx;
      // Otherwise, we are done.
      } else {
         break;
      }
   }
   return;
};

}}, []);/* This file has been generated by yabbler.js */
require.define({
"gamejs/utils/math": function(require, exports, module) {
/**
 *
 * absolute angle to relative angle, in degrees
 * @param {Number} absolute angle in degrees
 * @returns {Number} relative angle in degrees
 */
exports.normaliseDegrees=function(degrees){
    degrees=degrees % 360;
    if(degrees<0) {
        degrees+=360;
    }
    return degrees;
};

/**
 *
 * absolute angle to relative angle, in radians
 * @param {Number} absolute angle in radians
 * @returns {Number} relative angle in radians
 */
exports.normaliseRadians=function(radians){
    radians=radians % (2*Math.PI);
    if(radians<0) {
        radians+=(2*Math.PI);
    }
    return radians;
};

/**
 *
 * convert radians to degrees
 * @param {Number} radians
 * @returns {Number} degrees
 */
exports.degrees=function(radians) {
    return radians*(180/Math.PI);
};

/**
 *
 * convert degrees to radians
 * @param {Number} degrees
 * @returns {Number} radians
 */
exports.radians=function(degrees) {
    return degrees*(Math.PI/180);
};

/**
 * @returns the center of multipled 2d points
 * @param {Array} first point
 * @param {Array} second point
 * @param {Array} ...
 */
exports.centroid = function() {
   var args = Array.prototype.slice.apply(arguments, [0]);
   var c = [0,0];
   args.forEach(function(p) {
      c[0] += parseInt(p[0], 10);
      c[1] += parseInt(p[1], 10);
   });
   var len = args.length;
   return [
      c[0] / len,
      c[1] / len
   ];
};

}}, []);/* This file has been generated by yabbler.js */
require.define({
"gamejs/utils/matrix": function(require, exports, module) {
/**
 * @fileoverview Matrix manipulation, used by GameJs itself. You
 * probably do not need this unless you manipulate a Context's transformation
 * matrix yourself.
 */

// correct way to do scale, rotate, translate
// *  gamejs.utils.matrix will be used in gamejs.transforms, modifing the surfaces.matrix
// * this matrix must be applied to the context in Surface.draw()

/**
 * @returns {Array} [1, 0, 0, 1, 0, 0]
 */
var identiy = exports.identity = function () {
   return [1, 0, 0, 1, 0, 0];
};

/**
 * @param {Array} matrix
 * @param {Array} matrix
 * @returns {Array} matrix sum
 */
var add = exports.add = function(m1, m2) {
   return [
      m1[0] + m2[0],
      m1[1] + m2[1],
      m1[2] + m2[2],
      m1[3] + m2[3],
      m1[4] + m2[4],
      m1[5] + m2[5],
      m1[6] + m2[6]
   ];
};

/**
 * @param {Array} matrix A
 * @param {Array} matrix B
 * @returns {Array} matrix product
 */
var multiply = exports.multiply = function(m1, m2) {
   return [
      m1[0] * m2[0] + m1[2] * m2[1],
      m1[1] * m2[0] + m1[3] * m2[1],
      m1[0] * m2[2] + m1[2] * m2[3],
      m1[1] * m2[2] + m1[3] * m2[3],
      m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
      m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
   ];
};

/**
 * @param {Array} matrix
 * @param {Number} dx
 * @param {Number} dy
 * @returns {Array} translated matrix
 */
var translate = exports.translate = function(m1, dx, dy) {
   return multiply(m1, [1, 0, 0, 1, dx, dy]);
};

/**
 * @param {Array} matrix
 * @param {Number} angle in radians
 * @returns {Array} rotated matrix
 */
var rotate = exports.rotate = function(m1, angle) {
   // radians
   var sin = Math.sin(angle);
   var cos = Math.cos(angle);
   return multiply(m1, [cos, sin, -sin, cos, 0, 0]);
};

/**
 * @param {Array} matrix
 * @returns {Number} rotation in radians
 */
var rotation = exports.rotation = function(m1) {
      return Math.atan2(m1[1], m1[0]);
};

/**
 * @param {Array} matrix
 * @param {Array} vector [a, b]
 * @returns {Array} scaled matrix
 */
var scale = exports.scale = function(m1, svec) {
   var sx = svec[0];
   var sy = svec[1];
   return multiply(m1, [sx, 0, 0, sy, 0, 0]);
};

}}, []);/* This file has been generated by yabbler.js */
require.define({
"gamejs/utils/objects": function(require, exports, module) {
/**
 * @fileoverview Utility functions for working with Objects
 */

/**
 * Put a prototype into the prototype chain of another prototype.
 * @param {Object} subClass
 * @param {Object} superClass
 */
exports.extend = function(subClass, superClass) {
   if (subClass === undefined) {
      throw new Error('unknown subClass');
   }
   if (superClass === undefined) {
      throw new Error('unknown superClass');
   }
   // new Function() is evil
   var f = new Function();
   f.prototype = superClass.prototype;

   subClass.prototype = new f();
   subClass.prototype.constructor = subClass;
   subClass.superClass = superClass.prototype;
   subClass.superConstructor = superClass;
   return;
};

/**
 * Creates a new object as the as the keywise union of the provided objects.
 * Whenever a key exists in a later object that already existed in an earlier
 * object, the according value of the earlier object takes precedence.
 * @param {Object} obj... The objects to merge
 */
exports.merge = function() {
   var result = {};
      for (var i = arguments.length; i > 0; --i) {
         var obj = arguments[i - 1];
         for (var property in obj) {
            result[property] = obj[property];
         }
      }
   return result;
};

/**
 * fallback for Object.keys
 * @param {Object} obj
 * @returns {Array} list of own properties
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/keys
 */
var keys = exports.keys = function(obj) {
   if (Object.keys) {
      return Object.keys(obj);
   }

   var ret=[],p;
   for (p in obj) {
      if(Object.prototype.hasOwnProperty.call(obj, p)) {
         ret.push(p);
      }
   }
   return ret;
};

/**
 * Create object accessors
 * @param {Object} object The object on which to define the property
 * @param {String} name name of the property
 * @param {Function} get
 * @param {Function} set
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/defineProperty
 */
var accessor = exports.accessor = function(object, name, get, set) {
   // ECMA5
   if (Object.defineProperty !== undefined) {
      Object.defineProperty(object, name, {
         get: get,
         set: set
      });
   // non-standard
   } else if (Object.prototype.__defineGetter__ !== undefined) {
      object.__defineGetter__(name, get);
      if (set) {
         object.__defineSetter__(name, set);
      }
   }
    return;
};

/**
 * @param {Object} object The object on which to define or modify properties.
 * @param {Object} props An object whose own enumerable properties constitute descriptors for the properties to be defined or modified.
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/defineProperties
 */
exports.accessors = function(object, props) {
   keys(props).forEach(function(propKey) {
      accessor(object, propKey, props[propKey].get, props[propKey].set);
   });
   return;
};

}}, []);/* This file has been generated by yabbler.js */
require.define({
"gamejs/utils/prng": function(require, exports, module) {
/**
 * @fileoverview A seedable random-number generator.
 *
 * A generator is initialized by GameJs and can be used with the
 * static functions (choose, integer, vector,...).
 *
 * You can re-initialize this generator with a different seed by
 * calling `gamejs.utils.prng.init(seed)` after which the static
 * functions in this module will use the new seed.
 *
 * @usage
 *  var prng = require('gamejs/utils/prng');
 *  prng.random(); // 0.6765871671959758
 *  prng.integer(2, 10); // 5
 *  prng.choose([1,2,3,4,5]); // 3
 */
// From http://baagoe.com/en/RandomMusings/javascript/
// Johannes Baagøe <baagoe@baagoe.com>, 2010
// API modified by Simon Oberhammer <simon@nekapuzer.at>, 2012
// discussion of the used algorithms <http://baagoe.org/en/w/index.php/Better_random_numbers_for_javascript>


/* @ignore */
var Mash = function Mash() {
  var n = 0xefc8249d;
  this.hash = function(data) {
    data = data.toString();
    for (var i = 0; i < data.length; i++) {
      n += data.charCodeAt(i);
      var h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };

  this.version = 'Mash 0.9';
  return this;
};

/**
 * A seedable pseudo-random number generator.
 * @param {Number|String} seed the seed for generating the numbers
 *
 * @usage
 *  var prng = require('gamejs/utils/prng');
 *  var seed = 'gamejs';
 *  var alea = new prng.Alea(seed);
 *  alea.random(); // 0.6765871671959758
 *  alea.random(); // 0.15881546027958393
 *
 *  // generator with the same seed will generate the same sequence
 *  // of numbers:
 *  var aleaTwo = new prng.Alea(seed);
 *  aleaTwo.random(); // 0.6765871671959758
 *  aleaTwo.random(); // 0.15881546027958393
 */
var Alea = exports.Alea = function Alea() {
   var args = Array.prototype.slice.call(arguments);
   var s0 = 0;
   var s1 = 0;
   var s2 = 0;
   var c = 1;
   if (args.length == 0 || !args[0]) {
     args = [+new Date];
   }
   var mash = new Mash();
   s0 = mash.hash(' ');
   s1 = mash.hash(' ');
   s2 = mash.hash(' ');

   for (var i = 0; i < args.length; i++) {
     s0 -= mash.hash(args[i]);
     if (s0 < 0) {
       s0 += 1;
     }
     s1 -= mash.hash(args[i]);
     if (s1 < 0) {
       s1 += 1;
     }
     s2 -= mash.hash(args[i]);
     if (s2 < 0) {
       s2 += 1;
     }
   }
   mash = null;

   /**
    * @returns {Number} the next random number as determined by the seed
    */
   this.random = function() {
     var t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
     s0 = s1;
     s1 = s2;
     return s2 = t - (c = t | 0);
   };
   return this;
};

// alea instance per gamejs instance
var alea = null;

/**
 * @param {Number} min
 * @param {Number} max
 * @returns {Number} random integer between min and max
 */
var integer = exports.integer = function(min, max){
    return min + parseInt(alea.random() * (max-min+1));
};

/**
 * @param {Array} minVector 2 integers, the minimum vector
 * @param {Array} maxVector 2 integers, the maximum vector
 * @returns {Array} a random vector [min[0]<=x<=max[0], min[1]<=y<=max[1]]
 */
exports.vector = function(min, max){
    return [integer(min[0], max[0]), integer(min[1], max[1])];
};

/**
 * @param {Array} items
 * @returns {Object} random item from items list
 */
exports.choose = function(items){
    return items[integer(0, items.length-1)];
};

/**
 * @returns {Number} next random float between 0 and 1
 */
exports.random = function() {
  return alea.random();
}

/*
 * Re-initialize the per instance random number generator used
 * in the static functions on this module (e.g. vector())
 * @param {Number|String} seed
 */
exports.init = function(seed) {
  alea = new Alea(seed);
}

}}, ["gamejs/utils/prng"]);/* This file has been generated by yabbler.js */
require.define({
"gamejs/utils/strings": function(require, exports, module) {
/**
 * Get the longest common segment that two strings
 * have in common, starting at the beginning of the string
 * @param {String} str1 a string
 * @param {String} str2 another string
 * @returns {String} the longest common segment
 */
exports.getCommonPrefix = function getCommonPrefix(str1, str2) {
    if (str1 == null || str2 == null) {
        return null;
    } else if (str1.length > str2.length && str1.indexOf(str2) == 0) {
        return str2;
    } else if (str2.length > str1.length && str2.indexOf(str1) == 0) {
        return str1;
    }
    var length = Math.min(str1.length, str2.length);
    for (var i = 0; i < length; i++) {
        if (str1[i] != str2[i]) {
            return str1.slice(0, i);
        }
    }
    return str1.slice(0, length);
}

}}, []);/* This file has been generated by yabbler.js */
require.define({
"gamejs/utils/uri": function(require, exports, module) {
/**
 * @fileoverview Utilies for URI handling.
 *
 */

var URI_REGEX = new RegExp(
    '^' +
    '(?:' +
      '([^:/?#.]+)' +                     // scheme - ignore special characters
                                          // used by other URL parts such as :,
                                          // ?, /, #, and .
    ':)?' +
    '(?://' +
      '(?:([^/?#]*)@)?' +                 // userInfo
      '([\\w\\d\\-\\u0100-\\uffff.%]*)' + // domain - restrict to letters,
                                          // digits, dashes, dots, percent
                                          // escapes, and unicode characters.
      '(?::([0-9]+))?' +                  // port
    ')?' +
    '([^?#]+)?' +                         // path
    '(?:\\?([^#]*))?' +                   // query
    '(?:#(.*))?' +                        // fragment
    '$');

/**
 * Resolve path against URI.
 *
 * @param {String} uri
 * @param {String} path to resolve
 */
var resolve = exports.resolve = function(uri, path) {
   var m = match(uri);
   var n = match(path);
   var host = m[1] + '://' + m[3];
   if (n[1]) {
      return path;
   }
   if (m[4]) {
      host = host + ":" + m[4];
   }
   var absolutePath = m[5];
   if (path.charAt(0) !== '/') {
      var lastSlashIndex = absolutePath.lastIndexOf('/');
      absolutePath = absolutePath.substr(0, lastSlashIndex + 1) + path;
   } else {
      absolutePath = path;
   }
   return host + removeDotSegments(absolutePath);

};

/**
 * Try to match an URI against a regex returning the following
 * capture groups:
 *     $1 = http              scheme
 *     $2 = <undefined>       userInfo -\
 *     $3 = www.ics.uci.edu   domain     | authority
 *     $4 = <undefined>       port     -/
 *     $5 = /pub/ietf/uri/    path
 *     $6 = <undefined>       query without ?
 *     $7 = Related           fragment without #
 *
 * @param {String} uri
 */
var match = exports.match = function(uri) {
   return uri.match(URI_REGEX);
}

/**
 * Make an absolute URI relative to document.location.href
 * @param {String} uri
 * @returns The relative URI or the unchanged URI if it's not
 * possible to make it relative to the path of document.location.href.
 */
var makeRelative = exports.makeRelative = function(uri) {
   var docLocPath = resolve(document.location.href, './');
   if (uri.indexOf(docLocPath) == 0) {
      uri = './' + uri.substring(docLocPath.length);
   }
   return uri;
};

/**
 * Removes dot segments in given path component
 */
var removeDotSegments = function(path) {
   if (path == '..' || path == '.') {
      return '';
   }
   var leadingSlash = path.indexOf('/') > -1;

   var segments = path.split('/');
   var out = [];

   for (var pos = 0; pos < segments.length; ) {
      var segment = segments[pos++];

      if (segment == '.') {
         if (leadingSlash && pos == segments.length) {
            out.push('');
         }
      } else if (segment == '..') {
         if (out.length > 1 || out.length == 1 && out[0] != '') {
            out.pop();
         }
         if (leadingSlash && pos == segments.length) {
            out.push('');
         }
      } else {
         out.push(segment);
         leadingSlash = true;
      }
   }
   return out.join('/');
};

}}, []);/* This file has been generated by yabbler.js */
require.define({
"gamejs/utils/vectors": function(require, exports, module) {
var math=require('./math');

/**
 * @param {Array} origin point [b0, b1]
 * @param {Array} target point [b0, b1]
 * @returns {Number} distance between two points
 */
exports.distance = function(a, b) {
   return len(subtract(a, b));
};

/**
 * subtracts vectors [a0, a1] - [a0, a1]
 * @param {Array} a
 * @param {Array} b
 * @returns {Array} vector
 */
var subtract = exports.subtract = function(a, b) {
   return [a[0] - b[0], a[1] - b[1]];
};

/**
 * adds vectors [a0, a1] - [a0, a1]
 * @param {Array} a vector
 * @param {Array} b vector
 * @returns {Array} vector
 */
var add = exports.add = function(a, b) {
   return [a[0] + b[0], a[1] + b[1]];
};

/**
 * multiply vector with scalar or other vector
 * @param {Array} vector [v0, v1]
 * @param {Number|Array} vector or number
 * @returns {Number|Array} result
 */
var multiply = exports.multiply = function(a, s) {
   if (typeof s === 'number') {
      return [a[0] * s, a[1] * s];
   }

   return [a[0] * s[0], a[1] * s[1]];
};

/**
 * @param {Array} a vector
 * @param {Number} s
 */
exports.divide = function(a, s) {
   if (typeof s === 'number') {
      return [a[0] / s, a[1] / s];
   }
   throw new Error('only divide by scalar supported');
};

/**
 * @param {Array} vector [v0, v1]
 * @returns {Number} length of vector
 */
var len = exports.len = function(v) {
   return Math.sqrt(v[0]*v[0] + v[1]*v[1]);
};

/**
 *
 * normalize vector to unit vector
 * @param {Array} vector [v0, v1]
 * @returns {Array} unit vector [v0, v1]
 */
var unit = exports.unit = function(v) {
   var l = len(v);
   if(l) return [v[0] / l, v[1] / l];
   return [0, 0];
};

/**
 *
 * rotate vector
 * @param {Array} vector [v0, v1]
 * @param {Number} angle to rotate vector by, radians. can be negative
 * @returns {Array} rotated vector [v0, v1]
 */
exports.rotate=function(v, angle){
   angle=math.normaliseRadians(angle);
   return [v[0]* Math.cos(angle)-v[1]*Math.sin(angle),
           v[0]* Math.sin(angle)+v[1]*Math.cos(angle)];

};

/**
 *
 * calculate vector dot product
 * @param {Array} vector [v0, v1]
 * @param {Array} vector [v0, v1]
 * @returns {Number} dot product of v1 and v2
 */
var dot = exports.dot=function(v1, v2){
   return (v1[0] * v2[0]) + (v1[1] * v2[1]);
};

/**
 *
 * calculate angle between vectors
 * @param {Array} vector [v0, v1]
 * @param {Array} vector [v0, v1]
 * @returns {Number} angle between v1 and v2 in radians
 */
exports.angle=function(v1, v2){
   var a1 = Math.atan2(v1[0], v1[1]);
   var a2 = Math.atan2(v2[0], v2[1]);
   var rel = a1 - a2;
   return (rel - Math.floor((rel + Math.PI) / (2 * Math.PI)) * (2 * Math.PI) - (2 * Math.PI)) % (Math.PI * 2)
};

/**
 * @returns {Array} vector with max length as specified.
 */
exports.truncate = function(v, maxLength) {
   if (len(v) > maxLength) {
      return multiply(unit(v), maxLength);
   };
   return v;
};

}}, ["gamejs/utils/math"]);/* This file has been generated by yabbler.js */
require.define({
"gamejs/worker": function(require, exports, module) {
var gamejs = require('../gamejs');
var uri = require('./utils/uri');

/**
 * @fileoverview
 * Workers are useful to relieve your GameJs application from code which
 * might take long to run. Either expensive algorithms, which might get called
 * every now and then (e.g., path-finding) or another logic being run continously
 * within the rendering loop (e.g., physics engine).
 *
 * A Worker is like a seperate GameJs application being executed - another `main.js`
 * with its own `gamejs.ready()`. The Worker's most important feature is that
 * code executing within it does not block the rendering code. The Worker's
 * greatest limitation is that you can only communicate with it through text
 * messages.
 *
 * See the `examples/workers` directory for a running example.
 *
 * @example
 *  // Create a worker with the main module "./test"
 *  var fooWorker = new Worker('./test');
 *  // Send a message to your worker.
 *  // The Message doesn't have to be a string but it must be `JSON.stringify()`-able
 *  fooWorker.post("foobar");
 *
 *  // The result of the worker will be accessible
 *  // in the main application via the gamejs.event queue
 *  if (event.type === gamejs.event.WORKER_RESULT) {
 *     gamejs.log('Worker #' + event.worker.id + ' returned ' + event.data);
 *  }
 *
 *  // In the worker module, we can send results back to the main application
 *  // by posting them to the gamejs event queue as type `gamejs.event.WORKER_RESULT`
 *  gamejs.event.post({
 *     type: gamejs.event.WORKER_RESULT,
 *     data: "zarzar"
 *  });
 *
 */

/**
 * true if this GameJs instance is being executed within a WebWorker
 * @type Boolean
 */
exports.inWorker = (this.importScripts !== undefined);

/**
 * Executed in scope of worker after user's main module
 * @ignore
 */
exports._ready = function () {
   var gamejs = require('gamejs');
   self.onmessage = function(event) {
      gamejs.event.post(event.data)
   };
   self.postMessage({
      type: gamejs.event.WORKER_ALIVE
   });
};

/**
 * Send message to main context for logging
 * @ignore
 **/
exports._logMessage = function() {
   self.postMessage({
      type: gamejs.event.WORKER_LOGMESSAGE,
      arguments: Array.prototype.slice.apply(arguments)
   });
};

/**
 * Send result message to main context
 * @ignore
 */
exports._messageMain = function(event) {
   self.postMessage({
      type: gamejs.event.WORKER_RESULT,
      data: event.data
   });
};

/**
  * executed in scope of worker before user's main module
  * @ignore
  */
var workerPrefix = function workerPrefix() {
   __scripts.forEach(function(script) {
      try {
         importScripts(script)
      } catch (e) {
         // can't help the worker
      }
   });
};

/**
 * Setup a worker which has `require()` defined
 * @ignore
 **/
var create = function(workerModuleId) {
   var moduleRoot = uri.resolve(document.location.href, window.require.getModuleRoot());
   var initialScripts = [];
   Array.prototype.slice.apply(document.getElementsByTagName('script'), [0]).forEach(function(script) {
      if (script.src) {
         initialScripts.push(script.src);
      }
   });

   var URL = window.URL || window.webkitURL;
   var prefixString = workerPrefix.toString();
   // don't be afraid...
   prefixString = prefixString.substring(prefixString.indexOf("{") + 1, prefixString.lastIndexOf("}"));
   var blob = new Blob([
      'var __scripts = ["' + initialScripts.join('","') + '"];',
      prefixString,
      'self.require.setModuleRoot("' + moduleRoot + '");',
      'self.require.run("'+ workerModuleId +'");'
   ], {type: 'application\/javascript'});

   var blobURL = URL.createObjectURL(blob);
   return new Worker(blobURL);
};

/**
 * The `Worker` constructor takes only one argument: a module id. This module
 * will be executed inside the newly created Worker. It is effectively the
 * main module of the Worker.
 *
 * Inside a Worker, you can use `require()` to import other scripts or
 * GameJs modules.
 *
 * **Note:** A Worker does not have access to the browser's `document`. So
 * a lot of GameJs modules - everything related to drawing to the canvas -
 * do not work in the Worker.
 *
 * You can use `gamejs.time.*`, `gamejs.utils.*`, `gamejs.event.*` and probably others
 * (as well as any module you write yourself for this purpose, of course).
 *
 * @param {String} moduleId The Worker's main module id. The main module will be executed in the worker
 */
exports.Worker = function(moduleId) {
   // FIXME id should be unchangeable
   /**
    * Unique id of this worker
    * @property {Number}
    */
   var id = this.id = guid(moduleId);
   var worker = create(moduleId);
   var deadQueue = [];
   var alive = false;
   var self  = this;

   worker.onmessage = function(event) {
      if (event.data.type === gamejs.event.WORKER_ALIVE) {
         alive = true;
         deadQueue.forEach(function(data) {
            self.post(data);
         });
      } else if (event.data.type === gamejs.event.WORKER_LOGMESSAGE) {
         gamejs.log.apply(null, [id].concat(event.data.arguments));
      } else {
         gamejs.event.post({
            type: gamejs.event.WORKER_RESULT,
            data: event.data.data,
            worker: self,
            event: event
         })
      }
   };
   worker.onerror = function(event) {
      gamejs.error('Error in worker "' + id + '" line ' + event.lineno + ': ', event.message)
      gamejs.event.post({
         type: gamejs.event.WORKER_ERROR,
         data: event.data,
         worker: self,
         event: event
      })
   };

   /**
    * Send a message to the worker
    *
    * @param {Object} data Payload object which gets sent to the Worker
    */
   this.post = function(data) {
      if (alive) {
         worker.postMessage({
            type: gamejs.event.WORKER,
            data: data
         });
      } else {
         deadQueue.push(data);
      }
   };
   return this;
}

/**
 * not a real GUID
 * @ignore
 */
function guid(moduleId) {
   var S4 = function() {
      return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
   };
   return moduleId + '@' + (S4()+S4());
}

}}, ["gamejs", "gamejs/utils/uri", "gamejs"]);/* This file has been generated by yabbler.js */
require.define({
"gamejs/xml": function(require, exports, module) {
/**
 * @fileoverview
 *
 * Provides facilities for parsing an xml String.
 * 
 * You will typically get a `gamejs.xml.Document` instance
 * by loading the data with one of the two static 
 * `Document.fromString(string)` or `Document.fromUrl(url)`.

 * Querying for `elements(name)` or `children()` will return a
 * new `gamejs.xml.Document` matching your result (or null).
 *
 * Use `attributes(name)` and `value()` to get the data stored
 * in the XML Document.
 */

/**
 * XMLParser
 */
var Parser = exports.Parser = function() {

   var xmlDoc = null;
   var parser = new DOMParser();
   
   this.parseFromString = function(xmlString) {
      xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      return xmlDoc;
   };
   
   return this;
};

/**
 * Instantiate with the static functions `Document.fromString()` and `fromURL()`.
 */
var Document = exports.Document = function(xmlDocument) {   
   if (!xmlDocument || (!xmlDocument instanceof XMLDocument) ) {
      throw new Error('Need a valid xmlDocument.');
   }
   /** @ignore **/
   this._xmlDocument = xmlDocument;
   return this;
};

/**
 * Returns the first element in the current document whose tag-name matches
 * the given 'name'.
 * @returns gamejs.xml.Document
 */
Document.prototype.element = function(name) {
   var elem = this._xmlDocument.getElementsByTagName(name)[0];
   return elem && new Document(elem) || null;
};

/**
 * Returns all elements in the current document whose tag-name matches
 * the given 'name'.
 * @returns an Array of gamejs.xml.Document
 */
Document.prototype.elements = function(name) {
   var elems = this._xmlDocument.getElementsByTagName(name);
   return Array.prototype.slice.apply(elems, [0]).map(function(elem) {
      return new Document(elem);
   });
};

/**
 * Returns the attribute value of this document.
 *
 * @returns String
 */
Document.prototype.attribute = function(name) {
   var attributeValue = this._xmlDocument.getAttribute(name);
   attributeValue = attributeValue ? attributeValue.trim() : null;
   if (attributeValue === null) {
      return null;
   }
   if (attributeValue.toLowerCase() === 'true') {
      return true;
   }
   if (attributeValue.toLowerCase() === 'false') {
      return false;
   }
   var attributeIntValue = parseInt(attributeValue, 10);
   var attributeFloatValue = parseFloat(attributeValue, 10);
   if (!isNaN(attributeIntValue)) {
      if (attributeFloatValue !== attributeIntValue) {
         return attributeFloatValue;
      }
      return attributeIntValue;
   }
   return attributeValue;
};

/**
 * Returns the nodevalue of the current xml document
 * @returns String
 */
Document.prototype.value = function() {
   return this._xmlDocument.nodeValue;
};

/**
 * Returns all children of this xml document
 * @returns Array of gamejs.xml.Document
 */
Document.prototype.children = function() {
   return Array.prototype.slice.apply(this._xmlDocument.childNodes, [0]).map(function(cNode) {
      return new Document(cNode);
   });
};

/**
 * @returns gamejs.xml.Document
 */
Document.fromString = function(xmlString) {
   var parser = new DOMParser();
   var xmlDoc = parser.parseFromString(xmlString, 'text/xml');
   return new Document(xmlDoc);
};

/**
 * @returns gamejs.xml.Document
 */
Document.fromURL = function(url) {
   var response = new XMLHttpRequest();
   response.open('GET', url, false);
   response.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
   response.setRequestHeader('Content-Type', 'text/xml');
   response.overrideMimeType('text/xml');
   response.send();
   return new Document(response.responseXML);
};

}}, []);/* This file has been generated by yabbler.js */
require.define({
"gamejs": function(require, exports, module) {
var matrix = require('./gamejs/utils/matrix');
var objects = require('./gamejs/utils/objects');

/**
 * @fileoverview This module holds the essential `Rect` and `Surface` classes as
 * well as static methods for preloading assets. `gamejs.ready()` is maybe
 * the most important as it kickstarts your app.
 *
 */

var DEBUG_LEVELS = ['info', 'warn', 'error', 'fatal'];
var debugLevel = 2;

/**
 * set logLevel as string or number
 *   * 0 = info
 *   * 1 = warn
 *   * 2 = error
 *   * 3 = fatal
 *
 * @example
 * gamejs.setLogLevel(0); // debug
 * gamejs.setLogLevel('error'); // equal to setLogLevel(2)
 */
exports.setLogLevel = function(logLevel) {
   if (typeof logLevel === 'string' && DEBUG_LEVELS.indexOf(logLevel)) {
      debugLevel = DEBUG_LEVELS.indexOf(logLevel);
   } else if (typeof logLevel === 'number') {
      debugLevel = logLevel;
   } else {
      throw new Error('invalid logLevel ', logLevel, ' Must be one of: ', DEBUG_LEVELS);
   }
   return debugLevel;
};
/**
 * Log a msg to the console if console is enable
 * @param {String} msg the msg to log
 */
var log = exports.log = function() {

   if (gamejs.worker.inWorker === true) {
      gamejs.worker._logMessage(arguments);
      return;
   }

   // IEFIX can't call apply on console
   var args = Array.prototype.slice.apply(arguments, [0]);
   args.unshift(Date.now());
   if (window.console !== undefined && console.log.apply) {
      console.log.apply(console, args);
   }
};
exports.info = function() {
   if (debugLevel <= DEBUG_LEVELS.indexOf('info')) {
      log.apply(this, arguments);
   }
};
exports.warn = function() {
   if (debugLevel <= DEBUG_LEVELS.indexOf('warn')) {
      log.apply(this, arguments);
   }
};
exports.error = function() {
   if (debugLevel <= DEBUG_LEVELS.indexOf('error')) {
      log.apply(this, arguments);
   }
};
exports.fatal = function() {
   if (debugLevel <= DEBUG_LEVELS.indexOf('fatal')) {
      log.apply(this, arguments);
   }
};

/**
 * Normalize various ways to specify a Rect into {left, top, width, height} form.
 *
 */
function normalizeRectArguments() {
   var left = 0;
   var top = 0;
   var width = 0;
   var height = 0;

   if (arguments.length === 2) {
      if (arguments[0] instanceof Array && arguments[1] instanceof Array) {
         left = arguments[0][0];
         top = arguments[0][1];
         width = arguments[1][0];
         height = arguments[1][1];
      } else {
         left = arguments[0];
         top = arguments[1];
      }
   } else if (arguments.length === 1 && arguments[0] instanceof Array) {
      left = arguments[0][0];
      top = arguments[0][1];
      width = arguments[0][2];
      height = arguments[0][3];
   } else if (arguments.length === 1 && arguments[0] instanceof Rect) {
      left = arguments[0].left;
      top = arguments[0].top;
      width = arguments[0].width;
      height = arguments[0].height;
   } else if (arguments.length === 4) {
      left = arguments[0];
      top = arguments[1];
      width = arguments[2];
      height = arguments[3];
   } else {
      throw new Error('not a valid rectangle specification');
   }
   return {left: left || 0, top: top || 0, width: width || 0, height: height || 0};
}

/**
 * Creates a Rect. Rects are used to hold rectangular areas. There are a couple
 * of convinient ways to create Rects with different arguments and defaults.
 *
 * Any function that requires a `gamejs.Rect` argument also accepts any of the
 * constructor value combinations `Rect` accepts.
 *
 * Rects are used a lot. They are good for collision detection, specifying
 * an area on the screen (for blitting) or just to hold an objects position.
 *
 * The Rect object has several virtual attributes which can be used to move and align the Rect:
 *
 *   top, left, bottom, right
 *   topleft, bottomleft, topright, bottomright
 *   center
 *   width, height
 *   w,h
 *
 * All of these attributes can be assigned to.
 * Assigning to width or height changes the dimensions of the rectangle; all other
 * assignments move the rectangle without resizing it. Notice that some attributes
 * are Numbers and others are pairs of Numbers.
 *
 * @example
 * new Rect([left, top]) // width & height default to 0
 * new Rect(left, top) // width & height default to 0
 * new Rect(left, top, width, height)
 * new Rect([left, top], [width, height])
 * new Rect(oldRect) // clone of oldRect is created
 *
 * @property {Number} right
 * @property {Number} bottom
 * @property {Number} center
 *
 * @param {Array|gamejs.Rect} position Array holding left and top coordinates
 * @param {Array} dimensions Array holding width and height
 */
var Rect = exports.Rect = function() {

   var args = normalizeRectArguments.apply(this, arguments);

   /**
    * Left, X coordinate
    * @type Number
    */
   this.left = args.left;

   /**
    * Top, Y coordinate
    * @type Number
    */
   this.top = args.top;

   /**
    * Width of rectangle
    * @type Number
    */
   this.width = args.width;

   /**
    * Height of rectangle
    * @type Number
    */
   this.height = args.height;

   return this;
};

objects.accessors(Rect.prototype, {
   /**
    * Bottom, Y coordinate
    * @name Rect.prototype.bottom
    * @type Number
    */
   'bottom': {
      get: function() {
         return this.top + this.height;
      },
      set: function(newValue) {
         this.top = newValue - this.height;
         return;
      }
   },
   /**
    * Right, X coordinate
    * @name Rect.prototype.right
    * @type Number
    */
   'right': {
      get: function() {
         return this.left + this.width;
      },
      set: function(newValue) {
         this.left = newValue - this.width;
      }
   },
   /**
    * Center Position. You can assign a rectangle form.
    * @name Rect.prototype.center
    * @type Array
    */
   'center': {
      get: function() {
         return [this.left + (this.width / 2) | 0,
                 this.top + (this.height / 2) | 0
                ];
      },
      set: function() {
         var args = normalizeRectArguments.apply(this, arguments);
         this.left = args.left - (this.width / 2) | 0;
         this.top = args.top - (this.height / 2) | 0;
         return;
      }
   },
   /**
    * Top-left Position. You can assign a rectangle form.
    * @name Rect.prototype.topleft
    * @type Array
    */
   'topleft': {
      get: function() {
         return [this.left, this.top];
      },
      set: function() {
         var args = normalizeRectArguments.apply(this, arguments);
         this.left = args.left;
         this.top = args.top;
         return;
      }
   },
   /**
    * Bottom-left Position. You can assign a rectangle form.
    * @name Rect.prototype.bottomleft
    * @type Array
    */
   'bottomleft': {
      get: function() {
         return [this.left, this.bottom];
      },
      set: function() {
         var args = normalizeRectArguments.apply(this, arguments);
         this.left = args.left;
         this.bottom = args.top;
         return;
      }
   },
   /**
    * Top-right Position. You can assign a rectangle form.
    * @name Rect.prototype.topright
    * @type Array
    */
   'topright': {
      get: function() {
         return [this.right, this.top];
      },
      set: function() {
         var args = normalizeRectArguments.apply(this, arguments);
         this.right = args.left;
         this.top = args.top;
         return;
      }
   },
   /**
    * Bottom-right Position. You can assign a rectangle form.
    * @name Rect.prototype.bottomright
    * @type Array
    */
   'bottomright': {
      get: function() {
         return [this.right, this.bottom];
      },
      set: function() {
         var args = normalizeRectArguments.apply(this, arguments);
         this.right = args.left;
         this.bottom = args.top;
         return;
      }
   },
   /**
    * Position x value, alias for `left`.
    * @name Rect.prototype.y
    * @type Array
    */
   'x': {
      get: function() {
         return this.left;
      },
      set: function(newValue) {
         this.left = newValue;
         return;
      }
   },
   /**
    * Position y value, alias for `top`.
    * @name Rect.prototype.y
    * @type Array
    */
   'y': {
      get: function() {
         return this.top;
      },
      set: function(newValue) {
         this.top = newValue;
         return;
      }
   }
});

/**
 * Move returns a new Rect, which is a version of this Rect
 * moved by the given amounts. Accepts any rectangle form.
 * as argument.
 *
 * @param {Number|gamejs.Rect} x amount to move on x axis
 * @param {Number} y amount to move on y axis
 */
Rect.prototype.move = function() {
   var args = normalizeRectArguments.apply(this, arguments);
   return new Rect(this.left + args.left, this.top + args.top, this.width, this.height);
};

/**
 * Move this Rect in place - not returning a new Rect like `move(x, y)` would.
 *
 * `moveIp(x,y)` or `moveIp([x,y])`
 *
 * @param {Number|gamejs.Rect} x amount to move on x axis
 * @param {Number} y amount to move on y axis
 */
Rect.prototype.moveIp = function() {
   var args = normalizeRectArguments.apply(this, arguments);
   this.left += args.left;
   this.top += args.top;
   return;
};

/**
 * Return the area in which this Rect and argument Rect overlap.
 *
 * @param {gamejs.Rect} Rect to clip this one into
 * @returns {gamejs.Rect} new Rect which is completely inside the argument Rect,
 * zero sized Rect if the two rectangles do not overlap
 */
Rect.prototype.clip = function(rect) {
   if(!this.collideRect(rect)) {
      return new Rect(0,0,0,0);
   }

   var x, y, width, height;

   // Left
   if ((this.left >= rect.left) && (this.left < rect.right)) {
      x = this.left;
   } else if ((rect.left >= this.left) && (rect.left < this.right)) {
      x = rect.left;
   }

   // Right
   if ((this.right > rect.left) && (this.right <= rect.right)) {
      width = this.right - x;
   } else if ((rect.right > this.left) && (rect.right <= this.right)) {
      width = rect.right - x;
   }

   // Top
   if ((this.top >= rect.top) && (this.top < rect.bottom)) {
      y = this.top;
   } else if ((rect.top >= this.top) && (rect.top < this.bottom)) {
      y = rect.top;
   }

   // Bottom
   if ((this.bottom > rect.top) && (this.bottom <= rect.bottom)) {
     height = this.bottom - y;
   } else if ((rect.bottom > this.top) && (rect.bottom <= this.bottom)) {
     height = rect.bottom - y;
   }
   return new Rect(x, y, width, height);
};

/**
 * Join two rectangles
 *
 * @param {gamejs.Rect} union with this rectangle
 * @returns {gamejs.Rect} rectangle containing area of both rectangles
 */
Rect.prototype.union = function(rect) {
   var x, y, width, height;

   x = Math.min(this.left, rect.left);
   y = Math.min(this.top, rect.top);
   width = Math.max(this.right, rect.right) - x;
   height = Math.max(this.bottom, rect.bottom) - y;
   return new Rect(x, y, width, height);
};

/**
 * Grow or shrink the rectangle size
 *
 * @param {Number} amount to change in the width
 * @param {Number} amount to change in the height
 * @returns {gamejs.Rect} inflated rectangle centered on the original rectangle's center
 */
Rect.prototype.inflate = function(x, y) {
    var copy = this.clone();

    copy.inflateIp(x, y);

    return copy;
}

/**
 * Grow or shrink this Rect in place - not returning a new Rect like `inflate(x, y)` would.
 *
 * @param {Number} amount to change in the width
 * @param {Number} amount to change in the height
 */
Rect.prototype.inflateIp = function(x, y) {
    // Use Math.floor here to deal with rounding of negative numbers the
    // way this relies on.
    this.left -= Math.floor(x / 2);
    this.top -= Math.floor(y / 2);
    this.width += x;
    this.height += y;
}

/**
 * Check for collision with a point.
 *
 * `collidePoint(x,y)` or `collidePoint([x,y])` or `collidePoint(new Rect(x,y))`
 *
 * @param {Array|gamejs.Rect} point the x and y coordinates of the point to test for collision
 * @returns {Boolean} true if the point collides with this Rect
 */
Rect.prototype.collidePoint = function() {
   var args = normalizeRectArguments.apply(this, arguments);
   return (this.left <= args.left && args.left <= this.right) &&
       (this.top <= args.top && args.top <= this.bottom);
};

/**
 * Check for collision with a Rect.
 * @param {gamejs.Rect} rect the Rect to test check for collision
 * @returns {Boolean} true if the given Rect collides with this Rect
 */
Rect.prototype.collideRect = function(rect) {
   return !(this.left > rect.right || this.right < rect.left ||
      this.top > rect.bottom || this.bottom < rect.top);
};

/**
 * @param {Array} pointA start point of the line
 * @param {Array} pointB end point of the line
 * @returns true if the line intersects with the rectangle
 * @see http://stackoverflow.com/questions/99353/how-to-test-if-a-line-segment-intersects-an-axis-aligned-rectange-in-2d/293052#293052
 *
 */
Rect.prototype.collideLine = function(p1, p2) {
   var x1 = p1[0];
   var y1 = p1[1];
   var x2 = p2[0];
   var y2 = p2[1];

   function linePosition(point) {
      var x = point[0];
      var y = point[1];
      return (y2 - y1) * x + (x1 - x2) * y + (x2 * y1 - x1 * y2);
   }

   var relPoses = [[this.left, this.top],
                   [this.left, this.bottom],
                   [this.right, this.top],
                   [this.right, this.bottom]
                  ].map(linePosition);

   var noNegative = true;
   var noPositive = true;
   var noZero = true;
   relPoses.forEach(function(relPos) {
      if (relPos > 0) {
         noPositive = false;
      } else if (relPos < 0) {
         noNegative = false;
      } else if (relPos === 0) {
         noZero = false;
      }
   }, this);

   if ( (noNegative || noPositive) && noZero) {
      return false;
   }
   return !((x1 > this.right && x2 > this.right) ||
            (x1 < this.left && x2 < this.left) ||
            (y1 < this.top && y2 < this.top) ||
            (y1 > this.bottom && y2 > this.bottom)
            );
};

/**
 * @returns {String} Like "[x, y][w, h]"
 */
Rect.prototype.toString = function() {
   return ["[", this.left, ",", this.top, "]"," [",this.width, ",", this.height, "]"].join("");
};

/**
 * @returns {gamejs.Rect} A new copy of this rect
 */
Rect.prototype.clone = function() {
   return new Rect(this);
};

/**
 * A Surface represents a bitmap image with a fixed width and height. The
 * most important feature of a Surface is that they can be `blitted`
 * onto each other.
 *
 * @example
 * new gamejs.Surface([width, height]);
 * new gamejs.Surface(width, height);
 * new gamejs.Surface(rect);
 * @constructor
 *
 * @param {Array} dimensions Array holding width and height
 */
var Surface = exports.Surface = function() {
   var args = normalizeRectArguments.apply(this, arguments);
   var width = args.left;
   var height = args.top;
   // unless argument is rect:
   if (arguments.length == 1 && arguments[0] instanceof Rect) {
      width = args.width;
      height = args.height;
   }
   // only for rotatation & scale
   /** @ignore */
   this._matrix = matrix.identity();
   /** @ignore */
    this._canvas = document.createElement("canvas");
    this._canvas.width = width;
    this._canvas.height = height;
    /** @ignore */
    this._blitAlpha = 1.0;

   /** @ignore */
   this._context = this._canvas.getContext('2d');
   // using exports is weird but avoids circular require
   if (exports.display._isSmoothingEnabled()) {
      this._smooth();
   } else {
      this._noSmooth();
   }
   return this;
};

/** @ignore */
Surface.prototype._noSmooth = function() {
    // disable image scaling
    // see https://developer.mozilla.org/en/Canvas_tutorial/Using_images#Controlling_image_scaling_behavior
    // and https://github.com/jbuck/processing-js/commit/65de16a8340c694cee471a2db7634733370b941c
    this.context.mozImageSmoothingEnabled = false;
  this.context.webkitImageSmoothingEnabled = false;
   return;
};
/** @ignore */
Surface.prototype._smooth = function() {
  this.context.mozImageSmoothingEnabled = true;
  this.context.webkitImageSmoothingEnabled = true;

};

/**
 * Blits another Surface on this Surface. The destination where to blit to
 * can be given (or it defaults to the top left corner) as well as the
 * Area from the Surface which should be blitted (e.g., for cutting out parts of
 * a Surface).
 *
 * @example
 * // blit flower in top left corner of display
 * displaySurface.blit(flowerSurface);
 *
 * // position flower at 10/10 of display
 * displaySurface.blit(flowerSurface, [10, 10])
 *
 * // ... `dest` can also be a rect whose topleft position is taken:
 * displaySurface.blit(flowerSurface, new gamejs.Rect([10, 10]);
 *
 * // only blit half of the flower onto the display
 * var flowerRect = flowerSurface.rect;
 * flowerRect = new gamejs.Rect([0,0], [flowerRect.width/2, flowerRect.height/2])
 * displaySurface.blit(flowerSurface, [0,0], flowerRect);
 *
 * @param {gamejs.Surface} src The Surface which will be blitted onto this one
 * @param {gamejs.Rect|Array} dst the Destination x, y position in this Surface.
 *            If a Rect is given, it's top and left values are taken. If this argument
 *            is not supplied the blit happens at [0,0].
 * @param {gamesjs.Rect|Array} area the Area from the passed Surface which
 *            should be blitted onto this Surface.
 * @param {Number} compositionOperation how the source and target surfaces are composited together; one of: source-atop, source-in, source-out, source-over (default), destination-atop, destination-in, destination-out, destination-over, lighter, copy, xor; for an explanation of these values see: http://dev.w3.org/html5/2dcontext/#dom-context-2d-globalcompositeoperation
 * @returns {gamejs.Rect} Rect actually repainted FIXME actually return something?
 */
Surface.prototype.blit = function(src, dest, area, compositeOperation) {

   var rDest, rArea;

   if (dest instanceof Rect) {
      rDest = dest.clone();
      var srcSize = src.getSize();
      if (!rDest.width) {
         rDest.width = srcSize[0];
      }
      if (!rDest.height) {
         rDest.height = srcSize[1];
      }
    } else if (dest && dest instanceof Array && dest.length == 2) {
      rDest = new Rect(dest, src.getSize());
    } else {
      rDest = new Rect([0,0], src.getSize());
    }
   compositeOperation = compositeOperation || 'source-over';

   // area within src to be drawn
   if (area instanceof Rect) {
      rArea = area;
   } else if (area && area instanceof Array && area.length == 2) {
      var size = src.getSize();
      rArea = new Rect(area, [size[0] - area[0], size[1] - area[1]]);
   } else {
      rArea = new Rect([0,0], src.getSize());
   }

   if (isNaN(rDest.left) || isNaN(rDest.top) || isNaN(rDest.width) || isNaN(rDest.height)) {
      throw new Error('[blit] bad parameters, destination is ' + rDest);
   }

   this.context.save();
   this.context.globalCompositeOperation = compositeOperation;
   // first translate, then rotate
   var m = matrix.translate(matrix.identity(), rDest.left, rDest.top);
   m = matrix.multiply(m, src._matrix);
   this.context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
   // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
   this.context.globalAlpha = src._blitAlpha;
   this.context.drawImage(src.canvas, rArea.left, rArea.top, rArea.width, rArea.height, 0, 0, rDest.width, rDest.height);
   this.context.restore();
   return;
};

/**
 * @returns {Number[]} the width and height of the Surface
 */
Surface.prototype.getSize = function() {
   return [this.canvas.width, this.canvas.height];
};

/**
 * Obsolte, only here for compatibility.
 * @deprecated
 * @ignore
 * @returns {gamejs.Rect} a Rect of the size of this Surface
 */
Surface.prototype.getRect = function() {
   return new Rect([0,0], this.getSize());
};

/**
 * Fills the whole Surface with a color. Usefull for erasing a Surface.
 * @param {String} CSS color string, e.g. '#0d120a' or '#0f0' or 'rgba(255, 0, 0, 0.5)'
 * @param {gamejs.Rect} a Rect of the area to fill (defauts to entire surface if not specified)
 */
Surface.prototype.fill = function(color, rect) {
   this.context.save();
   this.context.fillStyle = color || "#000000";
   if ( rect === undefined )
       rect = new Rect(0, 0, this.canvas.width, this.canvas.height);

   this.context.fillRect(rect.left, rect.top, rect.width, rect.height);
   this.context.restore();
   return;
};

/**
 * Clear the surface.
 */
Surface.prototype.clear = function(rect) {
   var size = this.getSize();
   rect = rect || new Rect(0, 0, size[0], size[1]);
   this.context.clearRect(rect.left, rect.top, rect.width, rect.height);
   return;
};

objects.accessors(Surface.prototype, {
   /**
    * @type gamejs.Rect
    */
   'rect': {
      get: function() {
         return this.getRect();
      }
   },
   /**
    * @ignore
    */
   'context': {
      get: function() {
         return this._context;
      }
   },
   'canvas': {
      get: function() {
         return this._canvas;
      }
   }
});

/**
 * @returns {gamejs.Surface} a clone of this surface
 */
Surface.prototype.clone = function() {
  var newSurface = new Surface(this.getRect());
  newSurface.blit(this);
  return newSurface;
};

/**
 * @returns {Number} current alpha value
 */
Surface.prototype.getAlpha = function() {
   return (1 - this._blitAlpha);
};

/**
 * Set the alpha value for the whole Surface. When blitting the Surface on
 * a destination, the pixels will be drawn slightly transparent.
 * @param {Number} alpha value in range 0.0 - 1.0
 * @returns {Number} current alpha value
 */
Surface.prototype.setAlpha = function(alpha) {
   if (isNaN(alpha) || alpha < 0 || alpha > 1) {
      return;
   }

   this._blitAlpha = (1 - alpha);
   return (1 - this._blitAlpha);
};

/**
 * The data must be represented in left-to-right order, row by row top to bottom,
 * starting with the top left, with each pixel's red, green, blue, and alpha components
 * being given in that order for each pixel.
 * @see http://dev.w3.org/html5/2dcontext/#canvaspixelarray
 * @returns {ImageData} an object holding the pixel image data {data, width, height}
 */
Surface.prototype.getImageData = function() {
   var size = this.getSize();
   return this.context.getImageData(0, 0, size[0], size[1]);
};

/**
 * @ignore
 */
exports.display = require('./gamejs/display');
/**
 * @ignore
 */
exports.draw = require('./gamejs/draw');
/**
 * @ignore
 */
exports.event = require('./gamejs/event');
/**
 * @ignore
 */
exports.font = require('./gamejs/font');
/**
 * @ignore
 */
exports.http = require('./gamejs/http');
/**
 * @ignore
 */
exports.image = require('./gamejs/image');
/**
 * @ignore
 */
exports.mask = require('./gamejs/mask');
/**
 * @ignore
 */
exports.mixer = require('./gamejs/mixer');
/**
 * @ignore
 */
exports.sprite = require('./gamejs/sprite');
/**
 * @ignore
 */
exports.surfacearray = require('./gamejs/surfacearray');
/**
 * @ignore
 */
exports.time = require('./gamejs/time');
/**
 * @ignore
 */
exports.transform = require('./gamejs/transform');

/**
 * @ignore
 */
exports.utils = {
   arrays: require('./gamejs/utils/arrays'),
   objects: require('./gamejs/utils/objects'),
   matrix: require('./gamejs/utils/matrix'),
   vectors: require('./gamejs/utils/vectors'),
   math: require('./gamejs/utils/math'),
   uri: require('./gamejs/utils/uri'),
   prng: require('./gamejs/utils/prng'),
   base64: require('./gamejs/utils/base64')
};

/**
 * @ignore
 */
exports.pathfinding = {
   astar: require('./gamejs/pathfinding/astar')
};

/**
 * @ignore
 */
exports.worker = require('./gamejs/worker');

/**
 * @ignore
 */
exports.xml = require('./gamejs/xml');

/**
 * @ignore
 */
exports.tmx = require('./gamejs/tmx');

/**
 * @ignore
 */
exports.noise = require('./gamejs/noise');

// preloading stuff
var gamejs = exports;
var RESOURCES = {};

/**
 * ReadyFn is called once all modules and assets are loaded.
 * @param {Function} readyFn the function to be called once gamejs finished loading
 * @name ready
 */
if (gamejs.worker.inWorker === true) {
   exports.ready = function(readyFn) {
      gamejs.worker._ready();
      gamejs.init();
      readyFn();
   }
} else {
   exports.ready = function(readyFn) {

      var getMixerProgress = null;
      var getImageProgress = null;

      // init time instantly - we need it for preloaders
      gamejs.time.init();

      // 2.
      function _ready() {
         if (!document.body) {
            return window.setTimeout(_ready, 50);
         }
         getImageProgress = gamejs.image.preload(RESOURCES);
         try {
            getMixerProgress = gamejs.mixer.preload(RESOURCES);
         } catch (e) {
            gamejs.debug('Error loading audio files ', e);
         }
         window.setTimeout(_readyResources, 50);
      }

      // 3.
      function _readyResources() {
         if (getImageProgress() < 1 || getMixerProgress() < 1) {
            return window.setTimeout(_readyResources, 100);
         }
         gamejs.display.init();
         gamejs.image.init();
         gamejs.mixer.init();
         gamejs.event.init();
         gamejs.utils.prng.init();
         readyFn();
      }

      // 1.
      window.setTimeout(_ready, 13);

      function getLoadProgress() {
         if (getImageProgress) {
            return (0.5 * getImageProgress()) + (0.5 * getMixerProgress());
         }
         return 0.1;
      }

      return getLoadProgress;
   };
}

/**
 * Initialize all gamejs modules. This is automatically called
 * by `gamejs.ready()`.
 * @returns {Object} the properties of this objecte are the moduleIds that failed, they value are the exceptions
 * @ignore
 */
exports.init = function() {
   var errorModules = {};
   ['time', 'display', 'image', 'mixer', 'event'].forEach(function(moduleName) {
      try {
         gamejs[moduleName].init();
      } catch (e) {
         errorModules[moduleName] = e.toString();
      }
   });
   return errorModules;
}

function resourceBaseHref() {
    return (window.$g && window.$g.resourceBaseHref) || document.location.href;
}

/**
 * Preload resources.
 * @param {Array} resources list of resources paths
 * @name preload
 */
var preload = exports.preload = function(resources) {
   var uri = require('./gamejs/utils/uri');
   var baseHref = resourceBaseHref();
   resources.forEach(function(res) {
      RESOURCES[res] = uri.resolve(baseHref, res);
   }, this);
   return;
};

}}, ["gamejs/utils/matrix", "gamejs/utils/objects", "gamejs/display", "gamejs/draw", "gamejs/event", "gamejs/font", "gamejs/http", "gamejs/image", "gamejs/mask", "gamejs/mixer", "gamejs/sprite", "gamejs/surfacearray", "gamejs/time", "gamejs/transform", "gamejs/utils/arrays", "gamejs/utils/vectors", "gamejs/utils/math", "gamejs/utils/uri", "gamejs/utils/prng", "gamejs/utils/base64", "gamejs/pathfinding/astar", "gamejs/worker", "gamejs/xml", "gamejs/tmx", "gamejs/noise"]);;/*global require */

//----------------------------------------------------- BEGIN gamejs bootstrap
// Simple bit of code for now to unwrap gamejs from an annoying
// requirements system.
require.define({ "unwrapgamejs": function(require, exports, module) {
    // Yep, we make it global. End of story.
    var gamejs = require('gamejs');
    gamejs.ready(function() {
        window.gamejs = gamejs;
    });
// The tail end of the browser side module implementation via yabble.
}}, ["gamejs"]);
// All that this does is make gamejs global.
// Usage from here is up to the consumer.
require.run("unwrapgamejs");

// Make sure we correctly load gamejs and it is available to us.
(function gamejs_library_available() {
    if (!window.gamejs) {
        setTimeout(gamejs_library_available, 50);
        return;
    }
    else {
        // We can now initialize dasspiel.
        window.$g.init();
    }
})();
//----------------------------------------------------- END gamejs bootstrap



// Begin the $g module.
(function(exports) {



// A debugging logger. Easy to turn off.
// This should be called for warnings.
var debug_warn = function() {
    console.warn.apply(console, arguments);
};


/**
 * @class Top level game application. There will be one Game object per
 * browser game in this version of code, and the Game object will be referenced
 * by $g.
 * 
 * @singleton
 */
var $g = Object.create(null);
$g = {
    // RESERVED KEYS for external modules attached to the game.
    assets: null,
    collisions: null,
    // gamejs collection of modules referenced during $g.init().
    gamejs: null,
    Noise: null,
    Particle: null,
    ScoreKeeper: null,
    TextOverlay: null,
    
    /**
     * To be called when all items that we need have been loaded.
     * (Note: for now, should not be called outside of this module.)
     */
    init: function() {
        // This will allow any waiting ready callbacks to fire.
        this.gamejs = window.gamejs;        
    },
    
    /**
     * SHORT TERM SOLUTION! Take an img element and turn it into a gamejs
     * friendly surface.
     * @param img {DOMElement} An image element where we assume the image
     * hosted by the element has been loaded.
     * @return {Surface} A gamejs surface.
     */
    imgToSurface: function(img) {
        var canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        var context = canvas.getContext('2d');
        // For now, images are always placed in the upper left corner of
        // the canvas.
        context.drawImage(img, 0, 0);
        // Obviously gamejs must be loaded before we can use this.
        var surface = new this.gamejs.Surface([img.naturalWidth, img.naturalHeight]);
        // Just copying what was done in gamejs for now until I rewrite
        // the Surface object.
        surface._canvas = canvas;
        surface._context = context;
        return surface;        
    },


    /**
     * A collection for objects local to a specific game. $g promises 
     * to never attach anything to local by itself.
     * 
     * @example
     * // Attach an object to the local object.
     * // Assumed that objects will only be set once and a soft warning
     * // will be logged if multiple sets are performed on the same key.
     * $g.local("key", val);
     * // Get an object reference from local.
     * $g.local("key");
     * // or for faster reference, the local function-object also acts as
     * // the hash.
     * $g.local.key;
     * // or
     * $g.local["non-dot friendly key"]
     * @param key {String} The key to get or set.
     * @param value {mixed} If included, the value to set the key to (makes
     * the function act as a setter.
     * @return {$g|mixed} If called as a setter, will return $g for
     * chained setting. If called as a get, will return the value of the
     * key, whatever it is.
     */
    local: function(key, value) {
        if (arguments.length === 1) {
            // Getter.
            return $g.local[key];
        }
        else if (arguments.length === 2) {
            // Setter.
            if (key in $g.local) {
                debug_warn("Already attached "+key+". Assuming not intended to replace?");
            }
            
            $g.local[key] = value;
            return $g;
        }
        else {
            // Bad.
            debug_warn("Unexpected number of arguments:", arguments);
            // Don't return anything, as this is an error case.
        }
    },
    
    /**
     * The canvas representation of the entire game area.
     * Ultimately this is where all visible objects should be blitted.
     * @type {Surface}
     */
    display: null,
    /**
     * Creates the display for the game.
     * @param width {Number} Integer number of pixels wide for the game
     * canvas.
     * @param height {Number} Integer number of pixels tall for the game
     * canvas.
     * @return {$g} a reference to this game instance. 
     */
    displayCreate: function(width, height) {
        $g.display = $g.gamejs.display.setMode([width, height]);
        return $g;
    },
    
    /**
     * The overall state of the game, expressed as stages.
     * @type {States}
     */
    stages: {
        /**
         * Reference to the active state.
         * Object here must implement the State interface, and is never set by
         * default.
         * @type {State}
         */
        active: null,
        /**
         * What states/stages are available?
         * @type {State{}}
         */
        states: {},
        /**
         * Add a state to the available associative array of states.
         * This does not activate the state, only makes it available to be
         * activated.
         * @param state {State} An object implementing the State interface.
         * @return {States} a reference to this States instance.
         */
        add: function(state) {
            if (state.id in this.states) {
                // Assuming that clobbering an existing property is bad bad bad.
                throw new Error("Attempting to add state "+state.id+" that has previously been added. Existing property is not being replaced.");
            }
            
            this.states[state.id] = state;
            return this;
        },
        /**
         * Attempt to transition to a previously added state.
         * This will call exit on the currently active state to aid in 
         * cleaning things up, and call enter on the transitioned to state.
         * @param id {String} The id of the state to activate.
         * @return {States} a reference to this States instance.
         */
        activate: function(id) {
            var self = this;
            var activeState = self.active;
            var nextState = self.states[id];
            // Called to perform the transition, allowing a stage to clean up
            // asynchronously.
            var transition = function() {
                self.active = nextState;
                // Right now, enter is considered fire and forget. We don't care
                // if a stage requires async setup or not. Stages take care of 
                // themselves, and it's the stage's job to know that its heartbeat 
                // function will be immediately queued up.
                if (typeof self.active.enter == "function") {
                    self.active.enter();
                }
            };
                
            // Error conditions first, all with soft errors and messages.
            if (!nextState) {
                debug_warn("The state " + id + " is not available to transition to.");
                return;
            }
            if (activeState === nextState) {
                debug_warn("The state " + id + " is already set as the current state, no transition performed.");
                return;
            }
            
            if (!activeState) {
                // We have no current stage, perform an immediate transition.
                transition();
            }
            else if (typeof activeState.exit == "function"){
                // Call exit on the current stage.
                activeState.exit({
                    done: transition
                });
            }
            else {
                // We assume the current stage has no cleanup, immediately transition.
                transition();
            }
            
            return this;
        },
    },
    /**
     * Add a stage to the available associative array of stages.
     * This does not activate the stage, only makes it available to be
     * activated.
     * A side effect of is that the "game" property of the Stage will be set to 
     * reference this $g instance.
     * @param stage {Stage} An object implementing the Stage interface.
     * @return {$g} a reference to this game instance.
     */
    stageAdd: function(stage) {
        // Add to the collection of stages and set the game reference.
        this.stages.add(stage);
        stage.game = $g;
        
        return $g;
    },
    /**
     * Attempt to transition to a previously added stage.
     * This will call exit on the current stage to aid in cleaning things up.
     * @param id {String} The name of the stage to activate.
     * @return {$g} a reference to this game instance.
     */
    stageActivate: function(id) {
        this.stages.activate(id);
        
        return $g;
    },
    
    /**
     * The function queue that is waiting to be run when the $g object
     * is ready.
     * @type {Function[]}
     */
    _readyQueue: [],
    /**
     * Are we currently waiting for the $g to be ready?
     * @type {String}
     */
    _readyTimeout: null,
    /**
     * Queue a function to be run when the $g is ready.
     * Any number of functions can be queued.
     * All queued functions will be run asynchronously even if the the
     * $g is ready to be consistent.
     * This function is not chainable to prevent errors, as most functions
     * require the $g to be initialized and ready before they work.
     * @param callback {Function} Callback function to run. The calling 
     * context of the function will be switched to the $g object when
     * called.
     */
    ready: function(callback) {
        var executeCallback = function(cb) {
            // Everything called async.
            setTimeout(function() {
                cb.call($g);
            }, 0);            
        };

        // Right now, the queue is whether or not we have gamejs
        // property. This might change later.
        var isReady = function() {
            return !!$g.gamejs;
        };

        if (isReady()) {
            // Immediately queue up for execution.
            executeCallback(callback);
        }
        else {
            $g._readyQueue.push(callback);
            // Only need one check at a time.
            if (!$g._readyTimeout) {
                $g._readyTimeout = setInterval(function() {
                    var cb;                    
                    if (isReady()) {
                        // We're good to go.
                        clearInterval($g._readyTimeout);
                        $g._readyTimeout = null;
                        while (cb = $g._readyQueue.shift()) {
                            executeCallback(cb);
                        }
                    }
                // This wait time is far from optimized.
                }, 100);
            }
        }
    },

    /**
     * Begin running the game. The game can be run safely without any stage yet
     * loaded or activated.
     * @return {$g} a reference to this game instance.
     */
    run: function() {
        var stages = $g.stages;
        $g.gamejs.time.interval(function(msElapsed) {
            // Assume if active exists, it implements heartbeat.
            if (stages.active) {
                stages.active.heartbeat(msElapsed);
            }
        });
        
        return $g;
    },
    
};



exports.$g = $g;



// Assume and enforce either attachment to the window object or this.
// (Global/exports style of export allows easier testing.)
})(typeof window != "undefined" ? window : this);
;(function(exports) {


// Remove no longer necessary listeners on the asset element.
var removeListeners = function(asset) {
    asset.removeEventListener('load', loadSuccess);
    asset.removeEventListener('error', loadFail);
};
// Called when the asset has signaled a load event.
var loadSuccess = function() {
    removeListeners(this);
    assets.assetLoadSuccess(this.getAttribute("data-src"), this);
};
// Called when the asset has signaled an error event.
var loadFail = function() {
    removeListeners(this);
    // Failures not added to the cache.
    assets.assetLoadFail(this.getAttribute("data-src"));
};


/**
 * @class Cache for loading game assets.
 * @singleton
 */
var assets = {
    /**
     * Hash of assets where the key:value pair is defined by:
     *     src:AssetElement
     * Only successfully loaded assets ever get added to the cache.
     * @type {Object}
     */
    cache: Object.create(null),
    /**
     * How many requests to load assets we have made.
     * @type {Number}
     */
    loadRequests: 0,
    /**
     * How many successful load requests we have made.
     * @type {Number}
     */
    loadSuccesses: 0,
    /**
     * How many failures to load we have experienced.
     * @type {Number}
     */
    loadFails: 0,
    /**
     * Retrieve a particular key from the cache.
     * @param src {String} The key, aka. the src string of the asset.
     */
    get: function(src) {
        return this.cache[src];
    },
    /**
     * Are we currently loading any assets?
     * @return {Boolean} true if yes, false if not.
     */
    isLoading: function() {
        return (this.loadRequests - this.loadSuccesses - this.loadFails) !== 0;
    },
    /**
     * Load an image into the asset cache.
     * @param src {String} URI of the image to load.
     * @return {assets} Returns the assets object to allow for chained loads.
     */
    imgLoad: function(src) {
        var img = document.createElement("img");
        img.addEventListener('load', loadSuccess);
        img.addEventListener('error', loadFail);
        img.src = src;
        // The non-corrected src attribute, used to key successfully loaded
        // assets.
        img.setAttribute("data-src", src);
        
        this.loadRequests += 1;
        
        return this;
    },
    /**
     * Developer attach success listener here. If an asset is loaded
     * successfully, the callback will be called and passed an Object as
     * a single argument. The object will be:
     * 
     * { success: src }
     * 
     * where src {String} is the URL of the asset loaded.
     * @type {Function}
     */
    onloadsuccess: null,
    /**
     * Called to inform users of the assets object when an asset has been
     * successfully loaded.
     * @param src {String} The user requested asset src.
     * @param asset {Element} Whatever asset element was loaded.
     */
    assetLoadSuccess: function(src, asset) {
        this.loadSuccesses += 1;
        this.cache[src] = asset;
        if (typeof this.onloadsuccess === "function") {
            // Trigger success callback if we can.
            this.onloadsuccess({
                success: src,
            });
        }
    },
    /**
     * Developer attach fail listener here. If an asset fails to load
     * successfully, the callback will be called and passed an Object as
     * a single argument. The object will be:
     * 
     * { fail: src }
     * 
     * where src {String} is the URL of the asset failed to load.
     * @type {Function}
     */
    onloadfail: null,
    /**
     * Called to inform users of the assets object when an asset has not
     * been successfully loaded.
     * @param src {String} The user requested asset src.
     */
    assetLoadFail: function(src) {
        this.loadFails += 1;
        if (typeof this.onloadfail === "function") {
            // Call fail callback if possible.
            this.onloadfail({
                fail: src,
            });
        }  
    }
};



exports.assets = assets;



// Assume and enforce either attachment to the Game object or this.
// (Global/exports style of export allows easier testing.)
})(typeof window != "undefined" && window.$g ? window.$g : this);
;/*
 * This code is credited to the original author:
 * [Chris McCormick](http://mccormickit.com/) and [jsGameSoup](http://jsgamesoup.net/).
 * I liked the modular approach to jsGameSoup and I liked the batch processing
 * approach to collisions, so I am using this code and cutting down on the
 * code I have to write.
 * 
 * I have, and will change things as time goes on. This is not the exact
 * code as found in jsGameSoup, and is not compatible with the interfaces
 * as mentioned in the jsGameSoup docs.
 */
(function(exports) {
    


/*
 * Function generator for running fn on all of groupa and groupb.
 * @private
 * @param fn {Function} The collision test function that contains the
 * logic to determine whether two objects have collided or not.
 * @param collisionCallback {String} The callback associated with this 
 * type of collision function, and that will be called if implemented
 * on the colliding objects.
 * @return {Function} Constructs a function that will check two groups
 * for collisions.
 */
var collideall = function(fn, collisionCallback) {        
    // groupa and groupb are assumed to be arrays.
    return function(groupa, groupb) {
            // Loop counters.
        var a, b, collisionresult,
            // Entities to test for collisions.
            ae, be,
            // Get the lengths up front to speed up iteration.
            groupaLength = groupa.length,
            groupbLength = groupb.length;
        
        for (a = 0; a < groupaLength; a++) {
            for (b = 0; b < groupbLength; b++) {
                ae = groupa[a];
                be = groupb[b];
                // Do not collide with ourselves.
                if (ae !== be) {
                    collisionresult = fn(ae, be);
                    if (collisionresult) {
                        if (ae[collisionCallback]) {
                            // Old.
                            //ae[collisionCallback](be, collisionresult);
                            // New.
                            ae[collisionCallback](be);
                        }
                        if (be[collisionCallback]) {
                            // Old.
                            //be[collisionCallback](ae, collisionresult);
                            be[collisionCallback](ae);
                        }
                    }
                }
            }
        }
    };
};



/** 
 * @class Methods to batch test for collisions between entities.
 *
 * All methods attached to collisions are static methods and make no internal
 * reference to the collisions object. Feel free to reference and rename
 * methods.
 * 
 * @singleton
 */
var collisions = {};



/**
 * A simple axis-aligned bounding-box collision between two entities.
 *
 * Rectangles must be defined as a native Array in the format of 
 * 
 *     [left, top, width, height]
 * 
 * @param aaabb {Array} A rectangle for entity #1.
 * @param baabb {Array} A rectangle for entity #2.
 * @return {Boolean} Returns true if the two rectangles collided, false if 
 * not.
 */
collisions.rectSimple = function(aaabb, baabb) {
    return !(aaabb[0] > baabb[0] + baabb[2] || 
        baabb[0] > aaabb[0] + aaabb[2] || 
        aaabb[1] > baabb[1] + baabb[3] || 
        baabb[1] > aaabb[1] + aaabb[3]);
};



/**
 * Axis-aligned bounding-box collision between two entities.
 *
 * Requirements:
 * 
 * If an entity is collidable, entity implements:
 *     
 *     collisionRectBoundaries() 
 * 
 * that returns an Array representing the collidable boundaries of the 
 * entity as 
 * 
 *     [left, top, width, height]
 * 
 * @param a {Object} Entity 1 to test for a collision.
 * @param b {Object} Entity 2 to test for collisions.
 * @return {Boolean} Returns true if the two rectangles collided, false if 
 * not.
 */
collisions.rect = function(a, b) {
    var aaabb, baabb;
    if (a.collisionRectBoundaries && b.collisionRectBoundaries) {
        aaabb = a.collisionRectBoundaries();
        baabb = b.collisionRectBoundaries();
        
        return !(aaabb[0] > baabb[0] + baabb[2] || 
            baabb[0] > aaabb[0] + aaabb[2] || 
            aaabb[1] > baabb[1] + baabb[3] || 
            baabb[1] > aaabb[1] + aaabb[3]);
    }
    return false;
};



/**
 * Axis-aligned bounding-box collision between two arrays of entities. 
 *
 * Requirements:
 * 
 * If an entity is collidable, entity implements 
 *     
 *     collisionRectBoundaries() 
 * 
 * that returns an Array representing the collidable boundaries of the 
 * entity as 
 * 
 *     [left, top, width, height]
 * 
 * If an entity wishes to respond to a collision, entity implements
 * 
 *     collisionRect(entity);
 * 
 * and it will be called with:
 * 
 *     entity {Object} The entity that we have collided with.
 * 
 * @param a {Object[]} Array of entities.
 * @param b {Object[]} Array of entities that will be collided with those 
 * in group a. No self collisions are allowed (e.g. if the same entity winds
 * up in both groupA and groupB, that test will be skipped in this batch
 * process).
 */
collisions.rects = collideall(
    collisions.rect,
    // Name of the expected function on the objects to answer for a collision.
    "collisionRect"
);



/**
 * Axis-aligned bounding-box anti-collision between two arrays of 
 * entities. Things that do NOT collide will trigger a callback.
 * 
 * The only reason this exists is to perform batch tests. Otherwise this test
 * can be done between single entities by !-ing the results of a simple
 * rect collision test and the code will likely be more readable and easy to 
 * understand.
 *
 * Requirements:
 * 
 * If an entity is collidable, entity implements 
 *     
 *     collisionRectBoundaries() 
 * 
 * that returns an Array representing the collidable boundaries of the 
 * entity as 
 * 
 *     [left, top, width, height]
 * 
 * If an entity wishes to respond to a collision, entity implements
 * 
 *     collisionNotRect(entity);
 * 
 * and it will be called with:
 * 
 *     entity {Object} The entity that we have collided with.
 * 
 * @param a {Object[]} Array of entities.
 * @param b {Object[]} Array of entities that will be collided with those 
 * in group a. No self collisions are allowed.
 */
collisions.notRects = collideall(function(a, b) {
    var aaabb, baabb;
    if (a.collisionRectBoundaries && b.collisionRectBoundaries) {
        aaabb = a.collisionRectBoundaries();
        baabb = b.collisionRectBoundaries();
        
        return (aaabb[0] > baabb[0] + baabb[2] || 
            baabb[0] > aaabb[0] + aaabb[2] || 
            aaabb[1] > baabb[1] + baabb[3] || 
            baabb[1] > aaabb[1] + aaabb[3]);
    }
}, "collisionNotRect");



/**
 * A simple circle collision test between entities.
 *
 * Requirements:
 * 
 * Function is called with native Arrays that represent the collideable area
 * as:
 * 
 *     [centerx, centery, radius]
 * 
 * A collision is true if any part of the circles, even a single point, overlap
 * in space.
 * 
 * @param ca {Array} Entity number 1 to test.
 * @param cb {Array} Entity number 2 to test.
 * @return {Boolean} Returns true if the two circles collided, false if 
 * not.
 */
collisions.circleSimple = function(ca, cb) {
    return Math.pow(ca[0] - cb[0], 2) + 
        Math.pow(ca[1] - cb[1], 2) <= Math.pow(ca[2] + cb[2], 2);
};



/**
 * Circle collision test between entities.
 *
 * Requirements:
 * 
 * If an entity is collidable, entity implements 
 *     
 *     collisionCircleBoundaries() 
 * 
 * that returns an Array representing the collidable boundaries of the 
 * entity as 
 * 
 *     [centerx, centery, radius]
 *
 * A collision is true if any part of the circles, even a single point, overlap
 * in space.
 * 
 * @param a {Object} Entity number 1 to test.
 * @param b {Object} Entity number 2 to test.
 * @return {Boolean} Returns true if the two circles collided, false if 
 * not.
 */
collisions.circle = function(a, b) {
    var ca, cb;
    
    if (b.collisionCircleBoundaries && a.collisionCircleBoundaries) {
        ca = a.collisionCircleBoundaries();
        cb = b.collisionCircleBoundaries();
        return Math.pow(ca[0] - cb[0], 2) + 
            Math.pow(ca[1] - cb[1], 2) <= Math.pow(ca[2] + cb[2], 2);
    }
    return false;
};



/**
 * Circle collision test between two groups of entities.
 *
 * Requirements:
 * 
 * If an entity is collidable, entity implements 
 *     
 *     collisionCircleBoundaries() 
 * 
 * that returns an Array representing the collidable boundaries of the 
 * entity as 
 * 
 *     [centerx, centery, radius]
 * 
 * If an entity wishes to respond to a collision, entity implements
 * 
 *     collisionCircle(entity);
 * 
 * and it will be called with:
 * 
 *     entity {Object} The entity that we have collided with.
 *
 * A collision is true if any part of the circles, even a single point, overlap
 * in space.
 * 
 * @param a {Entity[]} Array of entities.
 * @param b {Entity[]} Array of entities that will be collided with those 
 * in group a. No self collisions are allowed.
 */
collisions.circles = collideall(
    collisions.circle,
    // Name of callback to be called in case of collision.
    "collisionCircle"
);
    
    
 
/**
 * Helper function which tests whether a point is within a particular 
 * polygon.
 * @param pos {Number[]} Test point of the form [x, y].
 * @param poly {[Number[]]} Polygon defined as a list of points of the form 
 * [[x1, y1], [x2, y2], ... [xn, yn]].
 * @return {Boolean} Is true if point is inside, false if not.
 */
var pointInPolySimple = collisions.pointInPolySimple = function(pos, poly) {
    // This code is patterned after [Franklin, 2000]
    // http://www.geometryalgorithms.com/Archive/algorithm_0103/algorithm_0103.htm
    // Tells us if the point is in this polygon 
    var i, 
        cn = 0,
        pts = poly.slice();
    
    // Forces the polygon to be closed.    
    pts.push([poly[0][0], poly[0][1]]);
    
    for (i = 0; i < poly.length; i++) {
        if (((pts[i][1] <= pos[1]) && (pts[i+1][1] > pos[1])) || 
            ((pts[i][1] > pos[1]) && (pts[i+1][1] <= pos[1]))) {
            if (pos[0] < pts[i][0] + (pos[1] - pts[i][1]) / 
                (pts[i+1][1] - pts[i][1]) * (pts[i+1][0] - pts[i][0])) {
                cn += 1;
            }
        }
    }
    return cn % 2;
};



/**
 * Helper function which tests whether two lines intersect.
 * Lines are segments and are of the form:
 *  
 *      [[x1, y1], [x2, y2]]
 * 
 * @param l1 {[Number[]]} First line.
 * @param l2 {[Number[]]} Second line.
 * @return {Boolean} True if there is a collision, false if not.
 */
collisions.lineOnLineSimple = function(l1, l2) {
    // Detects the intersection of two lines, see:
    // http://www.kevlindev.com/gui/math/intersection/Intersection.js
    var a1 = l1[0],
        a2 = l1[1],
        b1 = l2[0],
        b2 = l2[1],
        a1x = a1[0],
        a1y = a1[1],
        a2x = a2[0],
        a2y = a2[1],
        b1x = b1[0],
        b1y = b1[1],
        b2x = b2[0],
        b2y = b2[1],
        
        ua_t = (b2x - b1x) * (a1y - b1y) - (b2y - b1y) * (a1x - b1x),
        ub_t = (a2x - a1x) * (a1y - b1y) - (a2y - a1y) * (a1x - b1x),
        u_b  = (b2y - b1y) * (a2x - a1x) - (b2x - b1x) * (a2y - a1y),
        ua,
        ub,
        coincidentTestX,
        coincidentTestY;
    
    if (u_b) {
        ua = ua_t / u_b;
        ub = ub_t / u_b;
        
        if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
            // ORIGNAL 
            // Intersection, return point of intersection.
            // FUTURE TODO: Return the point of intersection again, but in a different function.
            //return [a1x + ua * (a2x - a1x), a1y + ua * (a2y - a1y)];
            // REWRITE
            // These are simple collision tests. Let's stick to the theme
            // and expand when we need to.
            // Intersection (collision).
            return true;
        } 
        else {
            // Skew lines (no intersection, no collision).
            return false;
        }
    }
    else {
        if (ua_t === 0 || ub_t === 0) {
            // Potentially overlapping.
            // Test to see if one point of one segment actually lies on the 
            // other segment.
            // We don't know if points are sorted or not, so we test both.
            coincidentTestX = ((b1x <= a1x && a1x <= b2x) || (b1x <= a2x && a2x <= b2x)) ||
                    ((b1x >= a1x && a1x >= b2x) || (b1x >= a2x && a2x >= b2x));
            coincidentTestY = ((b1y <= a1y && a1y <= b2y) || (b1y <= a2y && a2y <= b2y)) ||
                    ((b1y >= a1y && a1y >= b2y) || (b1y >= a2y && a2y >= b2y));
            if (coincidentTestX && coincidentTestY) {
                // One point from segment1 must exist on segment2 if the
                // two lines are coincident. If we get here,
                // yes coincident (overlapping, collision).
                return true;
                // FUTURE TODO: Return the segment of the overlap.
            }
            else {
                // Not coincident (not overlapping, no collision).
                return false;
            }
        } 
        else {
            // Parallel (no intersection, no collision).
            return false;
        }
    }
};



// Export
exports.collisions = collisions;



})(typeof window != "undefined" && window.$g ? window.$g : this);

;(function(exports) {



/**
 * @class A single, simple particle.
 * @param config {Object} Associative array of arguments.
 * @param [config.x=0] {Number} Pixel x location of the center of the particle.
 * @param [config.dx=0] {Number} Delta change in x per second.
 * @param [config.ddx=0] {Number} The rate of change of change in x per second.
 * @param [config.y=0] {Number} Pixel y location of the center of the particle.
 * @param [config.dy=0] {Number} Delta change in y per second.
 * @param [config.ddy=0] {Number} The rate of change of change of y per second.
 * @param [config.alpha=1] {Number} 0 fully transparant, 1 fully opaque.
 * @param [config.maxAge=Infinity] {Number} The number of milliseconds that this
 * particle is meant to be alive in the view.
 * @param [config.surface] {Surface} The basic image/surface that will act as
 * the view of this particle. If this is not provided, the particle will not
 * be visible during the draw routine.
 */
var Particle = function(config) {
    config = config || {};
    
    /**
     * Pixel x location of the center of the particle.
     * @type {Number}
     */
    this.x = config.x || 0;
    /**
     * Delta change in x per second.
     * @type {Number}
     */
    this.dx = config.dx || 0;
    /**
     * Delta change of change in x per second.
     * @type {Number}
     */
    this.ddx = config.ddx || 0;
    /**
     * Pixel y location of the center of the particle.
     * @type {Number}
     */
    this.y = config.y || 0;
    /**
     * Delta change in y per second.
     * @type {Number}
     */
    this.dy = config.dy || 0;
    /**
     * Delta change of change in y per second.
     * @type {Number}
     */
    this.ddy = config.ddy || 0;

    
    /**
     * 0 fully transparant, 1 fully opaque.
     * @type {Number}
     */
    // Oh for the love of fucking god... gamejs does the inverse of all things
    // web by calling alpha 0 fully opaque and 1 fully transparent. WTF?
    this.alpha = (config.alpha || config.alpha === 0) ? 1-config.alpha : 0;
    
    /**
     * The number of milliseconds that this particle is meant to be alive in 
     * the view. Particles by default live forever.
     * @type {Number}
     */
    this.maxAge = (config.maxAge || config.maxAge === 0) ? config.maxAge : Infinity;
    
    /**
     * The basic image/surface that will act as the view of this particle. 
     * If this is not provided, the particle will not be visible during the 
     * draw routine.
     * @type {Surface}
     */
    this.surface = config.surface || null;
};
/**
 * Number of ms this particle has been alive.
 * Default age of all particles is 0.
 * @type {Number}
 */
Particle.prototype.age = 0;
/**
 * Gets the size of this particle. Our simple particles are only considered 
 * to have size if they are visible (they have a surface).
 * @return {Number[]|Null} Will return Null to single particles that have
 * no surface, or the size of the particle as an [width, height] pixel array.
 */
Particle.prototype.size = function() {
    return !this.surface ? null : this.surface.getSize();
};
/**
 * Where is the upper left of our particle?
 * Note that should a particle not have an associated surface, the particle 
 * is assumed to be dimensionless, and the upperleft of the paricle will
 * be the position of the particle. 
 * @return {Number[]} What should be considered the upperleft of our particle
 * as an array made up of [x, y] coordinates.
 */
Particle.prototype.upperLeft = function() {
    var size = this.size();
    if (size) {
        return [this.x-size[0]/2, this.y-size[1]/2];
    }
    else {
        return [this.x, this.y];
    }
};
/**
 * Will reveal whether this particle is alive or dead.
 * @return {Boolean} Returns a status of whether this particle is considered
 * alive (true) or dead (false).
 */
Particle.prototype.isAlive = function() {
    // By default, this is the only age criteria.
    return this.maxAge > this.age;
};
/**
 * For our simple particles, an update updates the x by dx and the
 * y by dy, assuming constant velocity.
 * @param ms {Number} The number of milliseconds elapsed since the
 * last call to this function.
 * @return {Boolean} Returns a status of whether this particle is considered
 * alive (true) or dead (false).
 */
Particle.prototype.update = function(ms) {
    var msRatio = ms / 1000;
    this.x += this.dx * msRatio;
    this.dx += this.ddx * msRatio;
    this.y += this.dy * msRatio;
    this.dy += this.ddy * msRatio;
    // Age the particle via the real duration.
    this.age += ms;
    
    return this.isAlive();
};
/**
 * Blits our particle, if it has a surface, onto whatever surface we pass in.
 * @param target {Surface} Our target surface.
 */
Particle.prototype.draw = function(target) {
    if (this.surface) {
        this.surface.setAlpha(this.alpha);
        target.blit(this.surface, this.upperLeft());
    }
};



exports.Particle = Particle;



// Assume and enforce either attachment to the Game object or this.
// (Global/exports style of export allows easier testing.)
})(typeof window != "undefined" && window.$g ? window.$g : this);

;(function(exports) {



/**
 * @class Used for tracking stats.
 */
var ScoreKeeper = function() {
    /**
     * Internal hash of scores.
     * @type {Object}
     */
    // Prototypeless object prevents need for hasOwnProperty checking.
    this._scores = Object.create(null);
};
/**
 * Rebuilds the internal JSON cache of scores from that which is passed in.
 * Calling this method will replace any and all previous scores.
 * @param json {Object} An object to convert JSON from.
 * @return {ScoreKeeper} Chainable command.
 */
ScoreKeeper.prototype.fromJSON = function(json) {
    var scores = Object.create(null);
    var score;
    
    for (score in json) {
        // We'll be a bit more careful about things being passed in.
        if (json.hasOwnProperty(score)) {
            scores[score] = json[score];
        }
    }

    // reset
    this._scores = scores;
    
    return this;
};
/**
 * Modifies the current value of a score.
 * Will also initialize a score to zero that did not previously exist, and
 * then modify it with the value.
 * @param score {String} Which score to modify.
 * @param [val=1] {Number} How much to modify the score by (positive or 
 * negative). If for whatever reason you wish to not modify the score, make
 * sure to set val=0 during your call, but it's better practice to just use
 * set.
 * @return {ScoreKeeper} Chainable command.
 */
ScoreKeeper.prototype.mod = function(score, val) {
    if (val === undefined) {
        val = 1;
    }
    if (!this._scores[score]) {
        this._scores[score] = 0;
    }
    this._scores[score] += val;
    
    return this;
};
/**
 * Set the value of a specific score. 
 * Also functions as an init method.
 * @param score {String} Which score to modify.
 * @param [val=0] {Number} What to set the score to, deleting any previous
 * score values.
 * @return {ScoreKeeper} Chainable command.
 */
ScoreKeeper.prototype.set = function(score, val) {
    // Here this is safe, as 0 will still be set to 0, no false reset.
    val = val || 0;
    this._scores[score] = val;
    
    return this;
};
/**
 * What is the value of a particular score?
 * @param score {String} Which score to return.
 * @return {Number} Returns either the score value, or 0 for any 
 * non-initialized score.
 */
ScoreKeeper.prototype.val = function(score) {
    return this._scores[score] || 0;
};
/**
 * Add all existing scores together in a single value.
 * @return {Number} Returns the total value of all existing scores, added
 * together. If no scores, 0 will still be returned.
 */
ScoreKeeper.prototype.sum = function() {
    var scores = this._scores;
    var score;
    var total = 0;
    
    for (score in scores) {
        // Assumes prototypeless object.
        total += scores[score];
    }
    
    return total;
};
/**
 * Returns a copy of the internal JSON structure.
 * Does not return a reference.
 * @return {Object} The scores as a simple JSON object.
 */
ScoreKeeper.prototype.toJSON = function() {
    // Prevent the need for hasOwnProperty checking.
    var out = Object.create(null);
    var scores = this._scores;
    var score;
    
    for (score in scores) {
        out[score] = scores[score];
    }
    
    return out;
};

exports.ScoreKeeper = ScoreKeeper;



// Assume and enforce either attachment to the Game object or this.
// (Global/exports style of export allows easier testing.)
})(typeof window != "undefined" && window.$g ? window.$g : this);
;(function(exports) {



/**
 * Making use of HTML5 Audio as best as possible, as simply as possible.
 * @param src {String} URL to the sound we wish to play.
 */
var Sound = function(src) {
    var self = this;
    
    /**
     * The URL to this sound.
     * @type {String}
     */
    this.src = src;
    
    /**
     * Reference to the Audio object that we'll use to play this audio.
     * @type {Audio}
     */
    this._audio = new Audio();
    // Allows us to listen to when the audio is done and maybe do
    // something.
    this._audio.addEventListener("ended", function() {
        if (typeof self.done == "function") {
            self.done();
        }
    });
};
/**
 * Play the noise, and cross fingers that the noise will play.
 */
Sound.prototype.play = function() {
    // The currentTime property seems to be read only.
    // This seems to be the only way to play audio repeatedly.
    this._audio.src = this.src;
    this._audio.play();
};
/**
 * Should we do anything when this audio is done?
 * @type {Function}
 */
Sound.prototype.done = null;



exports.Sound = Sound;



// Assume and enforce either attachment to the Game object or this.
// (Global/exports style of export allows easier testing.)
})(typeof window != "undefined" && window.$g ? window.$g : this);
;(function(exports) {



/**
 * @class Simple text overlay.
 * @param config {Object} Associative array of arguments.
 * @param config.font {Font} A gamejs Font object.
 * @param [config.text=""] {String} The text to display.
 * @param [config.color="white"] {String} A canvas friendly color used to
 * display the text.
 * @param [config.x=0] {Number} Pixel x location of the center of the object.
 * @param [config.alignx=""] {String} "right", "left", "center" support.
 * If this is included, the x location will be overridden and the alignment
 * will happen relative to the surface we are being drawn on.
 * The alignment will be done as best as possible and may cause text to
 * run over the edges of the screen.
 * @param [config.paddingx=0] {Number} During alignment, how many pixels to
 * pad from the relative positioning edge. Negative signage will reverse the
 * relative direction of the padding.
 * @param [config.y=0] {Number} Pixel y location of the center of the object.
 * @param [config.aligny=""] {String} "top", "bottom", "center" support.
 * If this is included, the y location will be overridden and the alignment
 * will happen relative to the surface we are being drawn on.
 * The alignment will be done as best as possible and may cause text to
 * run over the edges of the screen.
 * @param [config.paddingy=0] {Number} During alignment, how many pixels to
 * pad from the relative positioning edge. Negative signage will reverse the
 * relative direction of the padding.
 * @param [config.alpha=1] {Number} 0 fully transparant, 1 fully opaque.
 */
var TextOverlay = function(config) {
    /**
     * Pixel x location of the center of the particle.
     * @type {Number}
     */
    this.x = config.x || 0;
    /**
     * Keyword horizontal alignment.
     * @type {String}
     */
    this.alignx = config.alignx || "";
    /**
     * Relative padding that happens, only during aligned positioning.
     * @type {Number}
     */
    this.paddingx = config.paddingx || 0;
    /**
     * Pixel y location of the center of the particle.
     * @type {Number}
     */
    this.y = config.y || 0;
    /**
     * Keyword vertical alignment.
     * @type {String}
     */
    this.aligny = config.aligny || "";
    /**
     * Relative padding that happens, only during aligned positioning.
     * @type {Number}
     */
    this.paddingy = config.paddingy || 0;
    /**
     * What text will we display in the game.
     * @type {String}
     */
    this.text = config.text || "";
    /**
     * What color to use for the text.
     * @type {String}
     */
    this.color = config.color || "#ffffff"; 
    /**
     * 0 fully transparant, 1 fully opaque.
     * @type {Number}
     */
    // Oh for the love of fucking god... gamejs does the inverse of all things
    // web by calling alpha 0 fully opaque and 1 fully transparent. WTF?
    this.alpha = (config.alpha || config.alpha === 0) ? 1-config.alpha : 0;
    /**
     * The font wrapper.
     * @type {Font}
     */
    this._font = config.font;
};
/**
 * Gets the size of this particle. Our simple particles are only considered 
 * to have size if they are visible (they have a surface).
 * @return {Number[]} A [width, height] pixel array.
 */
TextOverlay.prototype.size = function() {
    // The text object requires a font.
    return this.font.size(this.text);
};
/**
 * Blits our text, onto whatever surface we pass in.
 * @param target {Surface} Our target surface.
 */
TextOverlay.prototype.draw = function(target) {
    // Right now, text objects are required to host Font objects, so no
    // check is needed.
    var surface = this._font.render(this.text, this.color);
    var textSize = surface.getSize();
    // These x and y values will be the upper left of the text, wherever
    // the text ends up.
    var x;
    var y;
    
    var alignx = this.alignx;
    var aligny = this.aligny;
    
    surface.setAlpha(this.alpha);
    
    // Sort out x position.
    if (alignx == "center") {
        // Attempt to horizontally align relative to containing surface.
        x = target.getSize()[0]/2 - textSize[0]/2 + this.paddingx;
    }
    else if (alignx == "left") {
        x = 0 + this.paddingx;
    }
    else if (alignx == "right") {
        // The signage of padding from the right is relatively reversed.
        x = target.getSize()[0] - textSize[0] - this.paddingx;
    }
    else {
        // When not aligned, centered over our position.
        x = this.x - textSize[0]/2 + this.paddingx;
    }
    
    // Sort out y position.
    if (this.aligny == "center") {
        // Attempt to vertically align relative to containing surface.
        y = target.getSize()[1]/2 - textSize[1]/2 + this.paddingy;
    }
    else if (aligny == "top") {
        y = 0 + this.paddingy;
    }
    else if (aligny == "bottom") {
        // The signage of padding from the bottom is relatively reversed.
        y = target.getSize()[1] - textSize[1] - this.paddingy;
    }
    else {
        // Otherwise we are centered over our point.
        y = this.y - textSize[1]/2 + this.paddingy;
    }
    
    target.blit(surface, [x, y]);
};



exports.TextOverlay = TextOverlay;



// Assume and enforce either attachment to the Game object or this.
// (Global/exports style of export allows easier testing.)
})(typeof window != "undefined" && window.$g ? window.$g : this);
;/* jshint unused:true, undef:true */
/* global $g:false */

(function(exports) {

    // Attach entities here.
    exports.entities = {};

})($g.local);
;/* jshint unused:true, undef:true */
/* global $g:false */



(function(exports) {



/**
 * @class Crosshair used to track the mouse targeting in the game.
 */
var Crosshair = function() {
    // Start outside of the canvas.
    this.x = -100;
    this.y = -100;

    // remember, gamejs is assbackwards with alpha.
    //this.alpha = 0;

    // Crosshair needs access to the Surface object.
    this.surface = new $g.gamejs.Surface(20, 20);
    // surface, color, startPos, endPos, width
    $g.gamejs.draw.line(this.surface, "#ffffff", [9, 0], [9, 3], 1);
    $g.gamejs.draw.line(this.surface, "#ffffff", [9, 16], [9, 19], 1);
    $g.gamejs.draw.line(this.surface, "#ffffff", [0, 9], [3, 9], 1);
    $g.gamejs.draw.line(this.surface, "#ffffff", [16, 9], [19, 9], 1);
};
Crosshair.prototype.isAlive = function() {
    // We're always alive.
    return true;
};
Crosshair.prototype.size = function() {
    return !this.surface ? null : this.surface.getSize();
};
Crosshair.prototype.upperLeft = function() {
    var size = this.size();
    if (size) {
        return [this.x-size[0]/2, this.y-size[1]/2];
    }
    else {
        return [this.x, this.y];
    }
};
/**
 * Called to update the data.
 * @param msDuration {Number} How many ms since our last update.
 * @return {Boolean} Whether we should be included in future updates
 * or garbage collected.
 */
Crosshair.prototype.update = function(/*msDuration*/) {
    return this.isAlive();
};
/**
 * Called during the draw stage.
 * @param target {Surface} Where we draw ourselves onto.
 */
Crosshair.prototype.draw = function(target) {
    if (this.surface) {
        //this.surface.setAlpha(this.alpha);
        target.blit(this.surface, this.upperLeft());
    }
};

exports.Crosshair = Crosshair;



})($g.local.entities);
;/* jshint unused:true, undef:true */
/* global $g:false */



(function(exports) {



/**
 * @class An expanding, collidable particle.
 *
 * @param x {Number} Center of explosion x pixel.
 * @param y {Number} Center of explosion y pixel.
 */
var Flak = function(x, y) {
    /**
     * Center of explosion x pixel.
     * @type {Number}
     */
    this.x = x;
    /**
     * Center of explosion y pixel.
     * @type {Number}
     */
    this.y = y;

    /**
     * Current radius in pixels.
     * @type {Number}
     */
    this.radius = 1;
    /**
     * Delta radius per second.
     * @type {Number}
     */
    this.dradius = 25;
    /**
     * Maximum radius in pixels.
     * @type {Number}
     */
    this.maxRadius = 25;
};
/**
 * Pointer to our $g object.
 * @type {$g}
 */
Flak.prototype.game = $g;
/**
 * Called to update the data.
 * @param msDuration {Number} How many ms since our last update.
 * @return {Boolean} Whether we should be included in future updates
 * or garbage collected.
 */
Flak.prototype.update = function(msDuration) {
    // Time ratio.
    var dt = msDuration/1000;

    // Flak explosions expand and then contract.
    if (this.radius >= this.maxRadius && this.dradius > 0) {
        this.dradius = -1*this.dradius;
    }
    this.radius += this.dradius*dt;

    // Determine when we get removed from the list of objects.
    // We want to return true if we are _not_ dead.
    return (this.dradius == -1 ? this.radius > 0 : true);
};
/**
 * Called during the draw stage.
 * @param target {Surface} Where we draw ourselves onto.
 */
Flak.prototype.draw = function(target) {
    // Modify the color based on radius.
    var rng = this.game.gamejs.utils.prng;
    var red = rng.integer(0, 255);
    var green = rng.integer(0, 255);
    var blue = rng.integer(0,255);

    // The greater than zero has to do with a silliness in gamejs.
    if (this.radius > 0) {
        this.game.gamejs.draw.circle(
            target,
            "rgb("+red+","+green+","+blue+")",
            [this.x, this.y],
            this.radius
        );
    }
};
/**
 * Allows for rectangular collision tests.
 * @return {Number[]} Rectangular collision area as an array conforming to
 * [left, top, width, height].
 */
Flak.prototype.collisionRectBoundaries = function() {
    // If our radius describes the circle, grab a collision bounding box
    // that fits within our circle.
    // Bounding box returned is described from the upper left corner as
    // [x, y, w, h].
    var radius = this.radius;
    var radiusSquared = radius * radius;
    var diameter = radius*2;
    var offset = Math.sqrt(radiusSquared + radiusSquared);
    return [this.x-offset, this.y-offset, diameter, diameter];
};



exports.Flak = Flak;



})($g.local.entities);
;/* jshint unused:true, undef:true */
/* global $g:false */



(function(exports) {



/**
 * A target to shoot down.
 * @param [config] {Object} Associative array of arguments.
 * @param [config.x=0] {Number} Starting x-pixel coordinate.
 * @param [config.y=0] {Number} Starting y-pixel coordinate.
 * @param [config.heading=0] {Number} Degrees heading the target
 * is going to travel in. 0 degrees is a heading of right across the playing
 * field, 90 is up the playing field.
 * @param [config.speed=100] {Number} Speed in pixels/sec.
 * @constructs
 */
var Target = function(config) {
    config = config || {};

    // The center of the target.
    this.x = config.x || 0;
    this.y = config.y || 0;
    // The rate of change of the target.
    // Convert heading into proportional x and y units, multiply by speed.
    config.heading = config.heading || 0;
    config.speed = config.speed || 100;
    this.dx = Math.cos(config.heading*Math.PI/180)*config.speed;
    // Need to reverse the sign for our coordinate system (+1 is down, not up).
    this.dy = -1*Math.sin(config.heading*Math.PI/180)*config.speed;

    // For tracking a minimum age of a target, allows us to start outside
    // of the boundary area.
    this.age = 0;

    // OLD TARGET.
    // Target needs access to the Surface object.
    //this.surface = new this.game.gamejs.Surface(this.width, this.height);
    // surface, color, points, width (0 means fill)
    //this.game.gamejs.draw.polygon(this.surface, "#ffffff", [[0, 0], [20, 10], [0, 20]], 0);

    // CONFETTI PIG!!!!
    this.surface = $g.imgToSurface($g.assets.get("img/confetti_pig.png"));

    // The gamejs rotation works by clockwise rotation only.
    this.surface = this.game.gamejs.transform.rotate(this.surface, -config.heading);

    // Targets have three states: moving, exploding, outofbounds.
    // Moving is the only "living" state.
    this.state = "moving";
};
/**
 * Pointer to our $g object.
 * @type {$g}
 */
Target.prototype.game = $g;
/**
 * How wide is the target?
 * @type {Number}
 */
Target.prototype.width = 20;
/**
 * How tall is the target?
 * @type {Number}
 */
Target.prototype.height = 20;
/**
 * Will reveal whether this target is alive or dead.
 * @return {Boolean} Returns a status of whether this particle is considered
 * alive (true) or dead (false).
 */
Target.prototype.isAlive = function() {
    return this.state == "moving";
};
/**
 * Gets the size of the target.
 * @return {Number[]} the size of the target as [width, height] pixel array.
 */
Target.prototype.size = function() {
    return this.surface.getSize();
};
/**
 * Where is the upper left of our target?
 * @return {Number[]} What should be considered the upperleft of our target
 * as an array made up of [x, y] coordinates.
 */
Target.prototype.upperLeft = function() {
    var size = this.size();

    return [this.x-size[0]/2, this.y-size[1]/2];
};
/**
 * Update function.
 * @param ms {Number} The number of milliseconds elapsed since the
 * last call to this function.
 * @return {Boolean} Returns a status of whether this target is considered
 * alive (true) or dead (false).
 */
Target.prototype.update = function(ms) {
    var msRatio = ms / 1000;
    this.age += ms;
    this.x += this.dx * msRatio;
    this.y += this.dy * msRatio;
    return this.isAlive();
};
/**
 * Blits our target onto whatever surface we pass in.
 * @param target {Surface} Our target surface.
 */
Target.prototype.draw = function(target) {
    target.blit(this.surface, this.upperLeft());
};
/**
 * Allows for rectangular collision tests.
 * @return {Number[]} Rectangular collision area as an array conforming to
 * [left, top, width, height].
 */
Target.prototype.collisionRectBoundaries = function() {
    // We use size, not width and height, because a rotated target takes
    // up more space.
    return this.upperLeft().concat(this.size());
};
/**
 * Responds to a "not rect" anti-collision test.
 * @param target {Object} What we did _not_ collide with.
 */
Target.prototype.collisionNotRect = function(/*target*/) {
    // We're trusting that the only thing we are anti-colliding with
    // is the game.
    if (this.age > 1000) {
        // Only targets more than 1 second old can be marked out of bounds.
        this.state = "outofbounds";
    }
};
/**
 * Responds to a rectangular collision test.
 * @param target {Object} What we collided with.
 */
Target.prototype.collisionRect = function(target) {
    if (target instanceof $g.local.entities.Flak) {
        // We are dead.
        this.state = "exploding";
    }
};



exports.Target = Target;



})($g.local.entities);
;/* jshint unused:true, undef:true */
/* global $g:false */

(function(exports) {

    // Attach stages here.
    exports.Stages = {};

})($g.local);
;/* jshint unused:true, undef:true */
/* global $g:false */

(function(exports) {


// Welcome screen. Assumes a transition to the game.
exports.load = {
    id: "load",
    enter: function() {
        var pigImgSrc = "img/confetti_pig.png";
        var self = this;
        var game = this.game;
        var defaultFont = game.local("defaultFont");
        var TextOverlay = game.TextOverlay;

        // Initialize.
        this.loadingText = new TextOverlay({
            alignx: "center",
            aligny: "center",
            text: "loading assets....",
            font: defaultFont,
        });

        // Setup asset load listeners.
        game.assets.onloadsuccess = function(/*data*/) {
            self.loadingText = new TextOverlay({
                alignx: "center",
                aligny: "center",
                text: "assets loaded. click to continue...",
                font: defaultFont,
            });
        };
        game.assets.onloadfail = function(/*data*/) {
            self.loadingText = new TextOverlay({
                alignx: "center",
                aligny: "center",
                text: "error loading assets....",
                font: defaultFont,
            });
        };
        game.assets.imgLoad(pigImgSrc);
    },
    heartbeat: function(/*msDuration*/) {
        var game = this.game;
        var display = game.display;
        var event = game.gamejs.event;
        var MOUSE_DOWN = event.MOUSE_DOWN;
        var assetsLoaded = !game.assets.isLoading();

        event.get().forEach(function(e) {
            if (e.type === MOUSE_DOWN && assetsLoaded) {
                // Transition.
                game.stageActivate("start");
            }
        });

        display.fill('#000000');
        this.loadingText.draw(display);
    },
    // Initialized when this stage is entered.
    loadingText: null,
};



})($g.local.Stages);
;/* jshint unused:true, undef:true */
/* global $g:false */

(function(exports) {


// Welcome screen. Assumes a transition to the game.
exports.start = {
    id: "start",
    enter: function() {
        var game = this.game;
        var defaultFont = game.local("defaultFont");
        var TextOverlay = game.TextOverlay;

        // Initialize.
        this.welcomeText = new TextOverlay({
            alignx: "center",
            aligny: "center",
            text: "shootdown",
            font: defaultFont,
        });
        this.helpText = new TextOverlay({
            alignx: "center",
            aligny: "center",
            paddingy: 25,
            text: "click to start. click to shoot things.",
            font: defaultFont,
        });
    },
    heartbeat: function(/*msDuration*/) {
        var game = this.game;
        var display = game.display;
        var event = game.gamejs.event;
        var MOUSE_DOWN = event.MOUSE_DOWN;

        event.get().forEach(function(e) {
            if (e.type === MOUSE_DOWN) {
                // Transition.
                game.stageActivate("thegame");
            }
        });

        display.fill('#000000');
        this.welcomeText.draw(display);
        this.helpText.draw(display);
    },
    // Initialized when this stage is entered.
    "welcomeText": null,
    "helpText": null,
};



})($g.local.Stages);
;/* jshint unused:true, undef:true */
/* global $g:false */

(function(exports) {



/**
 * For our purposes, call to generate a target instance randomized to one
 * of the four sides of the map.
 * @return {Target} Target correctly positioned and ready to go, but not
 * under control of any collection.
 */
var targetFactory = function() {
    // Which side will the target enter from?
    var side = Math.floor(Math.random() * 4);
    // Randomize the direction of travel.
    var headingDeltaSign = Math.random() > 0.5 ? +1 : -1;
    var headingDelta = headingDeltaSign * Math.floor(Math.random() * 20);
    // How many pixels a second?
    var speed = Math.floor(Math.random() * 100 + 50);
    // The target we're going to create and return.
    var target;
    // What are the display dimensions?
    var displayDims = $g.display.getSize();

    var Target = $g.local.entities.Target;

    switch (side) {
        case 0:
            // top, heading down
            target = new Target({
                x: displayDims[0]/2+(Math.random() > 0.5 ? +1 : -1)*Math.floor(Math.random() * (displayDims[0]/4-Target.prototype.width)),
                // Just touching the edge so the target doesn't get
                // removed before it is even visible.
                y: -Target.prototype.height/2,
                heading: 270 + headingDelta,
                speed: speed
            });
            break;
        case 1:
            // right, heading left
            target = new Target({
                // Just touching the edge so the target doesn't get
                // removed before it is even visible.
                x: displayDims[0]+Target.prototype.width/2,
                y: displayDims[1]/2+(Math.random() > 0.5 ? +1 : -1)*Math.floor(Math.random() * (displayDims[1]/4-Target.prototype.height)),
                heading: 180 + headingDelta,
                speed: speed
            });
            break;
        case 2:
            // bottom, heading up
            target = new Target({
                x: displayDims[0]/2+(Math.random() > 0.5 ? +1 : -1)*Math.floor(Math.random() * (displayDims[0]/4-Target.prototype.width)),
                // Just touching the edge so the target doesn't get
                // removed before it is even visible.
                y: displayDims[1]-Target.prototype.height/2,
                heading: 90 + headingDelta,
                speed: speed
            });
            break;
        case 3:
            // left, heading right
            target = new Target({
                // Just touching the edge so the target doesn't get
                // removed before it is even visible.
                x: -Target.prototype.width/2,
                y: displayDims[1]/2+(Math.random() > 0.5 ? +1 : -1)*Math.floor(Math.random() * (displayDims[1]/4-Target.prototype.height)),
                heading: 0 + headingDelta,
                speed: speed
            });
            break;
    }

    return target;
};



/**
 * @class Display of the points.
 */
var ScoreView = function() {};
/**
 * Shared reference to our $g object.
 * @type {$g}
 */
ScoreView.prototype.game = $g;
ScoreView.prototype.update = function() {
    return true;
};
/**
 * Called during the draw stage.
 * @param target {Surface} Where we draw ourselves onto.
 */
ScoreView.prototype.draw = function(target) {
    var local = this.game.local;
    new this.game.TextOverlay({
        alignx: "left",
        paddingx: 10,
        aligny: "top",
        paddingy: 10,
        // At time of writing, we need some non-falsey value.
        // Don't pass a simple 0 into text.
        text: "Score: " + local.score.sum(),
        font: local.defaultFont,
    }).draw(target);
};



/**
 * @class How long the game will last.
 * @param ms {Number} How many milliseconds will the countdown last?
 */
var Countdown = function(ms) {
    /**
     * The time when this countdown was started (ms since the epoch).
     * @param {Number}
     */
    this._start = null;
    /**
     * The time when this countdown will be done (ms since the epoch).
     * @param {Number}
     */
    this._end = null;
    /**
     * The total duration of the countdown in milliseconds.
     * @param {Number}
     */
    this.duration = ms;
};
/**
 * Call when you wish to begin/reset the countdown timer.
 * @return {Countdown} Our self reference.
 */
Countdown.prototype.reset = function() {
    this._start = Date.now();
    this._end = this._start + this.duration;

    return this;
};
/**
 * How much time is remaining relative to real time?
 * @return {Number} of milliseconds remaining. This number will normalize
 * at zero and will never return less than zero (where zero indicates the
 * time is over).
 */
Countdown.prototype.remaining = function() {
    var remaining = this._end - Date.now();
    return remaining > 0 ? remaining : 0;
};



/**
 * @class Display of the game timer.
 * @param countdown {Countdown} The countdown managing this view.
 */
var CountdownView = function(countdown) {
    /**
     * The countdown managing this view.
     * @type {Countdown}
     */
    this.countdown = countdown;
};
/**
 * Shared reference to our $g object.
 * @type {$g}
 */
CountdownView.prototype.game = $g;
/**
 * We always run, never remove.
 */
CountdownView.prototype.update = function() {
    return true;
};
/**
 * Called during the draw stage.
 * @param target {Surface} Where we draw ourselves onto.
 */
CountdownView.prototype.draw = function(target) {
    var secondsRemaining = Math.floor(this.countdown.remaining()/1000);
    new this.game.TextOverlay({
        alignx: "right",
        paddingx: 10,
        aligny: "top",
        paddingy: 10,
        // At time of writing, we need some non-falsey value.
        // Don't pass a simple 0 into text.
        text: "Time remaining: " + secondsRemaining,
        font: this.game.local.defaultFont,
    }).draw(target);
};



/**
 * Generates debris for the exploded targets.
 * @param x {Number} x pixel where to generate the debris.
 * @param y {Number} y pixel where to generate the debris.
 */
var targetDebrisFactory = function(x, y) {
    var r1 = Math.random();
    var r2 = Math.random();
    var r3 = Math.random();

    var surface = new $g.gamejs.Surface(5, 5);
    surface.fill("rgb("+Math.floor(r1*256)+","+Math.floor(r2*256)+","+Math.floor(r3*256)+")");

    return new $g.Particle({
        x: x,
        y: y,
        dx: (10 + r1 * 40) * (r2 > 0.5 ? -1 : 1),
        dy: (10 + r2 * 40) * (r1 > 0.5 ? -1 : 1),
        // Only gravity change.
        ddy: 100,
        alpha: r3,
        maxAge: 2000 + r3*2000,
        surface: surface
    });
};



// Manages the game until the game is over.
exports.thegame = {
    id: "thegame",
    enter: function() {
        var game = this.game;

        // Initialize our crosshair.
        this.crosshair = new game.local.entities.Crosshair(game);
        this.stageObjects.push(this.crosshair);

        // In case this is the nth time playing, reset the scores.
        game.local.score.fromJSON({});
        // Initialize the score of the game.
        this.scoreView = new ScoreView();
        this.stageObjects.push(this.scoreView);

        // The countdown timer. (not an object directly managed by the game).
        this.countdown = new Countdown(this.gameDuration).reset();
        // The view is managed as a game object.
        this.countdownView = new CountdownView(this.countdown);
        this.stageObjects.push(this.countdownView);
    },
    heartbeat: function(msDuration) {
        var stage = this;
        var game = this.game;
        var display = game.display;
        var event = game.gamejs.event;
        var MOUSE_DOWN = event.MOUSE_DOWN;
        var MOUSE_MOTION = event.MOUSE_MOTION;
        var stageObjects = this.stageObjects;
        // Manage some objects separately.
        var flakObjects = this.flakObjects;
        var particles = this.particles;
        var crosshair = this.crosshair;
        var collisions = game.collisions;

        // Endgame conditions.
        if (!this.countdown.remaining()) {
            this.game.stageActivate("end");
            // Do not run the rest of the function, duh.
            return;
        }

        // Check to make new targets.
        // The randomness might affect some game scores, but given this
        // will get called between 40 and 60 times a second, the chances
        // will be low that the screen is not filled with targets.
        // At 50% chance, allowing for non-optimal framerate:
        // 50 calls / sec * .3 targets/calls = 15 targets/sec
        if (this.numTargets < this.maxTargets && Math.random() > 0.7) {
            this.numTargets += 1;
            this.stageObjects.push(targetFactory());
        }

        // Handle events.
        event.get().forEach(function(e) {
            if (e.type == MOUSE_MOTION) {
                // Crosshair follows the mouse.
                crosshair.x = e.pos[0];
                crosshair.y = e.pos[1];
            }
            else if (e.type === MOUSE_DOWN) {
                // Mouse down triggers a flak launch and lowers score.
                flakObjects.push(new $g.local.entities.Flak(e.pos[0], e.pos[1]));
                game.local.score.mod("shotsFired", -1);
                // Flak has a regular sound.
                $g.local.flaksound.play();
            }
        });

        // Update and draw.
        display.fill('#000000');
        this.stageObjects = stageObjects.filter(function(obj) {
            var isAlive = obj.update(msDuration);

            // One definition of alive is whether it can be drawn or not.
            if (isAlive) {
                obj.draw(display);
            }

            // Additional tests for targets, as they need additional help.
            if (obj instanceof $g.local.entities.Target) {

                // In bounds or out of bounds? If out, the target will mark
                // itself as "outofbounds" and it will be removed next frame.
                collisions.notRects([obj], [game]);

                // Test targets against flak objects.
                // This will queue up an explosion next frame if they hit.
                collisions.rects([obj], flakObjects);

                if (!isAlive) {
                    // More targets can now appear.
                    stage.numTargets -= 1;
                    if (obj.state == "outofbounds") {
                        // Decrease score for missing a target.
                        game.local.score.mod("targetsEscaped", -1);
                    }
                    else if (obj.state == "exploding") {
                        // Increase score.
                        game.local.score.mod("targetsDestroyed", 3);
                        // And launch another, free explosion.
                        flakObjects.push(new $g.local.entities.Flak(obj.x, obj.y));
                        // Explosions sound different and varied.
                        $g.local.explosions.playRandom();
                        // With accompanying confeti.
                        particles.push(targetDebrisFactory(obj.x, obj.y));
                        particles.push(targetDebrisFactory(obj.x, obj.y));
                        particles.push(targetDebrisFactory(obj.x, obj.y));
                        particles.push(targetDebrisFactory(obj.x, obj.y));
                        particles.push(targetDebrisFactory(obj.x, obj.y));
                        particles.push(targetDebrisFactory(obj.x, obj.y));
                    }
                }
            }
            return isAlive;
        });

        this.particles = particles.filter(function(obj) {
            var isAlive = obj.update(msDuration);
            if (isAlive) {
                obj.draw(display);
            }
            return isAlive;
        });

        // Need to update flakObjects separately so we have access to the
        // objects separately to test for collisions.
        this.flakObjects = flakObjects = flakObjects.filter(function(obj) {
            var isAlive = obj.update(msDuration);
            // One definition of alive is whether it can be drawn or not.
            if (isAlive) {
                obj.draw(display);
            }
            return isAlive;
        });

    },
    // Clean up so we can come back to a clean game.
    exit: function(config) {
        this.stageObjects = [];
        this.flakObjects = [];
        this.particles = [];
        this.crosshair = null;
        this.scoreView = null;
        this.countdown = null;
        this.numTargets = 0;

        config.done();
    },
    // All of the objects managed during an update loop.
    // All objects promise to have an update function.
    stageObjects: [],
    flakObjects: [],
    particles: [],
    // These more important objects created during initialization and
    // referenced here.
    crosshair: null,
    scoreView: null,
    countdown: null,
    // Total number of targets on screen now, and the max allowed.
    numTargets: 0,
    // These should be constant.
    maxTargets: 15,
    gameDuration: 60000,
};



})($g.local.Stages);
;/* jshint unused:true, undef:true */
/* global $g:false */

(function(exports) {



// The end.
exports.end = {
    id: "end",
    enter: function() {
        var game = this.game;
        var defaultFont = game.local("defaultFont");
        var TextOverlay = game.TextOverlay;

        this.theEndText = new TextOverlay({
            alignx: "center",
            aligny: "center",
            text: "this is the end.",
            font: defaultFont,
        });
        this.theEndText2 = new TextOverlay({
            alignx: "center",
            aligny: "center",
            paddingy: 25,
            text: "thank you for playing shootdown.",
            font: defaultFont,
        });
        this.finalScoreText = new TextOverlay({
            alignx: "center",
            aligny: "center",
            paddingy: 50,
            text: "Your final score is: " + game.local.score.sum(),
            font: defaultFont,
        });
        this.restartMessage = new TextOverlay({
            alignx: "center",
            aligny: "center",
            // Skip a line.
            paddingy: 100,
            text: "Click to restart.",
            font: defaultFont,
        });
    },
    heartbeat: function(/*msDuration*/) {
        var game = this.game;
        var display = game.display;
        var event = game.gamejs.event;
        var MOUSE_DOWN = event.MOUSE_DOWN;

        event.get().forEach(function(e) {
            if (e.type === MOUSE_DOWN) {
                // Transition back to game.
                game.stageActivate("thegame");
            }
        });

        display.fill('#000000');
        this.theEndText.draw(display);
        this.theEndText2.draw(display);
        this.finalScoreText.draw(display);
        this.restartMessage.draw(display);
    },
    // Text Overlays, created during enter initialization.
    theEndText: null,
    theEndTest2: null,
    finalScoreText: null,
    restartMessage: null,
};



})($g.local.Stages);
;/* jshint unused:true, undef:true */
/* global $g:false */

$g.ready(function() {
    // Points to the dasspiel $g object.
    var game = this;
    var Sound = game.Sound;

    // Game specific settings.
    game.local("defaultFont", new game.gamejs.font.Font('22px monospace'));
    game.local("score", new game.ScoreKeeper());

    // What flak and explosions sound like in this game.
    game.local("explosions", [
        new Sound("audio/explosion1.wav"),
        new Sound("audio/explosion2.wav"),
        new Sound("audio/explosion3.wav"),
        new Sound("audio/explosion4.wav"),
    ]);
    game.local.explosions.playRandom = function() {
        this[Math.floor(Math.random()*this.length)].play();
    };
    game.local("flaksound", new Sound("audio/flak.wav"));

    // For testing for collisions within the game boundaries.
    game.collisionRectBoundaries = function() {
        return [0, 0].concat(this.display.getSize());
    };

    game.displayCreate(600, 600)
        .stageAdd(game.local.Stages.load)
        .stageAdd(game.local.Stages.start)
        .stageAdd(game.local.Stages.thegame)
        .stageAdd(game.local.Stages.end)
        .stageActivate("load")
        .run();

});