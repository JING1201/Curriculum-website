(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// target elements with the "draggable" class
var interact = require('interactjs')

interact('.draggable')
  .draggable({
    // enable inertial throwing
    inertia: true,
    // keep the element within the area of it's parent
    restrict: {
      restriction: "parent",
      endOnly: true,
      elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
    },
    // enable autoScroll
    autoScroll: true,

    // call this function on every dragmove event
    onmove: dragMoveListener,
    // call this function on every dragend event
    onend: function (event) {
      var textEl = event.target.querySelector('p');

      textEl && (textEl.textContent =
        'moved a distance of '
        + (Math.sqrt(Math.pow(event.pageX - event.x0, 2) +
                     Math.pow(event.pageY - event.y0, 2) | 0))
            .toFixed(2) + 'px');
    }
  });

  function dragMoveListener (event) {
    var target = event.target,
        // keep the dragged position in the data-x/data-y attributes
        x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
        y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

    // translate the element
    target.style.webkitTransform =
    target.style.transform =
      'translate(' + x + 'px, ' + y + 'px)';

    // update the posiion attributes
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
  }

},{"interactjs":2}],2:[function(require,module,exports){
/*
 * In a (windowless) server environment this file exports a factory function
 * that takes the window to use.
 *
 *     var interact = require('interact.js')(windowObject);
 *
 * See https://github.com/taye/interact.js/issues/187
 */
if (typeof window === 'undefined') {
  module.exports = function (window) {
    require('./src/utils/window').init(window);

    return require('./src/index');
  };
}
else {
  module.exports = require('./src/index');
}

},{"./src/index":20,"./src/utils/window":53}],3:[function(require,module,exports){
const extend = require('./utils/extend.js');

function fireUntilImmediateStopped (event, listeners) {
  for (const listener of listeners) {
    if (event.immediatePropagationStopped) { break; }

    listener(event);
  }
}

class Eventable {

  constructor (options) {
    this.options = extend({}, options || {});
  }

  fire (event) {
    let listeners;
    const onEvent = 'on' + event.type;
    const global = this.global;

    // Interactable#on() listeners
    if ((listeners = this[event.type])) {
      fireUntilImmediateStopped(event, listeners);
    }

    // interactable.onevent listener
    if (this[onEvent]) {
      this[onEvent](event);
    }

    // interact.on() listeners
    if (!event.propagationStopped && global && (listeners = global[event.type]))  {
      fireUntilImmediateStopped(event, listeners);
    }
  }

  on (eventType, listener) {
    // if this type of event was never bound
    if (this[eventType]) {
      this[eventType].push(listener);
    }
    else {
      this[eventType] = [listener];
    }
  }

  off (eventType, listener) {
    // if it is an action event type
    const eventList = this[eventType];
    const index     = eventList? eventList.indexOf(listener) : -1;

    if (index !== -1) {
      eventList.splice(index, 1);
    }

    if (eventList && eventList.length === 0 || !listener) {
      this[eventType] = undefined;
    }
  }
}

module.exports = Eventable;

},{"./utils/extend.js":42}],4:[function(require,module,exports){
const extend      = require('./utils/extend');
const getOriginXY = require('./utils/getOriginXY');
const defaults    = require('./defaultOptions');
const signals     = require('./utils/Signals').new();

class InteractEvent {
  /** */
  constructor (interaction, event, action, phase, element, related, preEnd = false) {
    const target      = interaction.target;
    const deltaSource = (target && target.options || defaults).deltaSource;
    const origin      = getOriginXY(target, element, action);
    const starting    = phase === 'start';
    const ending      = phase === 'end';
    const coords      = starting? interaction.startCoords : interaction.curCoords;
    const prevEvent   = interaction.prevEvent;

    element = element || interaction.element;

    const page   = extend({}, coords.page);
    const client = extend({}, coords.client);

    page.x -= origin.x;
    page.y -= origin.y;

    client.x -= origin.x;
    client.y -= origin.y;

    this.ctrlKey       = event.ctrlKey;
    this.altKey        = event.altKey;
    this.shiftKey      = event.shiftKey;
    this.metaKey       = event.metaKey;
    this.button        = event.button;
    this.buttons       = event.buttons;
    this.target        = element;
    this.currentTarget = element;
    this.relatedTarget = related || null;
    this.preEnd        = preEnd;
    this.type          = action + (phase || '');
    this.interaction   = interaction;
    this.interactable  = target;

    this.t0 = starting ? interaction.downTimes[interaction.downTimes.length - 1]
                       : prevEvent.t0;

    const signalArg = {
      interaction,
      event,
      action,
      phase,
      element,
      related,
      page,
      client,
      coords,
      starting,
      ending,
      deltaSource,
      iEvent: this,
    };

    signals.fire('set-xy', signalArg);

    if (ending) {
      // use previous coords when ending
      this.pageX = prevEvent.pageX;
      this.pageY = prevEvent.pageY;
      this.clientX = prevEvent.clientX;
      this.clientY = prevEvent.clientY;
    }
    else {
      this.pageX     = page.x;
      this.pageY     = page.y;
      this.clientX   = client.x;
      this.clientY   = client.y;
    }

    this.x0        = interaction.startCoords.page.x - origin.x;
    this.y0        = interaction.startCoords.page.y - origin.y;
    this.clientX0  = interaction.startCoords.client.x - origin.x;
    this.clientY0  = interaction.startCoords.client.y - origin.y;

    signals.fire('set-delta', signalArg);

    this.timeStamp = coords.timeStamp;
    this.dt        = interaction.pointerDelta.timeStamp;
    this.duration  = this.timeStamp - this.t0;

    // speed and velocity in pixels per second
    this.speed = interaction.pointerDelta[deltaSource].speed;
    this.velocityX = interaction.pointerDelta[deltaSource].vx;
    this.velocityY = interaction.pointerDelta[deltaSource].vy;

    this.swipe = (ending || phase === 'inertiastart')? this.getSwipe() : null;

    signals.fire('new', signalArg);
  }

  getSwipe () {
    const interaction = this.interaction;

    if (interaction.prevEvent.speed < 600
        || this.timeStamp - interaction.prevEvent.timeStamp > 150) {
      return null;
    }

    let angle = 180 * Math.atan2(interaction.prevEvent.velocityY, interaction.prevEvent.velocityX) / Math.PI;
    const overlap = 22.5;

    if (angle < 0) {
      angle += 360;
    }

    const left = 135 - overlap <= angle && angle < 225 + overlap;
    const up   = 225 - overlap <= angle && angle < 315 + overlap;

    const right = !left && (315 - overlap <= angle || angle <  45 + overlap);
    const down  = !up   &&   45 - overlap <= angle && angle < 135 + overlap;

    return {
      up,
      down,
      left,
      right,
      angle,
      speed: interaction.prevEvent.speed,
      velocity: {
        x: interaction.prevEvent.velocityX,
        y: interaction.prevEvent.velocityY,
      },
    };
  }

  preventDefault () {}

  /** */
  stopImmediatePropagation () {
    this.immediatePropagationStopped = this.propagationStopped = true;
  }

  /** */
  stopPropagation () {
    this.propagationStopped = true;
  }
}

signals.on('set-delta', function ({ iEvent, interaction, starting, deltaSource }) {
  const prevEvent = starting? iEvent : interaction.prevEvent;

  if (deltaSource === 'client') {
    iEvent.dx = iEvent.clientX - prevEvent.clientX;
    iEvent.dy = iEvent.clientY - prevEvent.clientY;
  }
  else {
    iEvent.dx = iEvent.pageX - prevEvent.pageX;
    iEvent.dy = iEvent.pageY - prevEvent.pageY;
  }
});

InteractEvent.signals = signals;

module.exports = InteractEvent;

},{"./defaultOptions":19,"./utils/Signals":35,"./utils/extend":42,"./utils/getOriginXY":43}],5:[function(require,module,exports){
const clone     = require('./utils/clone');
const is        = require('./utils/is');
const events    = require('./utils/events');
const extend    = require('./utils/extend');
const actions   = require('./actions/base');
const scope     = require('./scope');
const Eventable = require('./Eventable');
const defaults  = require('./defaultOptions');
const signals   = require('./utils/Signals').new();

const {
  getElementRect,
  nodeContains,
  trySelector,
  matchesSelector,
}                    = require('./utils/domUtils');
const { getWindow }  = require('./utils/window');
const { contains }   = require('./utils/arr');
const { wheelEvent } = require('./utils/browser');

// all set interactables
scope.interactables = [];

class Interactable {
  /** */
  constructor (target, options) {
    options = options || {};

    this.target   = target;
    this.events   = new Eventable();
    this._context = options.context || scope.document;
    this._win     = getWindow(trySelector(target)? this._context : target);
    this._doc     = this._win.document;

    signals.fire('new', {
      target,
      options,
      interactable: this,
      win: this._win,
    });

    scope.addDocument( this._doc, this._win );

    scope.interactables.push(this);

    this.set(options);
  }

  setOnEvents (action, phases) {
    const onAction = 'on' + action;

    if (is.function(phases.onstart)       ) { this.events[onAction + 'start'        ] = phases.onstart         ; }
    if (is.function(phases.onmove)        ) { this.events[onAction + 'move'         ] = phases.onmove          ; }
    if (is.function(phases.onend)         ) { this.events[onAction + 'end'          ] = phases.onend           ; }
    if (is.function(phases.oninertiastart)) { this.events[onAction + 'inertiastart' ] = phases.oninertiastart  ; }

    return this;
  }

  setPerAction (action, options) {
    // for all the default per-action options
    for (const option in options) {
      // if this option exists for this action
      if (option in defaults[action]) {
        // if the option in the options arg is an object value
        if (is.object(options[option])) {
          // duplicate the object and merge
          this.options[action][option] = clone(this.options[action][option] || {});
          extend(this.options[action][option], options[option]);

          if (is.object(defaults.perAction[option]) && 'enabled' in defaults.perAction[option]) {
            this.options[action][option].enabled = options[option].enabled === false? false : true;
          }
        }
        else if (is.bool(options[option]) && is.object(defaults.perAction[option])) {
          this.options[action][option].enabled = options[option];
        }
        else if (options[option] !== undefined) {
          // or if it's not undefined, do a plain assignment
          this.options[action][option] = options[option];
        }
      }
    }
  }

  /**
   * The default function to get an Interactables bounding rect. Can be
   * overridden using {@link Interactable.rectChecker}.
   *
   * @param {Element} [element] The element to measure.
   * @return {object} The object's bounding rectangle.
   */
  getRect (element) {
    element = element || this.target;

    if (is.string(this.target) && !(is.element(element))) {
      element = this._context.querySelector(this.target);
    }

    return getElementRect(element);
  }

  /**
   * Returns or sets the function used to calculate the interactable's
   * element's rectangle
   *
   * @param {function} [checker] A function which returns this Interactable's
   * bounding rectangle. See {@link Interactable.getRect}
   * @return {function | object} The checker function or this Interactable
   */
  rectChecker (checker) {
    if (is.function(checker)) {
      this.getRect = checker;

      return this;
    }

    if (checker === null) {
      delete this.options.getRect;

      return this;
    }

    return this.getRect;
  }

  _backCompatOption (optionName, newValue) {
    if (trySelector(newValue) || is.object(newValue)) {
      this.options[optionName] = newValue;

      for (const action of actions.names) {
        this.options[action][optionName] = newValue;
      }

      return this;
    }

    return this.options[optionName];
  }

  /**
   * Gets or sets the origin of the Interactable's element.  The x and y
   * of the origin will be subtracted from action event coordinates.
   *
   * @param {Element | object | string} [origin] An HTML or SVG Element whose
   * rect will be used, an object eg. { x: 0, y: 0 } or string 'parent', 'self'
   * or any CSS selector
   *
   * @return {object} The current origin or this Interactable
   */
  origin (newValue) {
    return this._backCompatOption('origin', newValue);
  }

  /**
   * Returns or sets the mouse coordinate types used to calculate the
   * movement of the pointer.
   *
   * @param {string} [newValue] Use 'client' if you will be scrolling while
   * interacting; Use 'page' if you want autoScroll to work
   * @return {string | object} The current deltaSource or this Interactable
   */
  deltaSource (newValue) {
    if (newValue === 'page' || newValue === 'client') {
      this.options.deltaSource = newValue;

      return this;
    }

    return this.options.deltaSource;
  }

  /**
   * Gets the selector context Node of the Interactable. The default is
   * `window.document`.
   *
   * @return {Node} The context Node of this Interactable
   */
  context () {
    return this._context;
  }

  inContext (element) {
    return (this._context === element.ownerDocument
            || nodeContains(this._context, element));
  }

  /**
   * Calls listeners for the given InteractEvent type bound globally
   * and directly to this Interactable
   *
   * @param {InteractEvent} iEvent The InteractEvent object to be fired on this
   * Interactable
   * @return {Interactable} this Interactable
   */
  fire (iEvent) {
    this.events.fire(iEvent);

    return this;
  }

  _onOffMultiple (method, eventType, listener, options) {
    if (is.string(eventType) && eventType.search(' ') !== -1) {
      eventType = eventType.trim().split(/ +/);
    }

    if (is.array(eventType)) {
      for (const type of eventType) {
        this[method](type, listener, options);
      }

      return true;
    }

    if (is.object(eventType)) {
      for (const prop in eventType) {
        this[method](prop, eventType[prop], listener);
      }

      return true;
    }
  }

  /**
   * Binds a listener for an InteractEvent, pointerEvent or DOM event.
   *
   * @param {string | array | object} eventType  The types of events to listen
   * for
   * @param {function} listener   The function event (s)
   * @param {object | boolean} [options]    options object or useCapture flag
   * for addEventListener
   * @return {object} This Interactable
   */
  on (eventType, listener, options) {
    if (this._onOffMultiple('on', eventType, listener, options)) {
      return this;
    }

    if (eventType === 'wheel') { eventType = wheelEvent; }

    if (contains(Interactable.eventTypes, eventType)) {
      this.events.on(eventType, listener);
    }
    // delegated event for selector
    else if (is.string(this.target)) {
      events.addDelegate(this.target, this._context, eventType, listener, options);
    }
    else {
      events.add(this.target, eventType, listener, options);
    }

    return this;
  }

  /**
   * Removes an InteractEvent, pointerEvent or DOM event listener
   *
   * @param {string | array | object} eventType The types of events that were
   * listened for
   * @param {function} listener The listener function to be removed
   * @param {object | boolean} [options] options object or useCapture flag for
   * removeEventListener
   * @return {object} This Interactable
   */
  off (eventType, listener, options) {
    if (this._onOffMultiple('off', eventType, listener, options)) {
      return this;
    }

    if (eventType === 'wheel') { eventType = wheelEvent; }

    // if it is an action event type
    if (contains(Interactable.eventTypes, eventType)) {
      this.events.off(eventType, listener);
    }
    // delegated event
    else if (is.string(this.target)) {
      events.removeDelegate(this.target, this._context, eventType, listener, options);
    }
    // remove listener from this Interatable's element
    else {
      events.remove(this.target, eventType, listener, options);
    }

    return this;
  }

  /**
   * Reset the options of this Interactable
   *
   * @param {object} options The new settings to apply
   * @return {object} This Interactable
   */
  set (options) {
    if (!is.object(options)) {
      options = {};
    }

    this.options = clone(defaults.base);

    const perActions = clone(defaults.perAction);

    for (const actionName in actions.methodDict) {
      const methodName = actions.methodDict[actionName];

      this.options[actionName] = clone(defaults[actionName]);

      this.setPerAction(actionName, perActions);

      this[methodName](options[actionName]);
    }

    for (const setting of Interactable.settingsMethods) {
      this.options[setting] = defaults.base[setting];

      if (setting in options) {
        this[setting](options[setting]);
      }
    }

    signals.fire('set', {
      options,
      interactable: this,
    });

    return this;
  }

  /**
   * Remove this interactable from the list of interactables and remove it's
   * action capabilities and event listeners
   *
   * @return {interact}
   */
  unset () {
    events.remove(this.target, 'all');

    if (is.string(this.target)) {
      // remove delegated events
      for (const type in events.delegatedEvents) {
        const delegated = events.delegatedEvents[type];

        if (delegated.selectors[0] === this.target
            && delegated.contexts[0] === this._context) {

          delegated.selectors.splice(0, 1);
          delegated.contexts .splice(0, 1);
          delegated.listeners.splice(0, 1);

          // remove the arrays if they are empty
          if (!delegated.selectors.length) {
            delegated[type] = null;
          }
        }

        events.remove(this._context, type, events.delegateListener);
        events.remove(this._context, type, events.delegateUseCapture, true);
      }
    }
    else {
      events.remove(this, 'all');
    }

    signals.fire('unset', { interactable: this });

    scope.interactables.splice(scope.interactables.indexOf(this), 1);

    // Stop related interactions when an Interactable is unset
    for (const interaction of scope.interactions || []) {
      if (interaction.target === this && interaction.interacting() && !interaction._ending) {
        interaction.stop();
      }
    }

    return scope.interact;
  }
}

scope.interactables.indexOfElement = function indexOfElement (target, context) {
  context = context || scope.document;

  for (let i = 0; i < this.length; i++) {
    const interactable = this[i];

    if (interactable.target === target && interactable._context === context) {
      return i;
    }
  }
  return -1;
};

scope.interactables.get = function interactableGet (element, options, dontCheckInContext) {
  const ret = this[this.indexOfElement(element, options && options.context)];

  return ret && (is.string(element) || dontCheckInContext || ret.inContext(element))? ret : null;
};

scope.interactables.forEachMatch = function (element, callback) {
  for (const interactable of this) {
    let ret;

    if ((is.string(interactable.target)
        // target is a selector and the element matches
        ? (is.element(element) && matchesSelector(element, interactable.target))
        // target is the element
        : element === interactable.target)
        // the element is in context
      && (interactable.inContext(element))) {
      ret = callback(interactable);
    }

    if (ret !== undefined) {
      return ret;
    }
  }
};

// all interact.js eventTypes
Interactable.eventTypes = scope.eventTypes = [];

Interactable.signals = signals;

Interactable.settingsMethods = [ 'deltaSource', 'origin', 'preventDefault', 'rectChecker' ];

module.exports = Interactable;

},{"./Eventable":3,"./actions/base":7,"./defaultOptions":19,"./scope":34,"./utils/Signals":35,"./utils/arr":36,"./utils/browser":37,"./utils/clone":38,"./utils/domUtils":40,"./utils/events":41,"./utils/extend":42,"./utils/is":47,"./utils/window":53}],6:[function(require,module,exports){
const scope      = require('./scope');
const utils      = require('./utils');
const events     = require('./utils/events');
const browser    = require('./utils/browser');
const domObjects = require('./utils/domObjects');
const finder     = require('./utils/interactionFinder');
const signals    = require('./utils/Signals').new();

const listeners   = {};
const methodNames = [
  'pointerDown', 'pointerMove', 'pointerUp',
  'updatePointer', 'removePointer',
];

// for ignoring browser's simulated mouse events
let prevTouchTime = 0;

// all active and idle interactions
scope.interactions = [];

class Interaction {
  /** */
  constructor ({ pointerType }) {
    this.target        = null; // current interactable being interacted with
    this.element       = null; // the target element of the interactable

    this.prepared      = {     // action that's ready to be fired on next move event
      name : null,
      axis : null,
      edges: null,
    };

    // keep track of added pointers
    this.pointers    = [];
    this.pointerIds  = [];
    this.downTargets = [];
    this.downTimes   = [];

    // Previous native pointer move event coordinates
    this.prevCoords = {
      page     : { x: 0, y: 0 },
      client   : { x: 0, y: 0 },
      timeStamp: 0,
    };
    // current native pointer move event coordinates
    this.curCoords = {
      page     : { x: 0, y: 0 },
      client   : { x: 0, y: 0 },
      timeStamp: 0,
    };

    // Starting InteractEvent pointer coordinates
    this.startCoords = {
      page     : { x: 0, y: 0 },
      client   : { x: 0, y: 0 },
      timeStamp: 0,
    };

    // Change in coordinates and time of the pointer
    this.pointerDelta = {
      page     : { x: 0, y: 0, vx: 0, vy: 0, speed: 0 },
      client   : { x: 0, y: 0, vx: 0, vy: 0, speed: 0 },
      timeStamp: 0,
    };

    this.downEvent   = null;    // pointerdown/mousedown/touchstart event
    this.downPointer = {};

    this._eventTarget    = null;
    this._curEventTarget = null;

    this.prevEvent = null;      // previous action event

    this.pointerIsDown   = false;
    this.pointerWasMoved = false;
    this._interacting    = false;
    this._ending         = false;

    this.pointerType = pointerType;

    signals.fire('new', this);

    scope.interactions.push(this);
  }

  pointerDown (pointer, event, eventTarget) {
    const pointerIndex = this.updatePointer(pointer, event, true);

    signals.fire('down', {
      pointer,
      event,
      eventTarget,
      pointerIndex,
      interaction: this,
    });
  }

  /**
   * ```js
   * interact(target)
   *   .draggable({
   *     // disable the default drag start by down->move
   *     manualStart: true
   *   })
   *   // start dragging after the user holds the pointer down
   *   .on('hold', function (event) {
   *     var interaction = event.interaction;
   *
   *     if (!interaction.interacting()) {
   *       interaction.start({ name: 'drag' },
   *                         event.interactable,
   *                         event.currentTarget);
   *     }
   * });
   * ```
   *
   * Start an action with the given Interactable and Element as tartgets. The
   * action must be enabled for the target Interactable and an appropriate
   * number of pointers must be held down - 1 for drag/resize, 2 for gesture.
   *
   * Use it with `interactable.<action>able({ manualStart: false })` to always
   * [start actions manually](https://github.com/taye/interact.js/issues/114)
   *
   * @param {object} action   The action to be performed - drag, resize, etc.
   * @param {Interactable} target  The Interactable to target
   * @param {Element} element The DOM Element to target
   * @return {object} interact
   */
  start (action, target, element) {
    if (this.interacting()
        || !this.pointerIsDown
        || this.pointerIds.length < (action.name === 'gesture'? 2 : 1)) {
      return;
    }

    // if this interaction had been removed after stopping
    // add it back
    if (scope.interactions.indexOf(this) === -1) {
      scope.interactions.push(this);
    }

    utils.copyAction(this.prepared, action);
    this.target         = target;
    this.element        = element;

    signals.fire('action-start', {
      interaction: this,
      event: this.downEvent,
    });
  }

  pointerMove (pointer, event, eventTarget) {
    if (!this.simulation) {
      this.updatePointer(pointer);
      utils.setCoords(this.curCoords, this.pointers);
    }

    const duplicateMove = (this.curCoords.page.x === this.prevCoords.page.x
                           && this.curCoords.page.y === this.prevCoords.page.y
                           && this.curCoords.client.x === this.prevCoords.client.x
                           && this.curCoords.client.y === this.prevCoords.client.y);

    let dx;
    let dy;

    // register movement greater than pointerMoveTolerance
    if (this.pointerIsDown && !this.pointerWasMoved) {
      dx = this.curCoords.client.x - this.startCoords.client.x;
      dy = this.curCoords.client.y - this.startCoords.client.y;

      this.pointerWasMoved = utils.hypot(dx, dy) > Interaction.pointerMoveTolerance;
    }

    const signalArg = {
      pointer,
      pointerIndex: this.getPointerIndex(pointer),
      event,
      eventTarget,
      dx,
      dy,
      duplicate: duplicateMove,
      interaction: this,
      interactingBeforeMove: this.interacting(),
    };

    if (!duplicateMove) {
      // set pointer coordinate, time changes and speeds
      utils.setCoordDeltas(this.pointerDelta, this.prevCoords, this.curCoords);
    }

    signals.fire('move', signalArg);

    if (!duplicateMove) {
      // if interacting, fire an 'action-move' signal etc
      if (this.interacting()) {
        this.doMove(signalArg);
      }

      if (this.pointerWasMoved) {
        utils.copyCoords(this.prevCoords, this.curCoords);
      }
    }
  }

  /**
   * ```js
   * interact(target)
   *   .draggable(true)
   *   .on('dragmove', function (event) {
   *     if (someCondition) {
   *       // change the snap settings
   *       event.interactable.draggable({ snap: { targets: [] }});
   *       // fire another move event with re-calculated snap
   *       event.interaction.doMove();
   *     }
   *   });
   * ```
   *
   * Force a move of the current action at the same coordinates. Useful if
   * snap/restrict has been changed and you want a movement with the new
   * settings.
   */
  doMove (signalArg) {
    signalArg = utils.extend({
      pointer: this.pointers[0],
      event: this.prevEvent,
      eventTarget: this._eventTarget,
      interaction: this,
    }, signalArg || {});

    signals.fire('before-action-move', signalArg);

    if (!this._dontFireMove) {
      signals.fire('action-move', signalArg);
    }

    this._dontFireMove = false;
  }

  // End interact move events and stop auto-scroll unless simulation is running
  pointerUp (pointer, event, eventTarget, curEventTarget) {
    const pointerIndex = this.getPointerIndex(pointer);

    signals.fire(/cancel$/i.test(event.type)? 'cancel' : 'up', {
      pointer,
      pointerIndex,
      event,
      eventTarget,
      curEventTarget,
      interaction: this,
    });

    if (!this.simulation) {
      this.end(event);
    }

    this.pointerIsDown = false;
    this.removePointer(pointer, event);
  }

  /**
   * ```js
   * interact(target)
   *   .draggable(true)
   *   .on('move', function (event) {
   *     if (event.pageX > 1000) {
   *       // end the current action
   *       event.interaction.end();
   *       // stop all further listeners from being called
   *       event.stopImmediatePropagation();
   *     }
   *   });
   * ```
   *
   * Stop the current action and fire an end event. Inertial movement does
   * not happen.
   *
   * @param {PointerEvent} [event]
   */
  end (event) {
    this._ending = true;

    event = event || this.prevEvent;

    if (this.interacting()) {
      signals.fire('action-end', {
        event,
        interaction: this,
      });
    }

    this.stop();
    this._ending = false;
  }

  currentAction () {
    return this._interacting? this.prepared.name: null;
  }

  interacting () {
    return this._interacting;
  }

  /** */
  stop () {
    signals.fire('stop', { interaction: this });

    if (this._interacting) {
      signals.fire('stop-active', { interaction: this });
      signals.fire('stop-' + this.prepared.name, { interaction: this });
    }

    this.target = this.element = null;

    this._interacting = false;
    this.prepared.name = this.prevEvent = null;
  }

  getPointerIndex (pointer) {
    // mouse and pen interactions may have only one pointer
    if (this.pointerType === 'mouse' || this.pointerType === 'pen') {
      return 0;
    }

    return this.pointerIds.indexOf(utils.getPointerId(pointer));
  }

  updatePointer (pointer, event, down = event && /(down|start)$/i.test(event.type)) {
    const id = utils.getPointerId(pointer);
    let index = this.getPointerIndex(pointer);

    if (index === -1) {
      index = this.pointerIds.length;
      this.pointerIds[index] = id;
    }

    if (down) {
      signals.fire('update-pointer-down', {
        pointer,
        event,
        down,
        pointerId: id,
        pointerIndex: index,
        interaction: this,
      });
    }

    this.pointers[index] = pointer;

    return index;
  }

  removePointer (pointer, event) {
    const index = this.getPointerIndex(pointer);

    if (index === -1) { return; }

    signals.fire('remove-pointer', {
      pointer,
      event,
      pointerIndex: index,
      interaction: this,
    });

    this.pointers   .splice(index, 1);
    this.pointerIds .splice(index, 1);
    this.downTargets.splice(index, 1);
    this.downTimes  .splice(index, 1);
  }

  _updateEventTargets (target, currentTarget) {
    this._eventTarget    = target;
    this._curEventTarget = currentTarget;
  }
}

for (const method of methodNames) {
  listeners[method] = doOnInteractions(method);
}

function doOnInteractions (method) {
  return (function (event) {
    const pointerType = utils.getPointerType(event);
    const [eventTarget, curEventTarget] = utils.getEventTargets(event);
    const matches = []; // [ [pointer, interaction], ...]

    if (browser.supportsTouch && /touch/.test(event.type)) {
      prevTouchTime = new Date().getTime();

      for (const changedTouch of event.changedTouches) {
        const pointer = changedTouch;
        const interaction = finder.search(pointer, event.type, eventTarget);

        matches.push([pointer, interaction || new Interaction({ pointerType })]);
      }
    }
    else {
      let invalidPointer = false;

      if (!browser.supportsPointerEvent && /mouse/.test(event.type)) {
        // ignore mouse events while touch interactions are active
        for (let i = 0; i < scope.interactions.length && !invalidPointer; i++) {
          invalidPointer = scope.interactions[i].pointerType !== 'mouse' && scope.interactions[i].pointerIsDown;
        }

        // try to ignore mouse events that are simulated by the browser
        // after a touch event
        invalidPointer = invalidPointer
          || (new Date().getTime() - prevTouchTime < 500)
          // on iOS and Firefox Mobile, MouseEvent.timeStamp is zero if simulated
          || event.timeStamp === 0;
      }

      if (!invalidPointer) {
        let interaction = finder.search(event, event.type, eventTarget);

        if (!interaction) {
          interaction = new Interaction({ pointerType });
        }

        matches.push([event, interaction]);
      }
    }

    for (const [pointer, interaction] of matches) {
      interaction._updateEventTargets(eventTarget, curEventTarget);
      interaction[method](pointer, event, eventTarget, curEventTarget);
    }
  });
}

function endAll (event) {
  for (const interaction of scope.interactions) {
    interaction.end(event);
    signals.fire('endall', { event, interaction });
  }
}

const docEvents = { /* 'eventType': listenerFunc */ };
const pEventTypes = browser.pEventTypes;

if (domObjects.PointerEvent) {
  docEvents[pEventTypes.down  ] = listeners.pointerDown;
  docEvents[pEventTypes.move  ] = listeners.pointerMove;
  docEvents[pEventTypes.up    ] = listeners.pointerUp;
  docEvents[pEventTypes.cancel] = listeners.pointerUp;
}
else {
  docEvents.mousedown   = listeners.pointerDown;
  docEvents.mousemove   = listeners.pointerMove;
  docEvents.mouseup     = listeners.pointerUp;

  docEvents.touchstart  = listeners.pointerDown;
  docEvents.touchmove   = listeners.pointerMove;
  docEvents.touchend    = listeners.pointerUp;
  docEvents.touchcancel = listeners.pointerUp;
}

docEvents.blur = endAll;

function onDocSignal ({ doc }, signalName) {
  const eventMethod = signalName.indexOf('add') === 0
    ? events.add : events.remove;

  // delegate event listener
  for (const eventType in scope.delegatedEvents) {
    eventMethod(doc, eventType, events.delegateListener);
    eventMethod(doc, eventType, events.delegateUseCapture, true);
  }

  for (const eventType in docEvents) {
    eventMethod(doc, eventType, docEvents[eventType]);
  }
}

signals.on('update-pointer-down', ({ interaction, pointer, pointerId, pointerIndex, event, eventTarget, down }) => {
  interaction.pointerIds[pointerIndex] = pointerId;
  interaction.pointers[pointerIndex] = pointer;

  if (down) {
    interaction.pointerIsDown = true;
  }

  if (!interaction.interacting()) {
    utils.setCoords(interaction.startCoords, interaction.pointers);

    utils.copyCoords(interaction.curCoords , interaction.startCoords);
    utils.copyCoords(interaction.prevCoords, interaction.startCoords);

    interaction.downEvent                 = event;
    interaction.downTimes[pointerIndex]   = interaction.curCoords.timeStamp;
    interaction.downTargets[pointerIndex] = eventTarget || event && utils.getEventTargets(event)[0];
    interaction.pointerWasMoved           = false;

    utils.pointerExtend(interaction.downPointer, pointer);
  }
});

scope.signals.on('add-document'   , onDocSignal);
scope.signals.on('remove-document', onDocSignal);

Interaction.pointerMoveTolerance = 1;
Interaction.doOnInteractions = doOnInteractions;
Interaction.endAll = endAll;
Interaction.signals = signals;
Interaction.docEvents = docEvents;

scope.endAllInteractions = endAll;

module.exports = Interaction;

},{"./scope":34,"./utils":45,"./utils/Signals":35,"./utils/browser":37,"./utils/domObjects":39,"./utils/events":41,"./utils/interactionFinder":46}],7:[function(require,module,exports){
const Interaction   = require('../Interaction');
const InteractEvent = require('../InteractEvent');

const actions = {
  firePrepared,
  names: [],
  methodDict: {},
};

Interaction.signals.on('action-start', function ({ interaction, event }) {
  interaction._interacting = true;
  firePrepared(interaction, event, 'start');
});

Interaction.signals.on('action-move', function ({ interaction, event, preEnd }) {
  firePrepared(interaction, event, 'move', preEnd);

  // if the action was ended in a listener
  if (!interaction.interacting()) { return false; }
});

Interaction.signals.on('action-end', function ({ interaction, event }) {
  firePrepared(interaction, event, 'end');
});

function firePrepared (interaction, event, phase, preEnd) {
  const actionName = interaction.prepared.name;

  const newEvent = new InteractEvent(interaction, event, actionName, phase, interaction.element, null, preEnd);

  interaction.target.fire(newEvent);
  interaction.prevEvent = newEvent;
}

module.exports = actions;

},{"../InteractEvent":4,"../Interaction":6}],8:[function(require,module,exports){
const actions        = require('./base');
const utils          = require('../utils');
const InteractEvent  = require('../InteractEvent');
/** @lends Interactable */
const Interactable   = require('../Interactable');
const Interaction    = require('../Interaction');
const defaultOptions = require('../defaultOptions');

const drag = {
  defaults: {
    enabled     : false,
    mouseButtons: null,

    origin    : null,
    snap      : null,
    restrict  : null,
    inertia   : null,
    autoScroll: null,

    startAxis : 'xy',
    lockAxis  : 'xy',
  },

  checker: function (pointer, event, interactable) {
    const dragOptions = interactable.options.drag;

    return dragOptions.enabled
      ? { name: 'drag', axis: (dragOptions.lockAxis === 'start'
                               ? dragOptions.startAxis
                               : dragOptions.lockAxis)}
      : null;
  },

  getCursor: function () {
    return 'move';
  },
};

Interaction.signals.on('before-action-move', function ({ interaction }) {
  if (interaction.prepared.name !== 'drag') { return; }

  const axis = interaction.prepared.axis;

  if (axis === 'x') {
    interaction.curCoords.page.y   = interaction.startCoords.page.y;
    interaction.curCoords.client.y = interaction.startCoords.client.y;

    interaction.pointerDelta.page.speed   = Math.abs(interaction.pointerDelta.page.vx);
    interaction.pointerDelta.client.speed = Math.abs(interaction.pointerDelta.client.vx);
    interaction.pointerDelta.client.vy = 0;
    interaction.pointerDelta.page.vy   = 0;
  }
  else if (axis === 'y') {
    interaction.curCoords.page.x   = interaction.startCoords.page.x;
    interaction.curCoords.client.x = interaction.startCoords.client.x;

    interaction.pointerDelta.page.speed   = Math.abs(interaction.pointerDelta.page.vy);
    interaction.pointerDelta.client.speed = Math.abs(interaction.pointerDelta.client.vy);
    interaction.pointerDelta.client.vx = 0;
    interaction.pointerDelta.page.vx   = 0;
  }
});

// dragmove
InteractEvent.signals.on('new', function ({ iEvent, interaction }) {
  if (iEvent.type !== 'dragmove') { return; }

  const axis = interaction.prepared.axis;

  if (axis === 'x') {
    iEvent.pageY   = interaction.startCoords.page.y;
    iEvent.clientY = interaction.startCoords.client.y;
    iEvent.dy = 0;
  }
  else if (axis === 'y') {
    iEvent.pageX   = interaction.startCoords.page.x;
    iEvent.clientX = interaction.startCoords.client.x;
    iEvent.dx = 0;
  }
});

/**
 * ```js
 * interact(element).draggable({
 *     onstart: function (event) {},
 *     onmove : function (event) {},
 *     onend  : function (event) {},
 *
 *     // the axis in which the first movement must be
 *     // for the drag sequence to start
 *     // 'xy' by default - any direction
 *     startAxis: 'x' || 'y' || 'xy',
 *
 *     // 'xy' by default - don't restrict to one axis (move in any direction)
 *     // 'x' or 'y' to restrict movement to either axis
 *     // 'start' to restrict movement to the axis the drag started in
 *     lockAxis: 'x' || 'y' || 'xy' || 'start',
 *
 *     // max number of drags that can happen concurrently
 *     // with elements of this Interactable. Infinity by default
 *     max: Infinity,
 *
 *     // max number of drags that can target the same element+Interactable
 *     // 1 by default
 *     maxPerElement: 2
 * });
 *
 * var isDraggable = interact('element').draggable(); // true
 * ```
 *
 * Get or set whether drag actions can be performed on the target
 *
 * @param {boolean | object} [options] true/false or An object with event
 * listeners to be fired on drag events (object makes the Interactable
 * draggable)
 * @return {boolean | Interactable} boolean indicating if this can be the
 * target of drag events, or this Interctable
 */
Interactable.prototype.draggable = function (options) {
  if (utils.is.object(options)) {
    this.options.drag.enabled = options.enabled === false? false: true;
    this.setPerAction('drag', options);
    this.setOnEvents('drag', options);

    if (/^(xy|x|y|start)$/.test(options.lockAxis)) {
      this.options.drag.lockAxis = options.lockAxis;
    }
    if (/^(xy|x|y)$/.test(options.startAxis)) {
      this.options.drag.startAxis = options.startAxis;
    }

    return this;
  }

  if (utils.is.bool(options)) {
    this.options.drag.enabled = options;

    if (!options) {
      this.ondragstart = this.ondragstart = this.ondragend = null;
    }

    return this;
  }

  return this.options.drag;
};

actions.drag = drag;
actions.names.push('drag');
utils.merge(Interactable.eventTypes, [
  'dragstart',
  'dragmove',
  'draginertiastart',
  'draginertiaresume',
  'dragend',
]);
actions.methodDict.drag = 'draggable';

defaultOptions.drag = drag.defaults;

module.exports = drag;

},{"../InteractEvent":4,"../Interactable":5,"../Interaction":6,"../defaultOptions":19,"../utils":45,"./base":7}],9:[function(require,module,exports){
const actions        = require('./base');
const utils          = require('../utils');
const scope          = require('../scope');
/** @lends module:interact */
const interact       = require('../interact');
const InteractEvent  = require('../InteractEvent');
/** @lends Interactable */
const Interactable   = require('../Interactable');
const Interaction    = require('../Interaction');
const defaultOptions = require('../defaultOptions');

const drop = {
  defaults: {
    enabled: false,
    accept : null,
    overlap: 'pointer',
  },
};

let dynamicDrop = false;

Interaction.signals.on('action-start', function ({ interaction, event }) {
  if (interaction.prepared.name !== 'drag') { return; }

  // reset active dropzones
  interaction.activeDrops.dropzones = [];
  interaction.activeDrops.elements  = [];
  interaction.activeDrops.rects     = [];

  interaction.dropEvents = null;

  if (!interaction.dynamicDrop) {
    setActiveDrops(interaction.activeDrops, interaction.element);
  }

  const dragEvent = interaction.prevEvent;
  const dropEvents = getDropEvents(interaction, event, dragEvent);

  if (dropEvents.activate) {
    fireActiveDrops(interaction.activeDrops, dropEvents.activate);
  }
});

InteractEvent.signals.on('new', function ({ interaction, iEvent, event }) {
  if (iEvent.type !== 'dragmove' && iEvent.type !== 'dragend') { return; }

  const draggableElement = interaction.element;
  const dragEvent = iEvent;
  const dropResult = getDrop(dragEvent, event, draggableElement);

  interaction.dropTarget  = dropResult.dropzone;
  interaction.dropElement = dropResult.element;

  interaction.dropEvents = getDropEvents(interaction, event, dragEvent);
});

Interaction.signals.on('action-move', function ({ interaction }) {
  if (interaction.prepared.name !== 'drag') { return; }

  fireDropEvents(interaction, interaction.dropEvents);
});

Interaction.signals.on('action-end', function ({ interaction }) {
  if (interaction.prepared.name === 'drag') {
    fireDropEvents(interaction, interaction.dropEvents);
  }
});

Interaction.signals.on('stop-drag', function ({ interaction }) {
  interaction.activeDrops = {
    dropzones: null,
    elements: null,
    rects: null,
  };

  interaction.dropEvents = null;
});

function collectDrops (activeDrops, element) {
  const drops = [];
  const elements = [];

  // collect all dropzones and their elements which qualify for a drop
  for (const current of scope.interactables) {
    if (!current.options.drop.enabled) { continue; }

    const accept = current.options.drop.accept;

    // test the draggable element against the dropzone's accept setting
    if ((utils.is.element(accept) && accept !== element)
        || (utils.is.string(accept)
        && !utils.matchesSelector(element, accept))) {

      continue;
    }

    // query for new elements if necessary
    const dropElements = utils.is.string(current.target)
      ? current._context.querySelectorAll(current.target)
      : [current.target];

    for (const currentElement of dropElements) {
      if (currentElement !== element) {
        drops.push(current);
        elements.push(currentElement);
      }
    }
  }

  return {
    elements,
    dropzones: drops,
  };
}

function fireActiveDrops (activeDrops, event) {
  let prevElement;

  // loop through all active dropzones and trigger event
  for (let i = 0; i < activeDrops.dropzones.length; i++) {
    const current = activeDrops.dropzones[i];
    const currentElement = activeDrops.elements [i];

    // prevent trigger of duplicate events on same element
    if (currentElement !== prevElement) {
      // set current element as event target
      event.target = currentElement;
      current.fire(event);
    }
    prevElement = currentElement;
  }
}

// Collect a new set of possible drops and save them in activeDrops.
// setActiveDrops should always be called when a drag has just started or a
// drag event happens while dynamicDrop is true
function setActiveDrops (activeDrops, dragElement) {
  // get dropzones and their elements that could receive the draggable
  const possibleDrops = collectDrops(activeDrops, dragElement);

  activeDrops.dropzones = possibleDrops.dropzones;
  activeDrops.elements  = possibleDrops.elements;
  activeDrops.rects     = [];

  for (let i = 0; i < activeDrops.dropzones.length; i++) {
    activeDrops.rects[i] = activeDrops.dropzones[i].getRect(activeDrops.elements[i]);
  }
}

function getDrop (dragEvent, event, dragElement) {
  const interaction = dragEvent.interaction;
  const validDrops = [];

  if (dynamicDrop) {
    setActiveDrops(interaction.activeDrops, dragElement);
  }

  // collect all dropzones and their elements which qualify for a drop
  for (let j = 0; j < interaction.activeDrops.dropzones.length; j++) {
    const current        = interaction.activeDrops.dropzones[j];
    const currentElement = interaction.activeDrops.elements [j];
    const rect           = interaction.activeDrops.rects    [j];

    validDrops.push(current.dropCheck(dragEvent, event, interaction.target, dragElement, currentElement, rect)
      ? currentElement
      : null);
  }

  // get the most appropriate dropzone based on DOM depth and order
  const dropIndex = utils.indexOfDeepestElement(validDrops);

  return {
    dropzone: interaction.activeDrops.dropzones[dropIndex] || null,
    element : interaction.activeDrops.elements [dropIndex] || null,
  };
}

function getDropEvents (interaction, pointerEvent, dragEvent) {
  const dropEvents = {
    enter     : null,
    leave     : null,
    activate  : null,
    deactivate: null,
    move      : null,
    drop      : null,
  };

  const tmpl = {
    dragEvent,
    interaction,
    target       : interaction.dropElement,
    dropzone     : interaction.dropTarget,
    relatedTarget: dragEvent.target,
    draggable    : dragEvent.interactable,
    timeStamp    : dragEvent.timeStamp,
  };

  if (interaction.dropElement !== interaction.prevDropElement) {
    // if there was a prevDropTarget, create a dragleave event
    if (interaction.prevDropTarget) {
      dropEvents.leave = utils.extend({ type: 'dragleave' }, tmpl);

      dragEvent.dragLeave    = dropEvents.leave.target   = interaction.prevDropElement;
      dragEvent.prevDropzone = dropEvents.leave.dropzone = interaction.prevDropTarget;
    }
    // if the dropTarget is not null, create a dragenter event
    if (interaction.dropTarget) {
      dropEvents.enter = {
        dragEvent,
        interaction,
        target       : interaction.dropElement,
        dropzone     : interaction.dropTarget,
        relatedTarget: dragEvent.target,
        draggable    : dragEvent.interactable,
        timeStamp    : dragEvent.timeStamp,
        type         : 'dragenter',
      };

      dragEvent.dragEnter = interaction.dropElement;
      dragEvent.dropzone = interaction.dropTarget;
    }
  }

  if (dragEvent.type === 'dragend' && interaction.dropTarget) {
    dropEvents.drop = utils.extend({ type: 'drop' }, tmpl);

    dragEvent.dropzone = interaction.dropTarget;
    dragEvent.relatedTarget = interaction.dropElement;
  }
  if (dragEvent.type === 'dragstart') {
    dropEvents.activate = utils.extend({ type: 'dropactivate' }, tmpl);

    dropEvents.activate.target   = null;
    dropEvents.activate.dropzone = null;
  }
  if (dragEvent.type === 'dragend') {
    dropEvents.deactivate = utils.extend({ type: 'dropdeactivate' }, tmpl);

    dropEvents.deactivate.target   = null;
    dropEvents.deactivate.dropzone = null;
  }
  if (dragEvent.type === 'dragmove' && interaction.dropTarget) {
    dropEvents.move = utils.extend({
      dragmove     : dragEvent,
      type         : 'dropmove',
    }, tmpl);

    dragEvent.dropzone = interaction.dropTarget;
  }

  return dropEvents;
}

function fireDropEvents (interaction, dropEvents) {
  const {
    activeDrops,
    prevDropTarget,
    dropTarget,
    dropElement,
  } = interaction;

  if (dropEvents.leave) { prevDropTarget.fire(dropEvents.leave); }
  if (dropEvents.move ) {     dropTarget.fire(dropEvents.move ); }
  if (dropEvents.enter) {     dropTarget.fire(dropEvents.enter); }
  if (dropEvents.drop ) {     dropTarget.fire(dropEvents.drop ); }
  if (dropEvents.deactivate) {
    fireActiveDrops(activeDrops, dropEvents.deactivate);
  }

  interaction.prevDropTarget  = dropTarget;
  interaction.prevDropElement = dropElement;
}

/**
 * ```js
 * interact(target)
 * .dropChecker(function(dragEvent,         // related dragmove or dragend event
 *                       event,             // TouchEvent/PointerEvent/MouseEvent
 *                       dropped,           // bool result of the default checker
 *                       dropzone,          // dropzone Interactable
 *                       dropElement,       // dropzone elemnt
 *                       draggable,         // draggable Interactable
 *                       draggableElement) {// draggable element
 *
 *   return dropped && event.target.hasAttribute('allow-drop');
 * }
 * ```
 *
 * ```js
 * interact('.drop').dropzone({
 *   accept: '.can-drop' || document.getElementById('single-drop'),
 *   overlap: 'pointer' || 'center' || zeroToOne
 * }
 * ```
 *
 * Returns or sets whether draggables can be dropped onto this target to
 * trigger drop events
 *
 * Dropzones can receive the following events:
 *  - `dropactivate` and `dropdeactivate` when an acceptable drag starts and ends
 *  - `dragenter` and `dragleave` when a draggable enters and leaves the dropzone
 *  - `dragmove` when a draggable that has entered the dropzone is moved
 *  - `drop` when a draggable is dropped into this dropzone
 *
 * Use the `accept` option to allow only elements that match the given CSS
 * selector or element. The value can be:
 *
 *  - **an Element** - only that element can be dropped into this dropzone.
 *  - **a string**, - the element being dragged must match it as a CSS selector.
 *  - **`null`** - accept options is cleared - it accepts any element.
 *
 * Use the `overlap` option to set how drops are checked for. The allowed
 * values are:
 *
 *   - `'pointer'`, the pointer must be over the dropzone (default)
 *   - `'center'`, the draggable element's center must be over the dropzone
 *   - a number from 0-1 which is the `(intersection area) / (draggable area)`.
 *   e.g. `0.5` for drop to happen when half of the area of the draggable is
 *   over the dropzone
 *
 * Use the `checker` option to specify a function to check if a dragged element
 * is over this Interactable.
 *
 * @param {boolean | object | null} [options] The new options to be set.
 * @return {boolean | Interactable} The current setting or this Interactable
 */
Interactable.prototype.dropzone = function (options) {
  if (utils.is.object(options)) {
    this.options.drop.enabled = options.enabled === false? false: true;

    if (utils.is.function(options.ondrop)          ) { this.events.ondrop           = options.ondrop          ; }
    if (utils.is.function(options.ondropactivate)  ) { this.events.ondropactivate   = options.ondropactivate  ; }
    if (utils.is.function(options.ondropdeactivate)) { this.events.ondropdeactivate = options.ondropdeactivate; }
    if (utils.is.function(options.ondragenter)     ) { this.events.ondragenter      = options.ondragenter     ; }
    if (utils.is.function(options.ondragleave)     ) { this.events.ondragleave      = options.ondragleave     ; }
    if (utils.is.function(options.ondropmove)      ) { this.events.ondropmove       = options.ondropmove      ; }

    if (/^(pointer|center)$/.test(options.overlap)) {
      this.options.drop.overlap = options.overlap;
    }
    else if (utils.is.number(options.overlap)) {
      this.options.drop.overlap = Math.max(Math.min(1, options.overlap), 0);
    }
    if ('accept' in options) {
      this.options.drop.accept = options.accept;
    }
    if ('checker' in options) {
      this.options.drop.checker = options.checker;
    }


    return this;
  }

  if (utils.is.bool(options)) {
    this.options.drop.enabled = options;

    if (!options) {
      this.ondragenter = this.ondragleave = this.ondrop
        = this.ondropactivate = this.ondropdeactivate = null;
    }

    return this;
  }

  return this.options.drop;
};

Interactable.prototype.dropCheck = function (dragEvent, event, draggable, draggableElement, dropElement, rect) {
  let dropped = false;

  // if the dropzone has no rect (eg. display: none)
  // call the custom dropChecker or just return false
  if (!(rect = rect || this.getRect(dropElement))) {
    return (this.options.drop.checker
      ? this.options.drop.checker(dragEvent, event, dropped, this, dropElement, draggable, draggableElement)
      : false);
  }

  const dropOverlap = this.options.drop.overlap;

  if (dropOverlap === 'pointer') {
    const origin = utils.getOriginXY(draggable, draggableElement, 'drag');
    const page = utils.getPageXY(dragEvent);

    page.x += origin.x;
    page.y += origin.y;

    const horizontal = (page.x > rect.left) && (page.x < rect.right);
    const vertical   = (page.y > rect.top ) && (page.y < rect.bottom);

    dropped = horizontal && vertical;
  }

  const dragRect = draggable.getRect(draggableElement);

  if (dragRect && dropOverlap === 'center') {
    const cx = dragRect.left + dragRect.width  / 2;
    const cy = dragRect.top  + dragRect.height / 2;

    dropped = cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom;
  }

  if (dragRect && utils.is.number(dropOverlap)) {
    const overlapArea  = (Math.max(0, Math.min(rect.right , dragRect.right ) - Math.max(rect.left, dragRect.left))
                          * Math.max(0, Math.min(rect.bottom, dragRect.bottom) - Math.max(rect.top , dragRect.top )));

    const overlapRatio = overlapArea / (dragRect.width * dragRect.height);

    dropped = overlapRatio >= dropOverlap;
  }

  if (this.options.drop.checker) {
    dropped = this.options.drop.checker(dragEvent, event, dropped, this, dropElement, draggable, draggableElement);
  }

  return dropped;
};

Interactable.signals.on('unset', function ({ interactable }) {
  interactable.dropzone(false);
});

Interactable.settingsMethods.push('dropChecker');

Interaction.signals.on('new', function (interaction) {
  interaction.dropTarget      = null; // the dropzone a drag target might be dropped into
  interaction.dropElement     = null; // the element at the time of checking
  interaction.prevDropTarget  = null; // the dropzone that was recently dragged away from
  interaction.prevDropElement = null; // the element at the time of checking
  interaction.dropEvents      = null; // the dropEvents related to the current drag event

  interaction.activeDrops = {
    dropzones: [],      // the dropzones that are mentioned below
    elements : [],      // elements of dropzones that accept the target draggable
    rects    : [],      // the rects of the elements mentioned above
  };

});

Interaction.signals.on('stop', function ({ interaction }) {
  interaction.dropTarget = interaction.dropElement =
    interaction.prevDropTarget = interaction.prevDropElement = null;
});

/**
 * Returns or sets whether the dimensions of dropzone elements are calculated
 * on every dragmove or only on dragstart for the default dropChecker
 *
 * @param {boolean} [newValue] True to check on each move. False to check only
 * before start
 * @return {boolean | interact} The current setting or interact
 */
interact.dynamicDrop = function (newValue) {
  if (utils.is.bool(newValue)) {
    //if (dragging && dynamicDrop !== newValue && !newValue) {
      //calcRects(dropzones);
    //}

    dynamicDrop = newValue;

    return interact;
  }
  return dynamicDrop;
};

utils.merge(Interactable.eventTypes, [
  'dragenter',
  'dragleave',
  'dropactivate',
  'dropdeactivate',
  'dropmove',
  'drop',
]);
actions.methodDict.drop = 'dropzone';

defaultOptions.drop = drop.defaults;

module.exports = drop;

},{"../InteractEvent":4,"../Interactable":5,"../Interaction":6,"../defaultOptions":19,"../interact":22,"../scope":34,"../utils":45,"./base":7}],10:[function(require,module,exports){
const actions        = require('./base');
const utils          = require('../utils');
const InteractEvent  = require('../InteractEvent');
const Interactable   = require('../Interactable');
const Interaction    = require('../Interaction');
const defaultOptions = require('../defaultOptions');

const gesture = {
  defaults: {
    enabled : false,
    origin  : null,
    restrict: null,
  },

  checker: function (pointer, event, interactable, element, interaction) {
    if (interaction.pointerIds.length >= 2) {
      return { name: 'gesture' };
    }

    return null;
  },

  getCursor: function () {
    return '';
  },
};

InteractEvent.signals.on('new', function ({ iEvent, interaction }) {
  if (iEvent.type !== 'gesturestart') { return; }
  iEvent.ds = 0;

  interaction.gesture.startDistance = interaction.gesture.prevDistance = iEvent.distance;
  interaction.gesture.startAngle = interaction.gesture.prevAngle = iEvent.angle;
  interaction.gesture.scale = 1;
});

InteractEvent.signals.on('new', function ({ iEvent, interaction }) {
  if (iEvent.type !== 'gesturemove') { return; }

  iEvent.ds = iEvent.scale - interaction.gesture.scale;

  interaction.target.fire(iEvent);

  interaction.gesture.prevAngle = iEvent.angle;
  interaction.gesture.prevDistance = iEvent.distance;

  if (iEvent.scale !== Infinity
      && iEvent.scale !== null
      && iEvent.scale !== undefined
      && !isNaN(iEvent.scale)) {

    interaction.gesture.scale = iEvent.scale;
  }
});

/**
 * ```js
 * interact(element).gesturable({
 *     onstart: function (event) {},
 *     onmove : function (event) {},
 *     onend  : function (event) {},
 *
 *     // limit multiple gestures.
 *     // See the explanation in {@link Interactable.draggable} example
 *     max: Infinity,
 *     maxPerElement: 1,
 * });
 *
 * var isGestureable = interact(element).gesturable();
 * ```
 *
 * Gets or sets whether multitouch gestures can be performed on the target
 *
 * @param {boolean | object} [options] true/false or An object with event
 * listeners to be fired on gesture events (makes the Interactable gesturable)
 * @return {boolean | Interactable} A boolean indicating if this can be the
 * target of gesture events, or this Interactable
 */
Interactable.prototype.gesturable = function (options) {
  if (utils.is.object(options)) {
    this.options.gesture.enabled = options.enabled === false? false: true;
    this.setPerAction('gesture', options);
    this.setOnEvents('gesture', options);

    return this;
  }

  if (utils.is.bool(options)) {
    this.options.gesture.enabled = options;

    if (!options) {
      this.ongesturestart = this.ongesturestart = this.ongestureend = null;
    }

    return this;
  }

  return this.options.gesture;
};

InteractEvent.signals.on('set-delta', function ({ interaction, iEvent, action, event, starting, ending, deltaSource }) {
  if (action !== 'gesture') { return; }

  const pointers = interaction.pointers;

  iEvent.touches = [pointers[0], pointers[1]];

  if (starting) {
    iEvent.distance = utils.touchDistance(pointers, deltaSource);
    iEvent.box      = utils.touchBBox(pointers);
    iEvent.scale    = 1;
    iEvent.ds       = 0;
    iEvent.angle    = utils.touchAngle(pointers, undefined, deltaSource);
    iEvent.da       = 0;
  }
  else if (ending || event instanceof InteractEvent) {
    iEvent.distance = interaction.prevEvent.distance;
    iEvent.box      = interaction.prevEvent.box;
    iEvent.scale    = interaction.prevEvent.scale;
    iEvent.ds       = iEvent.scale - 1;
    iEvent.angle    = interaction.prevEvent.angle;
    iEvent.da       = iEvent.angle - interaction.gesture.startAngle;
  }
  else {
    iEvent.distance = utils.touchDistance(pointers, deltaSource);
    iEvent.box      = utils.touchBBox(pointers);
    iEvent.scale    = iEvent.distance / interaction.gesture.startDistance;
    iEvent.angle    = utils.touchAngle(pointers, interaction.gesture.prevAngle, deltaSource);

    iEvent.ds = iEvent.scale - interaction.gesture.prevScale;
    iEvent.da = iEvent.angle - interaction.gesture.prevAngle;
  }
});

Interaction.signals.on('new', function (interaction) {
  interaction.gesture = {
    start: { x: 0, y: 0 },

    startDistance: 0,   // distance between two touches of touchStart
    prevDistance : 0,
    distance     : 0,

    scale: 1,           // gesture.distance / gesture.startDistance

    startAngle: 0,      // angle of line joining two touches
    prevAngle : 0,      // angle of the previous gesture event
  };
});

actions.gesture = gesture;
actions.names.push('gesture');
utils.merge(Interactable.eventTypes, [
  'gesturestart',
  'gesturemove',
  'gestureend',
]);
actions.methodDict.gesture = 'gesturable';

defaultOptions.gesture = gesture.defaults;

module.exports = gesture;

},{"../InteractEvent":4,"../Interactable":5,"../Interaction":6,"../defaultOptions":19,"../utils":45,"./base":7}],11:[function(require,module,exports){
const actions        = require('./base');
const utils          = require('../utils');
const browser        = require('../utils/browser');
const InteractEvent  = require('../InteractEvent');
/** @lends Interactable */
const Interactable   = require('../Interactable');
const Interaction    = require('../Interaction');
const defaultOptions = require('../defaultOptions');

// Less Precision with touch input
const defaultMargin = browser.supportsTouch || browser.supportsPointerEvent? 20: 10;

const resize = {
  defaults: {
    enabled     : false,
    mouseButtons: null,

    origin    : null,
    snap      : null,
    restrict  : null,
    inertia   : null,
    autoScroll: null,

    square: false,
    preserveAspectRatio: false,
    axis: 'xy',

    // use default margin
    margin: NaN,

    // object with props left, right, top, bottom which are
    // true/false values to resize when the pointer is over that edge,
    // CSS selectors to match the handles for each direction
    // or the Elements for each handle
    edges: null,

    // a value of 'none' will limit the resize rect to a minimum of 0x0
    // 'negate' will alow the rect to have negative width/height
    // 'reposition' will keep the width/height positive by swapping
    // the top and bottom edges and/or swapping the left and right edges
    invert: 'none',
  },

  checker: function (pointer, event, interactable, element, interaction, rect) {
    if (!rect) { return null; }

    const page = utils.extend({}, interaction.curCoords.page);
    const options = interactable.options;

    if (options.resize.enabled) {
      const resizeOptions = options.resize;
      const resizeEdges = { left: false, right: false, top: false, bottom: false };

      // if using resize.edges
      if (utils.is.object(resizeOptions.edges)) {
        for (const edge in resizeEdges) {
          resizeEdges[edge] = checkResizeEdge(edge,
                                              resizeOptions.edges[edge],
                                              page,
                                              interaction._eventTarget,
                                              element,
                                              rect,
                                              resizeOptions.margin || defaultMargin);
        }

        resizeEdges.left = resizeEdges.left && !resizeEdges.right;
        resizeEdges.top  = resizeEdges.top  && !resizeEdges.bottom;

        if (resizeEdges.left || resizeEdges.right || resizeEdges.top || resizeEdges.bottom) {
          return {
            name: 'resize',
            edges: resizeEdges,
          };
        }
      }
      else {
        const right  = options.resize.axis !== 'y' && page.x > (rect.right  - defaultMargin);
        const bottom = options.resize.axis !== 'x' && page.y > (rect.bottom - defaultMargin);

        if (right || bottom) {
          return {
            name: 'resize',
            axes: (right? 'x' : '') + (bottom? 'y' : ''),
          };
        }
      }
    }

    return null;
  },

  cursors: (browser.isIe9 ? {
    x : 'e-resize',
    y : 's-resize',
    xy: 'se-resize',

    top        : 'n-resize',
    left       : 'w-resize',
    bottom     : 's-resize',
    right      : 'e-resize',
    topleft    : 'se-resize',
    bottomright: 'se-resize',
    topright   : 'ne-resize',
    bottomleft : 'ne-resize',
  } : {
    x : 'ew-resize',
    y : 'ns-resize',
    xy: 'nwse-resize',

    top        : 'ns-resize',
    left       : 'ew-resize',
    bottom     : 'ns-resize',
    right      : 'ew-resize',
    topleft    : 'nwse-resize',
    bottomright: 'nwse-resize',
    topright   : 'nesw-resize',
    bottomleft : 'nesw-resize',
  }),

  getCursor: function (action) {
    if (action.axis) {
      return resize.cursors[action.name + action.axis];
    }
    else if (action.edges) {
      let cursorKey = '';
      const edgeNames = ['top', 'bottom', 'left', 'right'];

      for (let i = 0; i < 4; i++) {
        if (action.edges[edgeNames[i]]) {
          cursorKey += edgeNames[i];
        }
      }

      return resize.cursors[cursorKey];
    }
  },
};

// resizestart
InteractEvent.signals.on('new', function ({ iEvent, interaction }) {
  if (iEvent.type !== 'resizestart' || !interaction.prepared.edges) {
    return;
  }

  const startRect = interaction.target.getRect(interaction.element);
  const resizeOptions = interaction.target.options.resize;

  /*
   * When using the `resizable.square` or `resizable.preserveAspectRatio` options, resizing from one edge
   * will affect another. E.g. with `resizable.square`, resizing to make the right edge larger will make
   * the bottom edge larger by the same amount. We call these 'linked' edges. Any linked edges will depend
   * on the active edges and the edge being interacted with.
   */
  if (resizeOptions.square || resizeOptions.preserveAspectRatio) {
    const linkedEdges = utils.extend({}, interaction.prepared.edges);

    linkedEdges.top    = linkedEdges.top    || (linkedEdges.left   && !linkedEdges.bottom);
    linkedEdges.left   = linkedEdges.left   || (linkedEdges.top    && !linkedEdges.right );
    linkedEdges.bottom = linkedEdges.bottom || (linkedEdges.right  && !linkedEdges.top   );
    linkedEdges.right  = linkedEdges.right  || (linkedEdges.bottom && !linkedEdges.left  );

    interaction.prepared._linkedEdges = linkedEdges;
  }
  else {
    interaction.prepared._linkedEdges = null;
  }

  // if using `resizable.preserveAspectRatio` option, record aspect ratio at the start of the resize
  if (resizeOptions.preserveAspectRatio) {
    interaction.resizeStartAspectRatio = startRect.width / startRect.height;
  }

  interaction.resizeRects = {
    start     : startRect,
    current   : utils.extend({}, startRect),
    inverted  : utils.extend({}, startRect),
    previous  : utils.extend({}, startRect),
    delta     : {
      left: 0, right : 0, width : 0,
      top : 0, bottom: 0, height: 0,
    },
  };

  iEvent.rect = interaction.resizeRects.inverted;
  iEvent.deltaRect = interaction.resizeRects.delta;
});

// resizemove
InteractEvent.signals.on('new', function ({ iEvent, phase, interaction }) {
  if (phase !== 'move' || !interaction.prepared.edges) { return; }

  const resizeOptions = interaction.target.options.resize;
  const invert = resizeOptions.invert;
  const invertible = invert === 'reposition' || invert === 'negate';

  let edges = interaction.prepared.edges;

  const start      = interaction.resizeRects.start;
  const current    = interaction.resizeRects.current;
  const inverted   = interaction.resizeRects.inverted;
  const delta      = interaction.resizeRects.delta;
  const previous   = utils.extend(interaction.resizeRects.previous, inverted);
  const originalEdges = edges;

  let dx = iEvent.dx;
  let dy = iEvent.dy;

  if (resizeOptions.preserveAspectRatio || resizeOptions.square) {
    // `resize.preserveAspectRatio` takes precedence over `resize.square`
    const startAspectRatio = resizeOptions.preserveAspectRatio
      ? interaction.resizeStartAspectRatio
      : 1;

    edges = interaction.prepared._linkedEdges;

    if ((originalEdges.left && originalEdges.bottom)
        || (originalEdges.right && originalEdges.top)) {
      dy = -dx / startAspectRatio;
    }
    else if (originalEdges.left || originalEdges.right ) { dy = dx / startAspectRatio; }
    else if (originalEdges.top  || originalEdges.bottom) { dx = dy * startAspectRatio; }
  }

  // update the 'current' rect without modifications
  if (edges.top   ) { current.top    += dy; }
  if (edges.bottom) { current.bottom += dy; }
  if (edges.left  ) { current.left   += dx; }
  if (edges.right ) { current.right  += dx; }

  if (invertible) {
    // if invertible, copy the current rect
    utils.extend(inverted, current);

    if (invert === 'reposition') {
      // swap edge values if necessary to keep width/height positive
      let swap;

      if (inverted.top > inverted.bottom) {
        swap = inverted.top;

        inverted.top = inverted.bottom;
        inverted.bottom = swap;
      }
      if (inverted.left > inverted.right) {
        swap = inverted.left;

        inverted.left = inverted.right;
        inverted.right = swap;
      }
    }
  }
  else {
    // if not invertible, restrict to minimum of 0x0 rect
    inverted.top    = Math.min(current.top, start.bottom);
    inverted.bottom = Math.max(current.bottom, start.top);
    inverted.left   = Math.min(current.left, start.right);
    inverted.right  = Math.max(current.right, start.left);
  }

  inverted.width  = inverted.right  - inverted.left;
  inverted.height = inverted.bottom - inverted.top ;

  for (const edge in inverted) {
    delta[edge] = inverted[edge] - previous[edge];
  }

  iEvent.edges = interaction.prepared.edges;
  iEvent.rect = inverted;
  iEvent.deltaRect = delta;
});

/**
 * ```js
 * interact(element).resizable({
 *   onstart: function (event) {},
 *   onmove : function (event) {},
 *   onend  : function (event) {},
 *
 *   edges: {
 *     top   : true,       // Use pointer coords to check for resize.
 *     left  : false,      // Disable resizing from left edge.
 *     bottom: '.resize-s',// Resize if pointer target matches selector
 *     right : handleEl    // Resize if pointer target is the given Element
 *   },
 *
 *     // Width and height can be adjusted independently. When `true`, width and
 *     // height are adjusted at a 1:1 ratio.
 *     square: false,
 *
 *     // Width and height can be adjusted independently. When `true`, width and
 *     // height maintain the aspect ratio they had when resizing started.
 *     preserveAspectRatio: false,
 *
 *   // a value of 'none' will limit the resize rect to a minimum of 0x0
 *   // 'negate' will allow the rect to have negative width/height
 *   // 'reposition' will keep the width/height positive by swapping
 *   // the top and bottom edges and/or swapping the left and right edges
 *   invert: 'none' || 'negate' || 'reposition'
 *
 *   // limit multiple resizes.
 *   // See the explanation in the {@link Interactable.draggable} example
 *   max: Infinity,
 *   maxPerElement: 1,
 * });
 *
 * var isResizeable = interact(element).resizable();
 * ```
 *
 * Gets or sets whether resize actions can be performed on the target
 *
 * @param {boolean | object} [options] true/false or An object with event
 * listeners to be fired on resize events (object makes the Interactable
 * resizable)
 * @return {boolean | Interactable} A boolean indicating if this can be the
 * target of resize elements, or this Interactable
 */
Interactable.prototype.resizable = function (options) {
  if (utils.is.object(options)) {
    this.options.resize.enabled = options.enabled === false? false: true;
    this.setPerAction('resize', options);
    this.setOnEvents('resize', options);

    if (/^x$|^y$|^xy$/.test(options.axis)) {
      this.options.resize.axis = options.axis;
    }
    else if (options.axis === null) {
      this.options.resize.axis = defaultOptions.resize.axis;
    }

    if (utils.is.bool(options.preserveAspectRatio)) {
      this.options.resize.preserveAspectRatio = options.preserveAspectRatio;
    }
    else if (utils.is.bool(options.square)) {
      this.options.resize.square = options.square;
    }

    return this;
  }
  if (utils.is.bool(options)) {
    this.options.resize.enabled = options;

    if (!options) {
      this.onresizestart = this.onresizestart = this.onresizeend = null;
    }

    return this;
  }
  return this.options.resize;
};

function checkResizeEdge (name, value, page, element, interactableElement, rect, margin) {
  // false, '', undefined, null
  if (!value) { return false; }

  // true value, use pointer coords and element rect
  if (value === true) {
    // if dimensions are negative, "switch" edges
    const width  = utils.is.number(rect.width )? rect.width  : rect.right  - rect.left;
    const height = utils.is.number(rect.height)? rect.height : rect.bottom - rect.top ;

    if (width < 0) {
      if      (name === 'left' ) { name = 'right'; }
      else if (name === 'right') { name = 'left' ; }
    }
    if (height < 0) {
      if      (name === 'top'   ) { name = 'bottom'; }
      else if (name === 'bottom') { name = 'top'   ; }
    }

    if (name === 'left'  ) { return page.x < ((width  >= 0? rect.left: rect.right ) + margin); }
    if (name === 'top'   ) { return page.y < ((height >= 0? rect.top : rect.bottom) + margin); }

    if (name === 'right' ) { return page.x > ((width  >= 0? rect.right : rect.left) - margin); }
    if (name === 'bottom') { return page.y > ((height >= 0? rect.bottom: rect.top ) - margin); }
  }

  // the remaining checks require an element
  if (!utils.is.element(element)) { return false; }

  return utils.is.element(value)
  // the value is an element to use as a resize handle
    ? value === element
    // otherwise check if element matches value as selector
    : utils.matchesUpTo(element, value, interactableElement);
}

Interaction.signals.on('new', function (interaction) {
  interaction.resizeAxes = 'xy';
});

InteractEvent.signals.on('set-delta', function ({ interaction, iEvent, action }) {
  if (action !== 'resize' || !interaction.resizeAxes) { return; }

  const options = interaction.target.options;

  if (options.resize.square) {
    if (interaction.resizeAxes === 'y') {
      iEvent.dx = iEvent.dy;
    }
    else {
      iEvent.dy = iEvent.dx;
    }
    iEvent.axes = 'xy';
  }
  else {
    iEvent.axes = interaction.resizeAxes;

    if (interaction.resizeAxes === 'x') {
      iEvent.dy = 0;
    }
    else if (interaction.resizeAxes === 'y') {
      iEvent.dx = 0;
    }
  }
});

actions.resize = resize;
actions.names.push('resize');
utils.merge(Interactable.eventTypes, [
  'resizestart',
  'resizemove',
  'resizeinertiastart',
  'resizeinertiaresume',
  'resizeend',
]);
actions.methodDict.resize = 'resizable';

defaultOptions.resize = resize.defaults;

module.exports = resize;

},{"../InteractEvent":4,"../Interactable":5,"../Interaction":6,"../defaultOptions":19,"../utils":45,"../utils/browser":37,"./base":7}],12:[function(require,module,exports){
const raf            = require('./utils/raf');
const getWindow      = require('./utils/window').getWindow;
const is             = require('./utils/is');
const domUtils       = require('./utils/domUtils');
const Interaction    = require('./Interaction');
const defaultOptions = require('./defaultOptions');

const autoScroll = {
  defaults: {
    enabled  : false,
    container: null,     // the item that is scrolled (Window or HTMLElement)
    margin   : 60,
    speed    : 300,      // the scroll speed in pixels per second
  },

  interaction: null,
  i: null,    // the handle returned by window.setInterval
  x: 0, y: 0, // Direction each pulse is to scroll in

  isScrolling: false,
  prevTime: 0,

  start: function (interaction) {
    autoScroll.isScrolling = true;
    raf.cancel(autoScroll.i);

    autoScroll.interaction = interaction;
    autoScroll.prevTime = new Date().getTime();
    autoScroll.i = raf.request(autoScroll.scroll);
  },

  stop: function () {
    autoScroll.isScrolling = false;
    raf.cancel(autoScroll.i);
  },

  // scroll the window by the values in scroll.x/y
  scroll: function () {
    const options = autoScroll.interaction.target.options[autoScroll.interaction.prepared.name].autoScroll;
    const container = options.container || getWindow(autoScroll.interaction.element);
    const now = new Date().getTime();
    // change in time in seconds
    const dt = (now - autoScroll.prevTime) / 1000;
    // displacement
    const s = options.speed * dt;

    if (s >= 1) {
      if (is.window(container)) {
        container.scrollBy(autoScroll.x * s, autoScroll.y * s);
      }
      else if (container) {
        container.scrollLeft += autoScroll.x * s;
        container.scrollTop  += autoScroll.y * s;
      }

      autoScroll.prevTime = now;
    }

    if (autoScroll.isScrolling) {
      raf.cancel(autoScroll.i);
      autoScroll.i = raf.request(autoScroll.scroll);
    }
  },
  check: function (interactable, actionName) {
    const options = interactable.options;

    return options[actionName].autoScroll && options[actionName].autoScroll.enabled;
  },
  onInteractionMove: function ({ interaction, pointer }) {
    if (!(interaction.interacting()
          && autoScroll.check(interaction.target, interaction.prepared.name))) {
      return;
    }

    if (interaction.simulation) {
      autoScroll.x = autoScroll.y = 0;
      return;
    }

    let top;
    let right;
    let bottom;
    let left;

    const options = interaction.target.options[interaction.prepared.name].autoScroll;
    const container = options.container || getWindow(interaction.element);

    if (is.window(container)) {
      left   = pointer.clientX < autoScroll.margin;
      top    = pointer.clientY < autoScroll.margin;
      right  = pointer.clientX > container.innerWidth  - autoScroll.margin;
      bottom = pointer.clientY > container.innerHeight - autoScroll.margin;
    }
    else {
      const rect = domUtils.getElementClientRect(container);

      left   = pointer.clientX < rect.left   + autoScroll.margin;
      top    = pointer.clientY < rect.top    + autoScroll.margin;
      right  = pointer.clientX > rect.right  - autoScroll.margin;
      bottom = pointer.clientY > rect.bottom - autoScroll.margin;
    }

    autoScroll.x = (right ? 1: left? -1: 0);
    autoScroll.y = (bottom? 1:  top? -1: 0);

    if (!autoScroll.isScrolling) {
      // set the autoScroll properties to those of the target
      autoScroll.margin = options.margin;
      autoScroll.speed  = options.speed;

      autoScroll.start(interaction);
    }
  },
};

Interaction.signals.on('stop-active', function () {
  autoScroll.stop();
});

Interaction.signals.on('action-move', autoScroll.onInteractionMove);

defaultOptions.perAction.autoScroll = autoScroll.defaults;

module.exports = autoScroll;

},{"./Interaction":6,"./defaultOptions":19,"./utils/domUtils":40,"./utils/is":47,"./utils/raf":51,"./utils/window":53}],13:[function(require,module,exports){
/** @lends Interactable */
const Interactable = require('../Interactable');
const actions      = require('../actions/base');
const is           = require('../utils/is');
const domUtils     = require('../utils/domUtils');

const { warnOnce } = require('../utils');

Interactable.prototype.getAction = function (pointer, event, interaction, element) {
  const action = this.defaultActionChecker(pointer, event, interaction, element);

  if (this.options.actionChecker) {
    return this.options.actionChecker(pointer, event, action, this, element, interaction);
  }

  return action;
};

/**
 * ```js
 * interact(element, { ignoreFrom: document.getElementById('no-action') });
 * // or
 * interact(element).ignoreFrom('input, textarea, a');
 * ```
 * @deprecated
 * If the target of the `mousedown`, `pointerdown` or `touchstart` event or any
 * of it's parents match the given CSS selector or Element, no
 * drag/resize/gesture is started.
 *
 * Don't use this method. Instead set the `ignoreFrom` option for each action
 * or for `pointerEvents`
 *
 * @example
 * interact(targett)
 *   .draggable({
 *     ignoreFrom: 'input, textarea, a[href]'',
 *   })
 *   .pointerEvents({
 *     ignoreFrom: '[no-pointer]',
 *   });
 *
 * @param {string | Element | null} [newValue] a CSS selector string, an
 * Element or `null` to not ignore any elements
 * @return {string | Element | object} The current ignoreFrom value or this
 * Interactable
 */
Interactable.prototype.ignoreFrom = warnOnce(function (newValue) {
  return this._backCompatOption('ignoreFrom', newValue);
}, 'Interactable.ignoreForm() has been deprecated. Use Interactble.draggable({ignoreFrom: newValue}).');

/**
 * ```js
 *
 * @deprecated
 * A drag/resize/gesture is started only If the target of the `mousedown`,
 * `pointerdown` or `touchstart` event or any of it's parents match the given
 * CSS selector or Element.
 *
 * Don't use this method. Instead set the `allowFrom` option for each action
 * or for `pointerEvents`
 *
 * @example
 * interact(targett)
 *   .resizable({
 *     allowFrom: '.resize-handle',
 *   .pointerEvents({
 *     allowFrom: '.handle',,
 *   });
 *
 * @param {string | Element | null} [newValue] a CSS selector string, an
 * Element or `null` to allow from any element
 * @return {string | Element | object} The current allowFrom value or this
 * Interactable
 */
Interactable.prototype.allowFrom = warnOnce(function (newValue) {
  return this._backCompatOption('allowFrom', newValue);
}, 'Interactable.allowForm() has been deprecated. Use Interactble.draggable({allowFrom: newValue}).');

Interactable.prototype.testIgnore = function (ignoreFrom, interactableElement, element) {
  if (!ignoreFrom || !is.element(element)) { return false; }

  if (is.string(ignoreFrom)) {
    return domUtils.matchesUpTo(element, ignoreFrom, interactableElement);
  }
  else if (is.element(ignoreFrom)) {
    return domUtils.nodeContains(ignoreFrom, element);
  }

  return false;
};

Interactable.prototype.testAllow = function (allowFrom, interactableElement, element) {
  if (!allowFrom) { return true; }

  if (!is.element(element)) { return false; }

  if (is.string(allowFrom)) {
    return domUtils.matchesUpTo(element, allowFrom, interactableElement);
  }
  else if (is.element(allowFrom)) {
    return domUtils.nodeContains(allowFrom, element);
  }

  return false;
};

Interactable.prototype.testIgnoreAllow = function (options, interactableElement, eventTarget) {
  return (!this.testIgnore(options.ignoreFrom, interactableElement, eventTarget)
    && this.testAllow(options.allowFrom, interactableElement, eventTarget));
};

/**
 * ```js
 * interact('.resize-drag')
 *   .resizable(true)
 *   .draggable(true)
 *   .actionChecker(function (pointer, event, action, interactable, element, interaction) {
 *
 *   if (interact.matchesSelector(event.target, '.drag-handle') {
 *     // force drag with handle target
 *     action.name = drag;
 *   }
 *   else {
 *     // resize from the top and right edges
 *     action.name  = 'resize';
 *     action.edges = { top: true, right: true };
 *   }
 *
 *   return action;
 * });
 * ```
 *
 * Gets or sets the function used to check action to be performed on
 * pointerDown
 *
 * @param {function | null} [checker] A function which takes a pointer event,
 * defaultAction string, interactable, element and interaction as parameters
 * and returns an object with name property 'drag' 'resize' or 'gesture' and
 * optionally an `edges` object with boolean 'top', 'left', 'bottom' and right
 * props.
 * @return {Function | Interactable} The checker function or this Interactable
 */
Interactable.prototype.actionChecker = function (checker) {
  if (is.function(checker)) {
    this.options.actionChecker = checker;

    return this;
  }

  if (checker === null) {
    delete this.options.actionChecker;

    return this;
  }

  return this.options.actionChecker;
};

/**
 * Returns or sets whether the the cursor should be changed depending on the
 * action that would be performed if the mouse were pressed and dragged.
 *
 * @param {boolean} [newValue]
 * @return {boolean | Interactable} The current setting or this Interactable
 */
Interactable.prototype.styleCursor = function (newValue) {
  if (is.bool(newValue)) {
    this.options.styleCursor = newValue;

    return this;
  }

  if (newValue === null) {
    delete this.options.styleCursor;

    return this;
  }

  return this.options.styleCursor;
};

Interactable.prototype.defaultActionChecker = function (pointer, event, interaction, element) {
  const rect = this.getRect(element);
  const buttons = event.buttons || ({
    0: 1,
    1: 4,
    3: 8,
    4: 16,
  })[event.button];
  let action = null;

  for (const actionName of actions.names) {
    // check mouseButton setting if the pointer is down
    if (interaction.pointerIsDown
        && /mouse|pointer/.test(interaction.pointerType)
        && (buttons & this.options[actionName].mouseButtons) === 0) {
      continue;
    }

    action = actions[actionName].checker(pointer, event, this, element, interaction, rect);

    if (action) {
      return action;
    }
  }
};


},{"../Interactable":5,"../actions/base":7,"../utils":45,"../utils/domUtils":40,"../utils/is":47}],14:[function(require,module,exports){
const interact       = require('../interact');
const Interactable   = require('../Interactable');
const Interaction    = require('../Interaction');
const actions        = require('../actions/base');
const defaultOptions = require('../defaultOptions');
const scope          = require('../scope');
const utils          = require('../utils');
const signals        = require('../utils/Signals').new();

require('./InteractableMethods');

const autoStart = {
  signals,
  withinInteractionLimit,
  // Allow this many interactions to happen simultaneously
  maxInteractions: Infinity,
  defaults: {
    perAction: {
      manualStart: false,
      max: Infinity,
      maxPerElement: 1,
      allowFrom:  null,
      ignoreFrom: null,

      // only allow left button by default
      // see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons#Return_value
      mouseButtons: 1,
    },
  },
  setActionDefaults: function (action) {
    utils.extend(action.defaults, autoStart.defaults.perAction);
  },
  validateAction,
};

// set cursor style on mousedown
Interaction.signals.on('down', function ({ interaction, pointer, event, eventTarget }) {
  if (interaction.interacting()) { return; }

  const actionInfo = getActionInfo(interaction, pointer, event, eventTarget);
  prepare(interaction, actionInfo);
});

// set cursor style on mousemove
Interaction.signals.on('move', function ({ interaction, pointer, event, eventTarget }) {
  if (interaction.pointerType !== 'mouse'
      || interaction.pointerIsDown
      || interaction.interacting()) { return; }

  const actionInfo = getActionInfo(interaction, pointer, event, eventTarget);
  prepare(interaction, actionInfo);
});

Interaction.signals.on('move', function (arg) {
  const { interaction, event } = arg;

  if (!interaction.pointerIsDown
      || interaction.interacting()
      || !interaction.pointerWasMoved
      || !interaction.prepared.name) {
    return;
  }

  signals.fire('before-start', arg);

  const target = interaction.target;

  if (interaction.prepared.name && target) {
    // check manualStart and interaction limit
    if (target.options[interaction.prepared.name].manualStart
        || !withinInteractionLimit(target, interaction.element, interaction.prepared)) {
      interaction.stop(event);
    }
    else {
      interaction.start(interaction.prepared, target, interaction.element);
    }
  }
});

// Check if the current target supports the action.
// If so, return the validated action. Otherwise, return null
function validateAction (action, interactable, element, eventTarget) {
  if (utils.is.object(action)
      && interactable.testIgnoreAllow(interactable.options[action.name], element, eventTarget)
      && interactable.options[action.name].enabled
      && withinInteractionLimit(interactable, element, action)) {
    return action;
  }

  return null;
}

function validateSelector (interaction, pointer, event, matches, matchElements, eventTarget) {
  for (let i = 0, len = matches.length; i < len; i++) {
    const match = matches[i];
    const matchElement = matchElements[i];
    const action = validateAction(match.getAction(pointer, event, interaction, matchElement),
                                  match,
                                  matchElement,
                                  eventTarget);

    if (action) {
      return {
        action,
        target: match,
        element: matchElement,
      };
    }
  }

  return {};
}

function getActionInfo (interaction, pointer, event, eventTarget) {
  let matches = [];
  let matchElements = [];

  let element = eventTarget;

  function pushMatches (interactable) {
    matches.push(interactable);
    matchElements.push(element);
  }

  while (utils.is.element(element)) {
    matches = [];
    matchElements = [];

    scope.interactables.forEachMatch(element, pushMatches);

    const actionInfo = validateSelector(interaction, pointer, event, matches, matchElements, eventTarget);

    if (actionInfo.action
      && !actionInfo.target.options[actionInfo.action.name].manualStart) {
      return actionInfo;
    }

    element = utils.parentNode(element);
  }

  return {};
}

function prepare (interaction, { action, target, element }) {
  action = action || {};

  if (interaction.target && interaction.target.options.styleCursor) {
    interaction.target._doc.documentElement.style.cursor = '';
  }

  interaction.target = target;
  interaction.element = element;
  utils.copyAction(interaction.prepared, action);

  if (target && target.options.styleCursor) {
    const cursor = action? actions[action.name].getCursor(action) : '';
    interaction.target._doc.documentElement.style.cursor = cursor;
  }

  signals.fire('prepared', { interaction: interaction });
}

Interaction.signals.on('stop', function ({ interaction }) {
  const target = interaction.target;

  if (target && target.options.styleCursor) {
    target._doc.documentElement.style.cursor = '';
  }
});

function withinInteractionLimit (interactable, element, action) {
  const options = interactable.options;
  const maxActions = options[action.name].max;
  const maxPerElement = options[action.name].maxPerElement;
  let activeInteractions = 0;
  let targetCount = 0;
  let targetElementCount = 0;

  // no actions if any of these values == 0
  if (!(maxActions && maxPerElement && autoStart.maxInteractions)) { return; }

  for (const interaction of scope.interactions) {
    const otherAction = interaction.prepared.name;

    if (!interaction.interacting()) { continue; }

    activeInteractions++;

    if (activeInteractions >= autoStart.maxInteractions) {
      return false;
    }

    if (interaction.target !== interactable) { continue; }

    targetCount += (otherAction === action.name)|0;

    if (targetCount >= maxActions) {
      return false;
    }

    if (interaction.element === element) {
      targetElementCount++;

      if (otherAction !== action.name || targetElementCount >= maxPerElement) {
        return false;
      }
    }
  }

  return autoStart.maxInteractions > 0;
}

/**
 * Returns or sets the maximum number of concurrent interactions allowed.  By
 * default only 1 interaction is allowed at a time (for backwards
 * compatibility). To allow multiple interactions on the same Interactables and
 * elements, you need to enable it in the draggable, resizable and gesturable
 * `'max'` and `'maxPerElement'` options.
 *
 * @alias module:interact.maxInteractions
 *
 * @param {number} [newValue] Any number. newValue <= 0 means no interactions.
 */
interact.maxInteractions = function (newValue) {
  if (utils.is.number(newValue)) {
    autoStart.maxInteractions = newValue;

    return interact;
  }

  return autoStart.maxInteractions;
};

Interactable.settingsMethods.push('styleCursor');
Interactable.settingsMethods.push('actionChecker');
Interactable.settingsMethods.push('ignoreFrom');
Interactable.settingsMethods.push('allowFrom');

defaultOptions.base.actionChecker = null;
defaultOptions.base.styleCursor = true;

utils.extend(defaultOptions.perAction, autoStart.defaults.perAction);

module.exports = autoStart;

},{"../Interactable":5,"../Interaction":6,"../actions/base":7,"../defaultOptions":19,"../interact":22,"../scope":34,"../utils":45,"../utils/Signals":35,"./InteractableMethods":13}],15:[function(require,module,exports){
const autoStart = require('./base');
const scope     = require('../scope');
const is        = require('../utils/is');

const { parentNode } = require('../utils/domUtils');

autoStart.setActionDefaults(require('../actions/drag'));

autoStart.signals.on('before-start',  function ({ interaction, eventTarget, dx, dy }) {
  if (interaction.prepared.name !== 'drag') { return; }

  // check if a drag is in the correct axis
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const targetOptions = interaction.target.options.drag;
  const startAxis = targetOptions.startAxis;
  const currentAxis = (absX > absY ? 'x' : absX < absY ? 'y' : 'xy');

  interaction.prepared.axis = targetOptions.lockAxis === 'start'
    ? currentAxis[0] // always lock to one axis even if currentAxis === 'xy'
    : targetOptions.lockAxis;

  // if the movement isn't in the startAxis of the interactable
  if (currentAxis !== 'xy' && startAxis !== 'xy' && startAxis !== currentAxis) {
    // cancel the prepared action
    interaction.prepared.name = null;

    // then try to get a drag from another ineractable
    let element = eventTarget;

    const getDraggable = function (interactable) {
      if (interactable === interaction.target) { return; }

      const options = interaction.target.options.drag;

      if (!options.manualStart
          && interactable.testIgnoreAllow(options, element, eventTarget)) {

        const action = interactable.getAction(
          interaction.downPointer, interaction.downEvent, interaction, element);

        if (action
            && action.name === 'drag'
            && checkStartAxis(currentAxis, interactable)
            && autoStart.validateAction(action, interactable, element, eventTarget)) {

          return interactable;
        }
      }
    };

    // check all interactables
    while (is.element(element)) {
      const interactable = scope.interactables.forEachMatch(element, getDraggable);

      if (interactable) {
        interaction.prepared.name = 'drag';
        interaction.target = interactable;
        interaction.element = element;
        break;
      }

      element = parentNode(element);
    }
  }
});

function checkStartAxis (startAxis, interactable) {
  if (!interactable) { return false; }

  const thisAxis = interactable.options.drag.startAxis;

  return (startAxis === 'xy' || thisAxis === 'xy' || thisAxis === startAxis);
}

},{"../actions/drag":8,"../scope":34,"../utils/domUtils":40,"../utils/is":47,"./base":14}],16:[function(require,module,exports){
require('./base').setActionDefaults(require('../actions/gesture'));

},{"../actions/gesture":10,"./base":14}],17:[function(require,module,exports){
const autoStart   = require('./base');
const Interaction = require('../Interaction');

autoStart.defaults.perAction.hold = 0;
autoStart.defaults.perAction.delay = 0;

Interaction.signals.on('new', function (interaction) {
  interaction.autoStartHoldTimer = null;
});

autoStart.signals.on('prepared', function ({ interaction }) {
  const hold = getHoldDuration(interaction);

  if (hold > 0) {
    interaction.autoStartHoldTimer = setTimeout(() => {
      interaction.start(interaction.prepared, interaction.target, interaction.element);
    }, hold);
  }
});

Interaction.signals.on('move', function ({ interaction, duplicate }) {
  if (interaction.pointerWasMoved && !duplicate) {
    clearTimeout(interaction.autoStartHoldTimer);
  }
});

// prevent regular down->move autoStart
autoStart.signals.on('before-start', function ({ interaction }) {
  const hold = getHoldDuration(interaction);

  if (hold > 0) {
    interaction.prepared.name = null;
  }
});

function getHoldDuration (interaction) {
  const actionName = interaction.prepared && interaction.prepared.name;

  if (!actionName) { return null; }

  const options = interaction.target.options;

  return options[actionName].hold || options[actionName].delay;
}

module.exports = {
  getHoldDuration,
};

},{"../Interaction":6,"./base":14}],18:[function(require,module,exports){
require('./base').setActionDefaults(require('../actions/resize'));

},{"../actions/resize":11,"./base":14}],19:[function(require,module,exports){
module.exports = {
  base: {
    accept        : null,
    preventDefault: 'auto',
    deltaSource   : 'page',
  },

  perAction: {
    origin: { x: 0, y: 0 },

    inertia: {
      enabled          : false,
      resistance       : 10,    // the lambda in exponential decay
      minSpeed         : 100,   // target speed must be above this for inertia to start
      endSpeed         : 10,    // the speed at which inertia is slow enough to stop
      allowResume      : true,  // allow resuming an action in inertia phase
      smoothEndDuration: 300,   // animate to snap/restrict endOnly if there's no inertia
    },
  },
};

},{}],20:[function(require,module,exports){
/* browser entry point */

// inertia
require('./inertia');

// modifiers
require('./modifiers/snap');
require('./modifiers/restrict');

// pointerEvents
require('./pointerEvents/base');
require('./pointerEvents/holdRepeat');
require('./pointerEvents/interactableTargets');

// autoStart hold
require('./autoStart/hold');

// actions
require('./actions/gesture');
require('./actions/resize');
require('./actions/drag');
require('./actions/drop');

// load these modifiers after resize is loaded
require('./modifiers/snapSize');
require('./modifiers/restrictEdges');
require('./modifiers/restrictSize');

// autoStart actions
require('./autoStart/gesture');
require('./autoStart/resize');
require('./autoStart/drag');

// Interactable preventDefault setting
require('./interactablePreventDefault.js');

// autoScroll
require('./autoScroll');

// export interact
module.exports = require('./interact');

},{"./actions/drag":8,"./actions/drop":9,"./actions/gesture":10,"./actions/resize":11,"./autoScroll":12,"./autoStart/drag":15,"./autoStart/gesture":16,"./autoStart/hold":17,"./autoStart/resize":18,"./inertia":21,"./interact":22,"./interactablePreventDefault.js":23,"./modifiers/restrict":25,"./modifiers/restrictEdges":26,"./modifiers/restrictSize":27,"./modifiers/snap":28,"./modifiers/snapSize":29,"./pointerEvents/base":31,"./pointerEvents/holdRepeat":32,"./pointerEvents/interactableTargets":33}],21:[function(require,module,exports){
const InteractEvent  = require('./InteractEvent');
const Interaction    = require('./Interaction');
const modifiers      = require('./modifiers/base');
const utils          = require('./utils');
const animationFrame = require('./utils/raf');

Interaction.signals.on('new', function (interaction) {
  interaction.inertiaStatus = {
    active     : false,
    smoothEnd  : false,
    allowResume: false,

    startEvent: null,
    upCoords  : {},

    xe: 0, ye: 0,
    sx: 0, sy: 0,

    t0: 0,
    vx0: 0, vys: 0,
    duration: 0,

    lambda_v0: 0,
    one_ve_v0: 0,
    i  : null,
  };

  interaction.boundInertiaFrame   = () => inertiaFrame  .apply(interaction);
  interaction.boundSmoothEndFrame = () => smoothEndFrame.apply(interaction);
});

Interaction.signals.on('down', function ({ interaction, event, pointer, eventTarget }) {
  const status = interaction.inertiaStatus;

  // Check if the down event hits the current inertia target
  if (status.active) {
    let element = eventTarget;

    // climb up the DOM tree from the event target
    while (utils.is.element(element)) {

      // if interaction element is the current inertia target element
      if (element === interaction.element) {
        // stop inertia
        animationFrame.cancel(status.i);
        status.active = false;
        interaction.simulation = null;

        // update pointers to the down event's coordinates
        interaction.updatePointer(pointer);
        utils.setCoords(interaction.curCoords, interaction.pointers);

        // fire appropriate signals
        const signalArg = { interaction };
        Interaction.signals.fire('before-action-move', signalArg);
        Interaction.signals.fire('action-resume'     , signalArg);

        // fire a reume event
        const resumeEvent = new InteractEvent(interaction,
                                              event,
                                              interaction.prepared.name,
                                              'inertiaresume',
                                              interaction.element);

        interaction.target.fire(resumeEvent);
        interaction.prevEvent = resumeEvent;
        modifiers.resetStatuses(interaction.modifierStatuses);

        utils.copyCoords(interaction.prevCoords, interaction.curCoords);
        break;
      }

      element = utils.parentNode(element);
    }
  }
});

Interaction.signals.on('up', function ({ interaction, event }) {
  const status = interaction.inertiaStatus;

  if (!interaction.interacting() || status.active) { return; }

  const target = interaction.target;
  const options = target && target.options;
  const inertiaOptions = options && interaction.prepared.name && options[interaction.prepared.name].inertia;

  const now = new Date().getTime();
  const statuses = {};
  const page = utils.extend({}, interaction.curCoords.page);
  const pointerSpeed = interaction.pointerDelta.client.speed;

  let smoothEnd = false;
  let modifierResult;

  // check if inertia should be started
  const inertiaPossible = (inertiaOptions && inertiaOptions.enabled
                     && interaction.prepared.name !== 'gesture'
                     && event !== status.startEvent);

  const inertia = (inertiaPossible
    && (now - interaction.curCoords.timeStamp) < 50
    && pointerSpeed > inertiaOptions.minSpeed
    && pointerSpeed > inertiaOptions.endSpeed);

  const modifierArg = {
    interaction,
    pageCoords: page,
    statuses,
    preEnd: true,
    requireEndOnly: true,
  };

  // smoothEnd
  if (inertiaPossible && !inertia) {
    modifiers.resetStatuses(statuses);

    modifierResult = modifiers.setAll(modifierArg);

    if (modifierResult.shouldMove && modifierResult.locked) {
      smoothEnd = true;
    }
  }

  if (!(inertia || smoothEnd)) { return; }

  utils.copyCoords(status.upCoords, interaction.curCoords);

  interaction.pointers[0] = status.startEvent =
    new InteractEvent(interaction, event, interaction.prepared.name, 'inertiastart', interaction.element);

  status.t0 = now;

  status.active = true;
  status.allowResume = inertiaOptions.allowResume;
  interaction.simulation = status;

  target.fire(status.startEvent);

  if (inertia) {
    status.vx0 = interaction.pointerDelta.client.vx;
    status.vy0 = interaction.pointerDelta.client.vy;
    status.v0 = pointerSpeed;

    calcInertia(interaction, status);

    utils.extend(page, interaction.curCoords.page);

    page.x += status.xe;
    page.y += status.ye;

    modifiers.resetStatuses(statuses);

    modifierResult = modifiers.setAll(modifierArg);

    status.modifiedXe += modifierResult.dx;
    status.modifiedYe += modifierResult.dy;

    status.i = animationFrame.request(interaction.boundInertiaFrame);
  }
  else {
    status.smoothEnd = true;
    status.xe = modifierResult.dx;
    status.ye = modifierResult.dy;

    status.sx = status.sy = 0;

    status.i = animationFrame.request(interaction.boundSmoothEndFrame);
  }
});

Interaction.signals.on('stop-active', function ({ interaction }) {
  const status = interaction.inertiaStatus;

  if (status.active) {
    animationFrame.cancel(status.i);
    status.active = false;
    interaction.simulation = null;
  }
});

function calcInertia (interaction, status) {
  const inertiaOptions = interaction.target.options[interaction.prepared.name].inertia;
  const lambda = inertiaOptions.resistance;
  const inertiaDur = -Math.log(inertiaOptions.endSpeed / status.v0) / lambda;

  status.x0 = interaction.prevEvent.pageX;
  status.y0 = interaction.prevEvent.pageY;
  status.t0 = status.startEvent.timeStamp / 1000;
  status.sx = status.sy = 0;

  status.modifiedXe = status.xe = (status.vx0 - inertiaDur) / lambda;
  status.modifiedYe = status.ye = (status.vy0 - inertiaDur) / lambda;
  status.te = inertiaDur;

  status.lambda_v0 = lambda / status.v0;
  status.one_ve_v0 = 1 - inertiaOptions.endSpeed / status.v0;
}

function inertiaFrame () {
  updateInertiaCoords(this);
  utils.setCoordDeltas(this.pointerDelta, this.prevCoords, this.curCoords);

  const status = this.inertiaStatus;
  const options = this.target.options[this.prepared.name].inertia;
  const lambda = options.resistance;
  const t = new Date().getTime() / 1000 - status.t0;

  if (t < status.te) {

    const progress =  1 - (Math.exp(-lambda * t) - status.lambda_v0) / status.one_ve_v0;

    if (status.modifiedXe === status.xe && status.modifiedYe === status.ye) {
      status.sx = status.xe * progress;
      status.sy = status.ye * progress;
    }
    else {
      const quadPoint = utils.getQuadraticCurvePoint(0, 0,
                                                     status.xe,
                                                     status.ye,
                                                     status.modifiedXe,
                                                     status.modifiedYe,
                                                     progress);

      status.sx = quadPoint.x;
      status.sy = quadPoint.y;
    }

    this.doMove();

    status.i = animationFrame.request(this.boundInertiaFrame);
  }
  else {
    status.sx = status.modifiedXe;
    status.sy = status.modifiedYe;

    this.doMove();
    this.end(status.startEvent);
    status.active = false;
    this.simulation = null;
  }

  utils.copyCoords(this.prevCoords, this.curCoords);
}

function smoothEndFrame () {
  updateInertiaCoords(this);

  const status = this.inertiaStatus;
  const t = new Date().getTime() - status.t0;
  const duration = this.target.options[this.prepared.name].inertia.smoothEndDuration;

  if (t < duration) {
    status.sx = utils.easeOutQuad(t, 0, status.xe, duration);
    status.sy = utils.easeOutQuad(t, 0, status.ye, duration);

    this.pointerMove(status.startEvent, status.startEvent);

    status.i = animationFrame.request(this.boundSmoothEndFrame);
  }
  else {
    status.sx = status.xe;
    status.sy = status.ye;

    this.pointerMove(status.startEvent, status.startEvent);
    this.end(status.startEvent);

    status.smoothEnd =
      status.active = false;
    this.simulation = null;
  }
}

function updateInertiaCoords (interaction) {
  const status = interaction.inertiaStatus;

  // return if inertia isn't running
  if (!status.active) { return; }

  const pageUp   = status.upCoords.page;
  const clientUp = status.upCoords.client;

  utils.setCoords(interaction.curCoords, [ {
    pageX  : pageUp.x   + status.sx,
    pageY  : pageUp.y   + status.sy,
    clientX: clientUp.x + status.sx,
    clientY: clientUp.y + status.sy,
  } ]);
}

},{"./InteractEvent":4,"./Interaction":6,"./modifiers/base":24,"./utils":45,"./utils/raf":51}],22:[function(require,module,exports){
/** @module interact */

const browser      = require('./utils/browser');
const events       = require('./utils/events');
const utils        = require('./utils');
const scope        = require('./scope');
const Interactable = require('./Interactable');
const Interaction  = require('./Interaction');

const globalEvents = {};

/**
 * ```js
 * interact('#draggable').draggable(true);
 *
 * var rectables = interact('rect');
 * rectables
 *   .gesturable(true)
 *   .on('gesturemove', function (event) {
 *       // ...
 *   });
 * ```
 *
 * The methods of this variable can be used to set elements as interactables
 * and also to change various default settings.
 *
 * Calling it as a function and passing an element or a valid CSS selector
 * string returns an Interactable object which has various methods to configure
 * it.
 *
 * @global
 *
 * @param {Element | string} element The HTML or SVG Element to interact with
 * or CSS selector
 * @return {Interactable}
 */
function interact (element, options) {
  let interactable = scope.interactables.get(element, options);

  if (!interactable) {
    interactable = new Interactable(element, options);
    interactable.events.global = globalEvents;
  }

  return interactable;
}

/**
 * Check if an element or selector has been set with the {@link interact}
 * function
 *
 * @alias module:interact.isSet
 *
 * @param {Element} element The Element being searched for
 * @return {boolean} Indicates if the element or CSS selector was previously
 * passed to interact
*/
interact.isSet = function (element, options) {
  return scope.interactables.indexOfElement(element, options && options.context) !== -1;
};

/**
 * Add a global listener for an InteractEvent or adds a DOM event to `document`
 *
 * @alias module:interact.on
 *
 * @param {string | array | object} type The types of events to listen for
 * @param {function} listener The function event (s)
 * @param {object | boolean} [options] object or useCapture flag for
 * addEventListener
 * @return {object} interact
 */
interact.on = function (type, listener, options) {
  if (utils.is.string(type) && type.search(' ') !== -1) {
    type = type.trim().split(/ +/);
  }

  if (utils.is.array(type)) {
    for (const eventType of type) {
      interact.on(eventType, listener, options);
    }

    return interact;
  }

  if (utils.is.object(type)) {
    for (const prop in type) {
      interact.on(prop, type[prop], listener);
    }

    return interact;
  }

  // if it is an InteractEvent type, add listener to globalEvents
  if (utils.contains(Interactable.eventTypes, type)) {
    // if this type of event was never bound
    if (!globalEvents[type]) {
      globalEvents[type] = [listener];
    }
    else {
      globalEvents[type].push(listener);
    }
  }
  // If non InteractEvent type, addEventListener to document
  else {
    events.add(scope.document, type, listener, { options });
  }

  return interact;
};

/**
 * Removes a global InteractEvent listener or DOM event from `document`
 *
 * @alias module:interact.off
 *
 * @param {string | array | object} type The types of events that were listened
 * for
 * @param {function} listener The listener function to be removed
 * @param {object | boolean} options [options] object or useCapture flag for
 * removeEventListener
 * @return {object} interact
 */
interact.off = function (type, listener, options) {
  if (utils.is.string(type) && type.search(' ') !== -1) {
    type = type.trim().split(/ +/);
  }

  if (utils.is.array(type)) {
    for (const eventType of type) {
      interact.off(eventType, listener, options);
    }

    return interact;
  }

  if (utils.is.object(type)) {
    for (const prop in type) {
      interact.off(prop, type[prop], listener);
    }

    return interact;
  }

  if (!utils.contains(Interactable.eventTypes, type)) {
    events.remove(scope.document, type, listener, options);
  }
  else {
    let index;

    if (type in globalEvents
        && (index = globalEvents[type].indexOf(listener)) !== -1) {
      globalEvents[type].splice(index, 1);
    }
  }

  return interact;
};

/**
 * Returns an object which exposes internal data

 * @alias module:interact.debug
 *
 * @return {object} An object with properties that outline the current state
 * and expose internal functions and variables
 */
interact.debug = function () {
  return scope;
};

// expose the functions used to calculate multi-touch properties
interact.getPointerAverage  = utils.pointerAverage;
interact.getTouchBBox       = utils.touchBBox;
interact.getTouchDistance   = utils.touchDistance;
interact.getTouchAngle      = utils.touchAngle;

interact.getElementRect       = utils.getElementRect;
interact.getElementClientRect = utils.getElementClientRect;
interact.matchesSelector      = utils.matchesSelector;
interact.closest              = utils.closest;

/**
 * @alias module:interact.supportsTouch
 *
 * @return {boolean} Whether or not the browser supports touch input
 */
interact.supportsTouch = function () {
  return browser.supportsTouch;
};

/**
 * @alias module:interact.supportsPointerEvent
 *
 * @return {boolean} Whether or not the browser supports PointerEvents
 */
interact.supportsPointerEvent = function () {
  return browser.supportsPointerEvent;
};

/**
 * Cancels all interactions (end events are not fired)
 *
 * @alias module:interact.stop
 *
 * @param {Event} event An event on which to call preventDefault()
 * @return {object} interact
 */
interact.stop = function (event) {
  for (let i = scope.interactions.length - 1; i >= 0; i--) {
    scope.interactions[i].stop(event);
  }

  return interact;
};

/**
 * Returns or sets the distance the pointer must be moved before an action
 * sequence occurs. This also affects tolerance for tap events.
 *
 * @alias module:interact.pointerMoveTolerance
 *
 * @param {number} [newValue] The movement from the start position must be greater than this value
 * @return {interact | number}
 */
interact.pointerMoveTolerance = function (newValue) {
  if (utils.is.number(newValue)) {
    Interaction.pointerMoveTolerance = newValue;

    return interact;
  }

  return Interaction.pointerMoveTolerance;
};

interact.addDocument    = scope.addDocument;
interact.removeDocument = scope.removeDocument;

scope.interact = interact;

module.exports = interact;

},{"./Interactable":5,"./Interaction":6,"./scope":34,"./utils":45,"./utils/browser":37,"./utils/events":41}],23:[function(require,module,exports){
const Interactable = require('./Interactable');
const Interaction  = require('./Interaction');
const scope        = require('./scope');
const is           = require('./utils/is');
const events       = require('./utils/events');
const browser      = require('./utils/browser');

const { nodeContains, matchesSelector } = require('./utils/domUtils');

/**
 * Returns or sets whether to prevent the browser's default behaviour in
 * response to pointer events. Can be set to:
 *  - `'always'` to always prevent
 *  - `'never'` to never prevent
 *  - `'auto'` to let interact.js try to determine what would be best
 *
 * @param {string} [newValue] `true`, `false` or `'auto'`
 * @return {string | Interactable} The current setting or this Interactable
 */
Interactable.prototype.preventDefault = function (newValue) {
  if (/^(always|never|auto)$/.test(newValue)) {
    this.options.preventDefault = newValue;
    return this;
  }

  if (is.bool(newValue)) {
    this.options.preventDefault = newValue? 'always' : 'never';
    return this;
  }

  return this.options.preventDefault;
};

Interactable.prototype.checkAndPreventDefault = function (event) {
  const setting = this.options.preventDefault;

  if (setting === 'never') { return; }

  if (setting === 'always') {
    event.preventDefault();
    return;
  }

  // setting === 'auto'

  // don't preventDefault of touch{start,move} events if the browser supports passive
  // events listeners. CSS touch-action and user-selecct should be used instead
  if (events.supportsPassive
    && /^touch(start|move)$/.test(event.type)
    && !browser.isIOS) {
    return;
  }

  // don't preventDefault of pointerdown events
  if (/^(mouse|pointer|touch)*(down|start)/i.test(event.type)) {
    return;
  }

  // don't preventDefault on editable elements
  if (is.element(event.target)
      && matchesSelector(event.target, 'input,select,textarea,[contenteditable=true],[contenteditable=true] *')) {
    return;
  }

  event.preventDefault();
};

function onInteractionEvent ({ interaction, event }) {
  if (interaction.target) {
    interaction.target.checkAndPreventDefault(event);
  }
}

for (const eventSignal of ['down', 'move', 'up', 'cancel']) {
  Interaction.signals.on(eventSignal, onInteractionEvent);
}

// prevent native HTML5 drag on interact.js target elements
Interaction.docEvents.dragstart = function preventNativeDrag (event) {
  for (const interaction of scope.interactions) {

    if (interaction.element
        && (interaction.element === event.target
            || nodeContains(interaction.element, event.target))) {

      interaction.target.checkAndPreventDefault(event);
      return;
    }
  }
};

},{"./Interactable":5,"./Interaction":6,"./scope":34,"./utils/browser":37,"./utils/domUtils":40,"./utils/events":41,"./utils/is":47}],24:[function(require,module,exports){
const InteractEvent = require('../InteractEvent');
const Interaction   = require('../Interaction');
const extend        = require('../utils/extend');

const modifiers = {
  names: [],

  setOffsets: function (arg) {
    const { interaction, pageCoords: page } = arg;
    const { target, element, startOffset } = interaction;
    const rect = target.getRect(element);

    if (rect) {
      startOffset.left = page.x - rect.left;
      startOffset.top  = page.y - rect.top;

      startOffset.right  = rect.right  - page.x;
      startOffset.bottom = rect.bottom - page.y;

      if (!('width'  in rect)) { rect.width  = rect.right  - rect.left; }
      if (!('height' in rect)) { rect.height = rect.bottom - rect.top ; }
    }
    else {
      startOffset.left = startOffset.top = startOffset.right = startOffset.bottom = 0;
    }

    arg.rect = rect;
    arg.interactable = target;
    arg.element = element;

    for (const modifierName of modifiers.names) {
      arg.options = target.options[interaction.prepared.name][modifierName];

      if (!arg.options) {
        continue;
      }

      interaction.modifierOffsets[modifierName] = modifiers[modifierName].setOffset(arg);
    }
  },

  setAll: function (arg) {
    const { interaction, statuses, preEnd, requireEndOnly } = arg;
    const result = {
      dx: 0,
      dy: 0,
      changed: false,
      locked: false,
      shouldMove: true,
    };

    arg.modifiedCoords = extend({}, arg.pageCoords);

    for (const modifierName of modifiers.names) {
      const modifier = modifiers[modifierName];
      const options = interaction.target.options[interaction.prepared.name][modifierName];

      if (!shouldDo(options, preEnd, requireEndOnly)) { continue; }

      arg.status = arg.status = statuses[modifierName];
      arg.options = options;
      arg.offset = arg.interaction.modifierOffsets[modifierName];

      modifier.set(arg);

      if (arg.status.locked) {
        arg.modifiedCoords.x += arg.status.dx;
        arg.modifiedCoords.y += arg.status.dy;

        result.dx += arg.status.dx;
        result.dy += arg.status.dy;

        result.locked = true;
      }
    }

    // a move should be fired if:
    //  - there are no modifiers enabled,
    //  - no modifiers are "locked" i.e. have changed the pointer's coordinates, or
    //  - the locked coords have changed since the last pointer move
    result.shouldMove = !arg.status || !result.locked || arg.status.changed;

    return result;
  },

  resetStatuses: function (statuses) {
    for (const modifierName of modifiers.names) {
      const status = statuses[modifierName] || {};

      status.dx = status.dy = 0;
      status.modifiedX = status.modifiedY = NaN;
      status.locked = false;
      status.changed = true;

      statuses[modifierName] = status;
    }

    return statuses;
  },

  start: function ({ interaction }, signalName) {
    const arg = {
      interaction,
      pageCoords: (signalName === 'action-resume' ?
                   interaction.curCoords : interaction.startCoords).page,
      startOffset: interaction.startOffset,
      statuses: interaction.modifierStatuses,
      preEnd: false,
      requireEndOnly: false,
    };

    modifiers.setOffsets(arg);
    modifiers.resetStatuses(arg.statuses);

    arg.pageCoords = extend({}, interaction.startCoords.page);
    interaction.modifierResult = modifiers.setAll(arg);
  },

  beforeMove: function ({ interaction, preEnd, interactingBeforeMove }) {
    const modifierResult = modifiers.setAll({
      interaction,
      preEnd,
      pageCoords: interaction.curCoords.page,
      statuses: interaction.modifierStatuses,
      requireEndOnly: false,
    });

    // don't fire an action move if a modifier would keep the event in the same
    // cordinates as before
    if (!modifierResult.shouldMove && interactingBeforeMove) {
      interaction._dontFireMove = true;
    }

    interaction.modifierResult = modifierResult;
  },

  end: function ({ interaction, event }) {
    for (const modifierName of modifiers.names) {
      const options = interaction.target.options[interaction.prepared.name][modifierName];

      // if the endOnly option is true for any modifier
      if (shouldDo(options, true, true)) {
        // fire a move event at the modified coordinates
        interaction.doMove({ event, preEnd: true });
        break;
      }
    }
  },

  setXY: function (arg) {
    const { iEvent, interaction } = arg;
    const modifierArg = extend({}, arg);

    for (let i = 0; i < modifiers.names.length; i++) {
      const modifierName = modifiers.names[i];
      modifierArg.options = interaction.target.options[interaction.prepared.name][modifierName];

      if (!modifierArg.options) {
        continue;
      }

      const modifier = modifiers[modifierName];

      modifierArg.status = interaction.modifierStatuses[modifierName];

      iEvent[modifierName] = modifier.modifyCoords(modifierArg);
    }
  },
};

Interaction.signals.on('new', function (interaction) {
  interaction.startOffset      = { left: 0, right: 0, top: 0, bottom: 0 };
  interaction.modifierOffsets  = {};
  interaction.modifierStatuses = modifiers.resetStatuses({});
  interaction.modifierResult   = null;
});

Interaction.signals.on('action-start' , modifiers.start);
Interaction.signals.on('action-resume', modifiers.start);
Interaction.signals.on('before-action-move', modifiers.beforeMove);
Interaction.signals.on('action-end', modifiers.end);

InteractEvent.signals.on('set-xy', modifiers.setXY);

function shouldDo (options, preEnd, requireEndOnly) {
  return (options && options.enabled
          && (preEnd || !options.endOnly)
          && (!requireEndOnly || options.endOnly));
}

module.exports = modifiers;

},{"../InteractEvent":4,"../Interaction":6,"../utils/extend":42}],25:[function(require,module,exports){
const modifiers      = require('./base');
const utils          = require('../utils');
const defaultOptions = require('../defaultOptions');

const restrict = {
  defaults: {
    enabled    : false,
    endOnly    : false,
    restriction: null,
    elementRect: null,
  },

  setOffset: function ({ rect, startOffset, options }) {
    const elementRect = options && options.elementRect;
    const offset = {};

    if (rect && elementRect) {
      offset.left = startOffset.left - (rect.width  * elementRect.left);
      offset.top  = startOffset.top  - (rect.height * elementRect.top);

      offset.right  = startOffset.right  - (rect.width  * (1 - elementRect.right));
      offset.bottom = startOffset.bottom - (rect.height * (1 - elementRect.bottom));
    }
    else {
      offset.left = offset.top = offset.right = offset.bottom = 0;
    }

    return offset;
  },

  set: function ({ modifiedCoords, interaction, status, options }) {
    if (!options) { return status; }

    const page = status.useStatusXY
      ? { x: status.x, y: status.y }
      : utils.extend({}, modifiedCoords);

    const restriction = getRestrictionRect(options.restriction, interaction, page);

    if (!restriction) { return status; }

    status.dx = 0;
    status.dy = 0;
    status.locked = false;

    const rect = restriction;
    let modifiedX = page.x;
    let modifiedY = page.y;

    const offset = interaction.modifierOffsets.restrict;

    // object is assumed to have
    // x, y, width, height or
    // left, top, right, bottom
    if ('x' in restriction && 'y' in restriction) {
      modifiedX = Math.max(Math.min(rect.x + rect.width  - offset.right , page.x), rect.x + offset.left);
      modifiedY = Math.max(Math.min(rect.y + rect.height - offset.bottom, page.y), rect.y + offset.top );
    }
    else {
      modifiedX = Math.max(Math.min(rect.right  - offset.right , page.x), rect.left + offset.left);
      modifiedY = Math.max(Math.min(rect.bottom - offset.bottom, page.y), rect.top  + offset.top );
    }

    status.dx = modifiedX - page.x;
    status.dy = modifiedY - page.y;

    status.changed = status.modifiedX !== modifiedX || status.modifiedY !== modifiedY;
    status.locked = !!(status.dx || status.dy);

    status.modifiedX = modifiedX;
    status.modifiedY = modifiedY;
  },

  modifyCoords: function ({ page, client, status, phase, options }) {
    const elementRect = options && options.elementRect;

    if (options && options.enabled
        && !(phase === 'start' && elementRect && status.locked)) {

      if (status.locked) {
        page.x += status.dx;
        page.y += status.dy;
        client.x += status.dx;
        client.y += status.dy;

        return {
          dx: status.dx,
          dy: status.dy,
        };
      }
    }
  },

  getRestrictionRect,
};

function getRestrictionRect (value, interaction, page) {
  if (utils.is.function(value)) {
    return utils.resolveRectLike(value, interaction.target, interaction.element, [page.x, page.y, interaction]);
  } else {
    return utils.resolveRectLike(value, interaction.target, interaction.element);
  }
}

modifiers.restrict = restrict;
modifiers.names.push('restrict');

defaultOptions.perAction.restrict = restrict.defaults;

module.exports = restrict;

},{"../defaultOptions":19,"../utils":45,"./base":24}],26:[function(require,module,exports){
// This module adds the options.resize.restrictEdges setting which sets min and
// max for the top, left, bottom and right edges of the target being resized.
//
// interact(target).resize({
//   edges: { top: true, left: true },
//   restrictEdges: {
//     inner: { top: 200, left: 200, right: 400, bottom: 400 },
//     outer: { top:   0, left:   0, right: 600, bottom: 600 },
//   },
// });

const modifiers      = require('./base');
const utils          = require('../utils');
const rectUtils      = require('../utils/rect');
const defaultOptions = require('../defaultOptions');
const resize         = require('../actions/resize');

const { getRestrictionRect } = require('./restrict');

const noInner = { top: +Infinity, left: +Infinity, bottom: -Infinity, right: -Infinity };
const noOuter = { top: -Infinity, left: -Infinity, bottom: +Infinity, right: +Infinity };

const restrictEdges = {
  defaults: {
    enabled: false,
    endOnly: false,
    min: null,
    max: null,
    offset: null,
  },

  setOffset: function ({ interaction, startOffset, options }) {
    if (!options) {
      return utils.extend({}, startOffset);
    }

    const offset = getRestrictionRect(options.offset, interaction, interaction.startCoords.page);

    if (offset) {
      return {
        top:    startOffset.top    + offset.y,
        left:   startOffset.left   + offset.x,
        bottom: startOffset.bottom + offset.y,
        right:  startOffset.right  + offset.x,
      };
    }

    return startOffset;
  },

  set: function ({ modifiedCoords, interaction, status, offset, options }) {
    const edges = interaction.prepared.linkedEdges || interaction.prepared.edges;

    if (!interaction.interacting() || !edges) {
      return;
    }

    const page = status.useStatusXY
      ? { x: status.x, y: status.y }
      : utils.extend({}, modifiedCoords);
    const inner = rectUtils.xywhToTlbr(getRestrictionRect(options.inner, interaction, page)) || noInner;
    const outer = rectUtils.xywhToTlbr(getRestrictionRect(options.outer, interaction, page)) || noOuter;

    let modifiedX = page.x;
    let modifiedY = page.y;

    status.dx = 0;
    status.dy = 0;
    status.locked = false;

    if (edges.top) {
      modifiedY = Math.min(Math.max(outer.top    + offset.top,    page.y), inner.top    + offset.top);
    }
    else if (edges.bottom) {
      modifiedY = Math.max(Math.min(outer.bottom - offset.bottom, page.y), inner.bottom - offset.bottom);
    }
    if (edges.left) {
      modifiedX = Math.min(Math.max(outer.left   + offset.left,   page.x), inner.left   + offset.left);
    }
    else if (edges.right) {
      modifiedX = Math.max(Math.min(outer.right  - offset.right,  page.x), inner.right  - offset.right);
    }

    status.dx = modifiedX - page.x;
    status.dy = modifiedY - page.y;

    status.changed = status.modifiedX !== modifiedX || status.modifiedY !== modifiedY;
    status.locked = !!(status.dx || status.dy);

    status.modifiedX = modifiedX;
    status.modifiedY = modifiedY;
  },

  modifyCoords: function ({ page, client, status, phase, options }) {
    if (options && options.enabled
        && !(phase === 'start' && status.locked)) {

      if (status.locked) {
        page.x += status.dx;
        page.y += status.dy;
        client.x += status.dx;
        client.y += status.dy;

        return {
          dx: status.dx,
          dy: status.dy,
        };
      }
    }
  },

  noInner,
  noOuter,
  getRestrictionRect,
};

modifiers.restrictEdges = restrictEdges;
modifiers.names.push('restrictEdges');

defaultOptions.perAction.restrictEdges = restrictEdges.defaults;
resize.defaults.restrictEdges          = restrictEdges.defaults;

module.exports = restrictEdges;

},{"../actions/resize":11,"../defaultOptions":19,"../utils":45,"../utils/rect":52,"./base":24,"./restrict":25}],27:[function(require,module,exports){
// This module adds the options.resize.restrictSize setting which sets min and
// max width and height for the target being resized.
//
// interact(target).resize({
//   edges: { top: true, left: true },
//   restrictSize: {
//     min: { width: -600, height: -600 },
//     max: { width:  600, height:  600 },
//   },
// });

const modifiers      = require('./base');
const restrictEdges  = require('./restrictEdges');
const utils          = require('../utils');
const rectUtils      = require('../utils/rect');
const defaultOptions = require('../defaultOptions');
const resize         = require('../actions/resize');

const noMin = { width: -Infinity, height: -Infinity };
const noMax = { width: +Infinity, height: +Infinity };

const restrictSize = {
  defaults: {
    enabled: false,
    endOnly: false,
    min: null,
    max: null,
  },

  setOffset: function ({ interaction }) {
    return interaction.startOffset;
  },

  set: function (arg) {
    const { interaction, options } = arg;
    const edges = interaction.prepared.linkedEdges || interaction.prepared.edges;

    if (!interaction.interacting() || !edges) {
      return;
    }

    const rect = rectUtils.xywhToTlbr(interaction.resizeRects.inverted);

    const minSize = rectUtils.tlbrToXywh(restrictEdges.getRestrictionRect(options.min, interaction)) || noMin;
    const maxSize = rectUtils.tlbrToXywh(restrictEdges.getRestrictionRect(options.max, interaction)) || noMax;

    arg.options = {
      enabled: options.enabled,
      endOnly: options.endOnly,
      inner: utils.extend({}, restrictEdges.noInner),
      outer: utils.extend({}, restrictEdges.noOuter),
    };

    if (edges.top) {
      arg.options.inner.top = rect.bottom - minSize.height;
      arg.options.outer.top = rect.bottom - maxSize.height;
    }
    else if (edges.bottom) {
      arg.options.inner.bottom = rect.top + minSize.height;
      arg.options.outer.bottom = rect.top + maxSize.height;
    }
    if (edges.left) {
      arg.options.inner.left = rect.right - minSize.width;
      arg.options.outer.left = rect.right - maxSize.width;
    }
    else if (edges.right) {
      arg.options.inner.right = rect.left + minSize.width;
      arg.options.outer.right = rect.left + maxSize.width;
    }

    restrictEdges.set(arg);
  },

  modifyCoords: restrictEdges.modifyCoords,
};

modifiers.restrictSize = restrictSize;
modifiers.names.push('restrictSize');

defaultOptions.perAction.restrictSize = restrictSize.defaults;
resize.defaults.restrictSize          = restrictSize.defaults;

module.exports = restrictSize;

},{"../actions/resize":11,"../defaultOptions":19,"../utils":45,"../utils/rect":52,"./base":24,"./restrictEdges":26}],28:[function(require,module,exports){
const modifiers      = require('./base');
const interact       = require('../interact');
const utils          = require('../utils');
const defaultOptions = require('../defaultOptions');

const snap = {
  defaults: {
    enabled: false,
    endOnly: false,
    range  : Infinity,
    targets: null,
    offsets: null,

    relativePoints: null,
  },

  setOffset: function ({ interaction, interactable, element, rect, startOffset, options }) {
    const offsets = [];
    const optionsOrigin = utils.rectToXY(utils.resolveRectLike(options.origin));
    const origin = optionsOrigin || utils.getOriginXY(interactable, element, interaction.prepared.name);
    options = options || interactable.options[interaction.prepared.name].snap || {};

    let snapOffset;

    if (options.offset === 'startCoords') {
      snapOffset = {
        x: interaction.startCoords.page.x - origin.x,
        y: interaction.startCoords.page.y - origin.y,
      };
    }
    else  {
      const offsetRect = utils.resolveRectLike(options.offset, interactable, element, [interaction]);

      snapOffset = utils.rectToXY(offsetRect) || { x: 0, y: 0 };
    }

    if (rect && options.relativePoints && options.relativePoints.length) {
      for (const { x: relativeX, y: relativeY } of options.relativePoints) {
        offsets.push({
          x: startOffset.left - (rect.width  * relativeX) + snapOffset.x,
          y: startOffset.top  - (rect.height * relativeY) + snapOffset.y,
        });
      }
    }
    else {
      offsets.push(snapOffset);
    }

    return offsets;
  },

  set: function ({ interaction, modifiedCoords, status, options, offset: offsets }) {
    const targets = [];
    let target;
    let page;
    let i;

    if (status.useStatusXY) {
      page = { x: status.x, y: status.y };
    }
    else {
      const origin = utils.getOriginXY(interaction.target, interaction.element, interaction.prepared.name);

      page = utils.extend({}, modifiedCoords);

      page.x -= origin.x;
      page.y -= origin.y;
    }

    status.realX = page.x;
    status.realY = page.y;

    let len = options.targets? options.targets.length : 0;

    for (const { x: offsetX, y: offsetY } of offsets) {
      const relativeX = page.x - offsetX;
      const relativeY = page.y - offsetY;

      for (const snapTarget of (options.targets || [])) {
        if (utils.is.function(snapTarget)) {
          target = snapTarget(relativeX, relativeY, interaction);
        }
        else {
          target = snapTarget;
        }

        if (!target) { continue; }

        targets.push({
          x: utils.is.number(target.x) ? (target.x + offsetX) : relativeX,
          y: utils.is.number(target.y) ? (target.y + offsetY) : relativeY,

          range: utils.is.number(target.range)? target.range: options.range,
        });
      }
    }

    const closest = {
      target: null,
      inRange: false,
      distance: 0,
      range: 0,
      dx: 0,
      dy: 0,
    };

    for (i = 0, len = targets.length; i < len; i++) {
      target = targets[i];

      const range = target.range;
      const dx = target.x - page.x;
      const dy = target.y - page.y;
      const distance = utils.hypot(dx, dy);
      let inRange = distance <= range;

      // Infinite targets count as being out of range
      // compared to non infinite ones that are in range
      if (range === Infinity && closest.inRange && closest.range !== Infinity) {
        inRange = false;
      }

      if (!closest.target || (inRange
          // is the closest target in range?
          ? (closest.inRange && range !== Infinity
          // the pointer is relatively deeper in this target
          ? distance / range < closest.distance / closest.range
          // this target has Infinite range and the closest doesn't
          : (range === Infinity && closest.range !== Infinity)
          // OR this target is closer that the previous closest
        || distance < closest.distance)
          // The other is not in range and the pointer is closer to this target
          : (!closest.inRange && distance < closest.distance))) {

        closest.target = target;
        closest.distance = distance;
        closest.range = range;
        closest.inRange = inRange;
        closest.dx = dx;
        closest.dy = dy;

        status.range = range;
      }
    }

    let snapChanged;

    if (closest.target) {
      snapChanged = (status.modifiedX !== closest.target.x || status.modifiedY !== closest.target.y);

      status.modifiedX = closest.target.x;
      status.modifiedY = closest.target.y;
    }
    else {
      snapChanged = true;

      status.modifiedX = NaN;
      status.modifiedY = NaN;
    }

    status.dx = closest.dx;
    status.dy = closest.dy;

    status.changed = (snapChanged || (closest.inRange && !status.locked));
    status.locked = closest.inRange;
  },

  modifyCoords: function ({ page, client, status, phase, options }) {
    const relativePoints = options && options.relativePoints;

    if (options && options.enabled
        && !(phase === 'start' && relativePoints && relativePoints.length)) {

      if (status.locked) {
        page.x += status.dx;
        page.y += status.dy;
        client.x += status.dx;
        client.y += status.dy;
      }

      return {
        range  : status.range,
        locked : status.locked,
        x      : status.modifiedX,
        y      : status.modifiedY,
        realX  : status.realX,
        realY  : status.realY,
        dx     : status.dx,
        dy     : status.dy,
      };
    }
  },
};

interact.createSnapGrid = function (grid) {
  return function (x, y) {
    const limits = grid.limits || {
      left  : -Infinity,
      right :  Infinity,
      top   : -Infinity,
      bottom:  Infinity,
    };
    let offsetX = 0;
    let offsetY = 0;

    if (utils.is.object(grid.offset)) {
      offsetX = grid.offset.x;
      offsetY = grid.offset.y;
    }

    const gridx = Math.round((x - offsetX) / grid.x);
    const gridy = Math.round((y - offsetY) / grid.y);

    const newX = Math.max(limits.left, Math.min(limits.right , gridx * grid.x + offsetX));
    const newY = Math.max(limits.top , Math.min(limits.bottom, gridy * grid.y + offsetY));

    return {
      x: newX,
      y: newY,
      range: grid.range,
    };
  };
};

modifiers.snap = snap;
modifiers.names.push('snap');

defaultOptions.perAction.snap = snap.defaults;

module.exports = snap;

},{"../defaultOptions":19,"../interact":22,"../utils":45,"./base":24}],29:[function(require,module,exports){
// This module allows snapping of the size of targets during resize
// interactions.

const modifiers      = require('./base');
const snap           = require('./snap');
const defaultOptions = require('../defaultOptions');
const resize         = require('../actions/resize');
const utils          = require('../utils/');

const snapSize = {
  defaults: {
    enabled: false,
    endOnly: false,
    range  : Infinity,
    targets: null,
    offsets: null,
  },

  setOffset: function (arg) {
    const { interaction, options } = arg;
    const edges = interaction.prepared.edges;

    if (!edges) { return; }

    arg.options = {
      relativePoints: [{
        x: edges.left? 0 : 1,
        y: edges.top ? 0 : 1,
      }],
      origin: { x: 0, y: 0 },
      offset: 'self',
      range: options.range,
    };

    const offsets = snap.setOffset(arg);
    arg.options = options;

    return offsets;
  },

  set: function (arg) {
    const { interaction, options, offset, modifiedCoords } = arg;
    const page = utils.extend({}, modifiedCoords);
    const relativeX = page.x - offset[0].x;
    const relativeY = page.y - offset[0].y;

    arg.options = utils.extend({}, options);
    arg.options.targets = [];

    for (const snapTarget of (options.targets || [])) {
      let target;

      if (utils.is.function(snapTarget)) {
        target = snapTarget(relativeX, relativeY, interaction);
      }
      else {
        target = snapTarget;
      }

      if (!target) { continue; }

      if ('width' in target && 'height' in target) {
        target.x = target.width;
        target.y = target.height;
      }

      arg.options.targets.push(target);
    }

    snap.set(arg);
  },

  modifyCoords: function (arg) {
    const { options } = arg;

    arg.options = utils.extend({}, options);
    arg.options.enabled = options.enabled;
    arg.options.relativePoints = [null];

    snap.modifyCoords(arg);
  },
};

modifiers.snapSize = snapSize;
modifiers.names.push('snapSize');

defaultOptions.perAction.snapSize = snapSize.defaults;
resize.defaults.snapSize          = snapSize.defaults;

module.exports = snapSize;

},{"../actions/resize":11,"../defaultOptions":19,"../utils/":45,"./base":24,"./snap":28}],30:[function(require,module,exports){
const pointerUtils = require('../utils/pointerUtils');

module.exports = class PointerEvent {
  /** */
  constructor (type, pointer, event, eventTarget, interaction) {
    pointerUtils.pointerExtend(this, event);

    if (event !== pointer) {
      pointerUtils.pointerExtend(this, pointer);
    }

    this.interaction = interaction;

    this.timeStamp     = new Date().getTime();
    this.originalEvent = event;
    this.type          = type;
    this.pointerId     = pointerUtils.getPointerId(pointer);
    this.pointerType   = pointerUtils.getPointerType(pointer);
    this.target        = eventTarget;
    this.currentTarget = null;

    if (type === 'tap') {
      const pointerIndex = interaction.getPointerIndex(pointer);
      this.dt = this.timeStamp - interaction.downTimes[pointerIndex];

      const interval = this.timeStamp - interaction.tapTime;

      this.double = !!(interaction.prevTap
        && interaction.prevTap.type !== 'doubletap'
        && interaction.prevTap.target === this.target
        && interval < 500);
    }
    else if (type === 'doubletap') {
      this.dt = pointer.timeStamp - interaction.tapTime;
    }
  }

  subtractOrigin ({ x: originX, y: originY }) {
    this.pageX   -= originX;
    this.pageY   -= originY;
    this.clientX -= originX;
    this.clientY -= originY;

    return this;
  }

  addOrigin ({ x: originX, y: originY }) {
    this.pageX   += originX;
    this.pageY   += originY;
    this.clientX += originX;
    this.clientY += originY;

    return this;
  }

  /** */
  preventDefault () {
    this.originalEvent.preventDefault();
  }

  /** */
  stopPropagation () {
    this.propagationStopped = true;
  }

  /** */
  stopImmediatePropagation () {
    this.immediatePropagationStopped = this.propagationStopped = true;
  }
};

},{"../utils/pointerUtils":50}],31:[function(require,module,exports){
const PointerEvent = require('./PointerEvent');
const Interaction  = require('../Interaction');
const utils        = require('../utils');
const defaults     = require('../defaultOptions');
const signals      = require('../utils/Signals').new();

const simpleSignals = [ 'down', 'up', 'cancel' ];
const simpleEvents  = [ 'down', 'up', 'cancel' ];

const pointerEvents = {
  PointerEvent,
  fire,
  collectEventTargets,
  signals,
  defaults: {
    holdDuration: 600,
    ignoreFrom  : null,
    allowFrom   : null,
    origin      : { x: 0, y: 0 },
  },
  types: [
    'down',
    'move',
    'up',
    'cancel',
    'tap',
    'doubletap',
    'hold',
  ],
};

function fire (arg) {
  const {
    interaction, pointer, event, eventTarget,
    type = arg.pointerEvent.type,
    targets = collectEventTargets(arg),
    pointerEvent = new PointerEvent(type, pointer, event, eventTarget, interaction),
  } = arg;

  const signalArg = {
    interaction,
    pointer,
    event,
    eventTarget,
    targets,
    type,
    pointerEvent,
  };

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];

    for (const prop in target.props || {}) {
      pointerEvent[prop] = target.props[prop];
    }

    const origin = utils.getOriginXY(target.eventable, target.element);

    pointerEvent.subtractOrigin(origin);
    pointerEvent.eventable = target.eventable;
    pointerEvent.currentTarget = target.element;

    target.eventable.fire(pointerEvent);

    pointerEvent.addOrigin(origin);

    if (pointerEvent.immediatePropagationStopped
        || (pointerEvent.propagationStopped
            && (i + 1) < targets.length && targets[i + 1].element !== pointerEvent.currentTarget)) {
      break;
    }
  }

  signals.fire('fired', signalArg);

  if (type === 'tap') {
    // if pointerEvent should make a double tap, create and fire a doubletap
    // PointerEvent and use that as the prevTap
    const prevTap = pointerEvent.double
      ? fire({
        interaction, pointer, event, eventTarget,
        type: 'doubletap',
      })
      : pointerEvent;

    interaction.prevTap = prevTap;
    interaction.tapTime = prevTap.timeStamp;
  }

  return pointerEvent;
}

function collectEventTargets ({ interaction, pointer, event, eventTarget, type }) {
  const pointerIndex = interaction.getPointerIndex(pointer);

  // do not fire a tap event if the pointer was moved before being lifted
  if (type === 'tap' && (interaction.pointerWasMoved
      // or if the pointerup target is different to the pointerdown target
      || !(interaction.downTargets[pointerIndex] && interaction.downTargets[pointerIndex] === eventTarget))) {
    return [];
  }

  const path = utils.getPath(eventTarget);
  const signalArg = {
    interaction,
    pointer,
    event,
    eventTarget,
    type,
    path,
    targets: [],
    element: null,
  };

  for (const element of path) {
    signalArg.element = element;

    signals.fire('collect-targets', signalArg);
  }

  if (type === 'hold') {
    signalArg.targets = signalArg.targets.filter(target =>
      target.eventable.options.holdDuration === interaction.holdTimers[pointerIndex].duration);
  }

  return signalArg.targets;
}

Interaction.signals.on('update-pointer-down', function ({ interaction, pointerIndex }) {
  interaction.holdTimers[pointerIndex] = { duration: Infinity, timeout: null };
});

Interaction.signals.on('remove-pointer', function ({ interaction, pointerIndex }) {
  interaction.holdTimers.splice(pointerIndex, 1);
});

Interaction.signals.on('move', function ({ interaction, pointer, event, eventTarget, duplicateMove }) {
  const pointerIndex = interaction.getPointerIndex(pointer);

  if (!duplicateMove && (!interaction.pointerIsDown || interaction.pointerWasMoved)) {
    if (interaction.pointerIsDown) {
      clearTimeout(interaction.holdTimers[pointerIndex].timeout);
    }

    fire({
      interaction, pointer, event, eventTarget,
      type: 'move',
    });
  }
});

Interaction.signals.on('down', function ({ interaction, pointer, event, eventTarget, pointerIndex }) {
  const timer = interaction.holdTimers[pointerIndex];
  const path = utils.getPath(eventTarget);
  const signalArg = {
    interaction,
    pointer,
    event,
    eventTarget,
    type: 'hold',
    targets: [],
    path,
    element: null,
  };

  for (const element of path) {
    signalArg.element = element;

    signals.fire('collect-targets', signalArg);
  }

  if (!signalArg.targets.length) { return; }

  let minDuration = Infinity;

  for (const target of signalArg.targets) {
    const holdDuration = target.eventable.options.holdDuration;

    if (holdDuration < minDuration) {
      minDuration = holdDuration;
    }
  }

  timer.duration = minDuration;
  timer.timeout = setTimeout(function () {
    fire({
      interaction,
      eventTarget,
      pointer,
      event,
      type: 'hold',
    });
  }, minDuration);
});

Interaction.signals.on('up', ({ interaction, pointer, event, eventTarget }) => {
  if (!interaction.pointerWasMoved) {
    fire({ interaction, eventTarget, pointer, event, type: 'tap' });
  }
});

for (const signalName of ['up', 'cancel']) {
  Interaction.signals.on(signalName, function ({ interaction, pointerIndex }) {
    if (interaction.holdTimers[pointerIndex]) {
      clearTimeout(interaction.holdTimers[pointerIndex].timeout);
    }
  });
}

function createSignalListener (type) {
  return function ({ interaction, pointer, event, eventTarget }) {
    fire({ interaction, eventTarget, pointer, event, type });
  };
}

for (let i = 0; i < simpleSignals.length; i++) {
  Interaction.signals.on(simpleSignals[i], createSignalListener(simpleEvents[i]));
}

Interaction.signals.on('new', function (interaction) {
  interaction.prevTap    = null;  // the most recent tap event on this interaction
  interaction.tapTime    = 0;     // time of the most recent tap event
  interaction.holdTimers = [];    // [{ duration, timeout }]
});

defaults.pointerEvents = pointerEvents.defaults;
module.exports = pointerEvents;

},{"../Interaction":6,"../defaultOptions":19,"../utils":45,"../utils/Signals":35,"./PointerEvent":30}],32:[function(require,module,exports){
const pointerEvents = require('./base');
const Interaction   = require('../Interaction');

pointerEvents.signals.on('new', onNew);
pointerEvents.signals.on('fired', onFired);

for (const signal of ['move', 'up', 'cancel', 'endall']) {
  Interaction.signals.on(signal, endHoldRepeat);
}

function onNew ({ pointerEvent }) {
  if (pointerEvent.type !== 'hold') { return; }

  pointerEvent.count = (pointerEvent.count || 0) + 1;
}

function onFired ({ interaction, pointerEvent, eventTarget, targets }) {
  if (pointerEvent.type !== 'hold' || !targets.length) { return; }

  // get the repeat interval from the first eventable
  const interval = targets[0].eventable.options.holdRepeatInterval;

  // don't repeat if the interval is 0 or less
  if (interval <= 0) { return; }

  // set a timeout to fire the holdrepeat event
  interaction.holdIntervalHandle = setTimeout(function () {
    pointerEvents.fire({
      interaction,
      eventTarget,
      type: 'hold',
      pointer: pointerEvent,
      event: pointerEvent,
    });
  }, interval);
}

function endHoldRepeat ({ interaction }) {
  // set the interaction's holdStopTime property
  // to stop further holdRepeat events
  if (interaction.holdIntervalHandle) {
    clearInterval(interaction.holdIntervalHandle);
    interaction.holdIntervalHandle = null;
  }
}

// don't repeat by default
pointerEvents.defaults.holdRepeatInterval = 0;
pointerEvents.types.push('holdrepeat');

module.exports = {
  onNew,
  onFired,
  endHoldRepeat,
};

},{"../Interaction":6,"./base":31}],33:[function(require,module,exports){
const pointerEvents = require('./base');
const Interactable  = require('../Interactable');
const is            = require('../utils/is');
const scope         = require('../scope');
const extend        = require('../utils/extend');
const { merge }     = require('../utils/arr');

pointerEvents.signals.on('collect-targets', function ({ targets, element, type, eventTarget }) {
  scope.interactables.forEachMatch(element, interactable => {
    const eventable = interactable.events;
    const options = eventable.options;

    if (eventable[type]
      && is.element(element)
      && interactable.testIgnoreAllow(options, element, eventTarget)) {

      targets.push({
        element,
        eventable,
        props: { interactable },
      });
    }
  });
});

Interactable.signals.on('new', function ({ interactable }) {
  interactable.events.getRect = function (element) {
    return interactable.getRect(element);
  };
});

Interactable.signals.on('set', function ({ interactable, options }) {
  extend(interactable.events.options, pointerEvents.defaults);
  extend(interactable.events.options, options);
});

merge(Interactable.eventTypes, pointerEvents.types);

Interactable.prototype.pointerEvents = function (options) {
  extend(this.events.options, options);

  return this;
};

const __backCompatOption = Interactable.prototype._backCompatOption;

Interactable.prototype._backCompatOption = function (optionName, newValue) {
  const ret = __backCompatOption.call(this, optionName, newValue);

  if (ret === this) {
    this.events.options[optionName] = newValue;
  }

  return ret;
};

Interactable.settingsMethods.push('pointerEvents');

},{"../Interactable":5,"../scope":34,"../utils/arr":36,"../utils/extend":42,"../utils/is":47,"./base":31}],34:[function(require,module,exports){
const utils   = require('./utils');
const events  = require('./utils/events');
const signals = require('./utils/Signals').new();

const { getWindow } = require('./utils/window');

const scope = {
  signals,
  events,
  utils,

  // main document
  document: require('./utils/domObjects').document,
  // all documents being listened to
  documents: [],

  addDocument: function (doc, win) {
    // do nothing if document is already known
    if (utils.contains(scope.documents, doc)) { return false; }

    win = win || getWindow(doc);

    scope.documents.push(doc);
    events.documents.push(doc);

    // don't add an unload event for the main document
    // so that the page may be cached in browser history
    if (doc !== scope.document) {
      events.add(win, 'unload', scope.onWindowUnload);
    }

    signals.fire('add-document', { doc, win });
  },

  removeDocument: function (doc, win) {
    const index = scope.documents.indexOf(doc);

    win = win || getWindow(doc);

    events.remove(win, 'unload', scope.onWindowUnload);

    scope.documents.splice(index, 1);
    events.documents.splice(index, 1);

    signals.fire('remove-document', { win, doc });
  },

  onWindowUnload: function () {
    scope.removeDocument(this.document, this);
  },
};

module.exports = scope;

},{"./utils":45,"./utils/Signals":35,"./utils/domObjects":39,"./utils/events":41,"./utils/window":53}],35:[function(require,module,exports){
class Signals {
  constructor () {
    this.listeners = {
      // signalName: [listeners],
    };
  }

  on (name, listener) {
    if (!this.listeners[name]) {
      this.listeners[name] = [listener];
      return;
    }

    this.listeners[name].push(listener);
  }

  off (name, listener) {
    if (!this.listeners[name]) { return; }

    const index = this.listeners[name].indexOf(listener);

    if (index !== -1) {
      this.listeners[name].splice(index, 1);
    }
  }

  fire (name, arg) {
    const targetListeners = this.listeners[name];

    if (!targetListeners) { return; }

    for (const listener of targetListeners) {
      if (listener(arg, name) === false) {
        return;
      }
    }
  }
}

Signals.new = function () {
  return new Signals();
};

module.exports = Signals;

},{}],36:[function(require,module,exports){
function contains (array, target) {
  return array.indexOf(target) !== -1;
}

function merge (target, source) {
  for (const item of source) {
    target.push(item);
  }

  return target;
}

module.exports = {
  contains,
  merge,
};

},{}],37:[function(require,module,exports){
const { window } = require('./window');
const is     = require('./is');
const domObjects = require('./domObjects');

const Element = domObjects.Element;
const navigator  = window.navigator;

const browser = {
  // Does the browser support touch input?
  supportsTouch: !!(('ontouchstart' in window) || is.function(window.DocumentTouch)
                     && domObjects.document instanceof window.DocumentTouch),

  // Does the browser support PointerEvents
  supportsPointerEvent: !!domObjects.PointerEvent,

  isIOS: (/iP(hone|od|ad)/.test(navigator.platform)),

  // scrolling doesn't change the result of getClientRects on iOS 7
  isIOS7: (/iP(hone|od|ad)/.test(navigator.platform)
           && /OS 7[^\d]/.test(navigator.appVersion)),

  isIe9: /MSIE 9/.test(navigator.userAgent),

  // prefix matchesSelector
  prefixedMatchesSelector: 'matches' in Element.prototype
    ? 'matches': 'webkitMatchesSelector' in Element.prototype
    ? 'webkitMatchesSelector': 'mozMatchesSelector' in Element.prototype
    ? 'mozMatchesSelector': 'oMatchesSelector' in Element.prototype
    ? 'oMatchesSelector': 'msMatchesSelector',

  pEventTypes: (domObjects.PointerEvent
    ? (domObjects.PointerEvent === window.MSPointerEvent
      ? {
        up:     'MSPointerUp',
        down:   'MSPointerDown',
        over:   'mouseover',
        out:    'mouseout',
        move:   'MSPointerMove',
        cancel: 'MSPointerCancel',
      }
      : {
        up:     'pointerup',
        down:   'pointerdown',
        over:   'pointerover',
        out:    'pointerout',
        move:   'pointermove',
        cancel: 'pointercancel',
      })
    : null),

  // because Webkit and Opera still use 'mousewheel' event type
  wheelEvent: 'onmousewheel' in domObjects.document? 'mousewheel': 'wheel',

};

// Opera Mobile must be handled differently
browser.isOperaMobile = (navigator.appName === 'Opera'
  && browser.supportsTouch
  && navigator.userAgent.match('Presto'));

module.exports = browser;

},{"./domObjects":39,"./is":47,"./window":53}],38:[function(require,module,exports){
const is = require('./is');

module.exports = function clone (source) {
  const dest = {};
  for (const prop in source) {
    if (is.plainObject(source[prop])) {
      dest[prop] = clone(source[prop]);
    } else {
      dest[prop] = source[prop];
    }
  }
  return dest;
};

},{"./is":47}],39:[function(require,module,exports){
const domObjects = {};
const win = require('./window').window;

function blank () {}

domObjects.document           = win.document;
domObjects.DocumentFragment   = win.DocumentFragment   || blank;
domObjects.SVGElement         = win.SVGElement         || blank;
domObjects.SVGSVGElement      = win.SVGSVGElement      || blank;
domObjects.SVGElementInstance = win.SVGElementInstance || blank;
domObjects.Element            = win.Element            || blank;
domObjects.HTMLElement        = win.HTMLElement        || domObjects.Element;

domObjects.Event        = win.Event;
domObjects.Touch        = win.Touch || blank;
domObjects.PointerEvent = (win.PointerEvent || win.MSPointerEvent);

module.exports = domObjects;

},{"./window":53}],40:[function(require,module,exports){
const win        = require('./window');
const browser    = require('./browser');
const is         = require('./is');
const domObjects = require('./domObjects');

const domUtils = {
  nodeContains: function (parent, child) {
    while (child) {
      if (child === parent) {
        return true;
      }

      child = child.parentNode;
    }

    return false;
  },

  closest: function (element, selector) {
    while (is.element(element)) {
      if (domUtils.matchesSelector(element, selector)) { return element; }

      element = domUtils.parentNode(element);
    }

    return null;
  },

  parentNode: function (node) {
    let parent = node.parentNode;

    if (is.docFrag(parent)) {
      // skip past #shado-root fragments
      while ((parent = parent.host) && is.docFrag(parent)) {
        continue;
      }

      return parent;
    }

    return parent;
  },

  matchesSelector: function (element, selector) {
    // remove /deep/ from selectors if shadowDOM polyfill is used
    if (win.window !== win.realWindow) {
      selector = selector.replace(/\/deep\//g, ' ');
    }

    return element[browser.prefixedMatchesSelector](selector);
  },

  // Test for the element that's "above" all other qualifiers
  indexOfDeepestElement: function (elements) {
    let deepestZoneParents = [];
    let dropzoneParents = [];
    let dropzone;
    let deepestZone = elements[0];
    let index = deepestZone? 0: -1;
    let parent;
    let child;
    let i;
    let n;

    for (i = 1; i < elements.length; i++) {
      dropzone = elements[i];

      // an element might belong to multiple selector dropzones
      if (!dropzone || dropzone === deepestZone) {
        continue;
      }

      if (!deepestZone) {
        deepestZone = dropzone;
        index = i;
        continue;
      }

      // check if the deepest or current are document.documentElement or document.rootElement
      // - if the current dropzone is, do nothing and continue
      if (dropzone.parentNode === dropzone.ownerDocument) {
        continue;
      }
      // - if deepest is, update with the current dropzone and continue to next
      else if (deepestZone.parentNode === dropzone.ownerDocument) {
        deepestZone = dropzone;
        index = i;
        continue;
      }

      if (!deepestZoneParents.length) {
        parent = deepestZone;
        while (parent.parentNode && parent.parentNode !== parent.ownerDocument) {
          deepestZoneParents.unshift(parent);
          parent = parent.parentNode;
        }
      }

      // if this element is an svg element and the current deepest is
      // an HTMLElement
      if (deepestZone instanceof domObjects.HTMLElement
          && dropzone instanceof domObjects.SVGElement
          && !(dropzone instanceof domObjects.SVGSVGElement)) {

        if (dropzone === deepestZone.parentNode) {
          continue;
        }

        parent = dropzone.ownerSVGElement;
      }
      else {
        parent = dropzone;
      }

      dropzoneParents = [];

      while (parent.parentNode !== parent.ownerDocument) {
        dropzoneParents.unshift(parent);
        parent = parent.parentNode;
      }

      n = 0;

      // get (position of last common ancestor) + 1
      while (dropzoneParents[n] && dropzoneParents[n] === deepestZoneParents[n]) {
        n++;
      }

      const parents = [
        dropzoneParents[n - 1],
        dropzoneParents[n],
        deepestZoneParents[n],
      ];

      child = parents[0].lastChild;

      while (child) {
        if (child === parents[1]) {
          deepestZone = dropzone;
          index = i;
          deepestZoneParents = [];

          break;
        }
        else if (child === parents[2]) {
          break;
        }

        child = child.previousSibling;
      }
    }

    return index;
  },

  matchesUpTo: function (element, selector, limit) {
    while (is.element(element)) {
      if (domUtils.matchesSelector(element, selector)) {
        return true;
      }

      element = domUtils.parentNode(element);

      if (element === limit) {
        return domUtils.matchesSelector(element, selector);
      }
    }

    return false;
  },

  getActualElement: function (element) {
    return (element instanceof domObjects.SVGElementInstance
      ? element.correspondingUseElement
      : element);
  },

  getScrollXY: function (relevantWindow) {
    relevantWindow = relevantWindow || win.window;
    return {
      x: relevantWindow.scrollX || relevantWindow.document.documentElement.scrollLeft,
      y: relevantWindow.scrollY || relevantWindow.document.documentElement.scrollTop,
    };
  },

  getElementClientRect: function (element) {
    const clientRect = (element instanceof domObjects.SVGElement
      ? element.getBoundingClientRect()
      : element.getClientRects()[0]);

    return clientRect && {
      left  : clientRect.left,
      right : clientRect.right,
      top   : clientRect.top,
      bottom: clientRect.bottom,
      width : clientRect.width  || clientRect.right  - clientRect.left,
      height: clientRect.height || clientRect.bottom - clientRect.top,
    };
  },

  getElementRect: function (element) {
    const clientRect = domUtils.getElementClientRect(element);

    if (!browser.isIOS7 && clientRect) {
      const scroll = domUtils.getScrollXY(win.getWindow(element));

      clientRect.left   += scroll.x;
      clientRect.right  += scroll.x;
      clientRect.top    += scroll.y;
      clientRect.bottom += scroll.y;
    }

    return clientRect;
  },

  getPath: function (element) {
    const path = [];

    while (element) {
      path.push(element);
      element = domUtils.parentNode(element);
    }

    return path;
  },

  trySelector: value => {
    if (!is.string(value)) { return false; }

    // an exception will be raised if it is invalid
    domObjects.document.querySelector(value);
    return true;
  },
};

module.exports = domUtils;

},{"./browser":37,"./domObjects":39,"./is":47,"./window":53}],41:[function(require,module,exports){
const is           = require('./is');
const domUtils     = require('./domUtils');
const pointerUtils = require('./pointerUtils');
const pExtend      = require('./pointerExtend');

const { window }   = require('./window');
const { contains } = require('./arr');

const elements = [];
const targets  = [];

// {
//   type: {
//     selectors: ['selector', ...],
//     contexts : [document, ...],
//     listeners: [[listener, capture, passive], ...]
//   }
//  }
const delegatedEvents = {};
const documents       = [];

const supportsOptions = (() => {
  let supported = false;

  window.document.createElement('div').addEventListener('test', null, {
    get capture () { supported = true; },
  });

  return supported;
})();

function add (element, type, listener, optionalArg) {
  const options = getOptions(optionalArg);
  let elementIndex = elements.indexOf(element);
  let target = targets[elementIndex];

  if (!target) {
    target = {
      events: {},
      typeCount: 0,
    };

    elementIndex = elements.push(element) - 1;
    targets.push(target);
  }

  if (!target.events[type]) {
    target.events[type] = [];
    target.typeCount++;
  }

  if (!contains(target.events[type], listener)) {
    element.addEventListener(type, listener, supportsOptions? options : !!options.capture);
    target.events[type].push(listener);
  }
}

function remove (element, type, listener, optionalArg) {
  const options = getOptions(optionalArg);
  const elementIndex = elements.indexOf(element);
  const target = targets[elementIndex];

  if (!target || !target.events) {
    return;
  }

  if (type === 'all') {
    for (type in target.events) {
      if (target.events.hasOwnProperty(type)) {
        remove(element, type, 'all');
      }
    }
    return;
  }

  if (target.events[type]) {
    const len = target.events[type].length;

    if (listener === 'all') {
      for (let i = 0; i < len; i++) {
        remove(element, type, target.events[type][i], options);
      }
      return;
    }
    else {
      for (let i = 0; i < len; i++) {
        if (target.events[type][i] === listener) {
          element.removeEventListener(`on${type}`, listener, supportsOptions? options : !!options.capture);
          target.events[type].splice(i, 1);

          break;
        }
      }
    }

    if (target.events[type] && target.events[type].length === 0) {
      target.events[type] = null;
      target.typeCount--;
    }
  }

  if (!target.typeCount) {
    targets.splice(elementIndex, 1);
    elements.splice(elementIndex, 1);
  }
}

function addDelegate (selector, context, type, listener, optionalArg) {
  const options = getOptions(optionalArg);
  if (!delegatedEvents[type]) {
    delegatedEvents[type] = {
      selectors: [],
      contexts : [],
      listeners: [],
    };

    // add delegate listener functions
    for (const doc of documents) {
      add(doc, type, delegateListener);
      add(doc, type, delegateUseCapture, true);
    }
  }

  const delegated = delegatedEvents[type];
  let index;

  for (index = delegated.selectors.length - 1; index >= 0; index--) {
    if (delegated.selectors[index] === selector
        && delegated.contexts[index] === context) {
      break;
    }
  }

  if (index === -1) {
    index = delegated.selectors.length;

    delegated.selectors.push(selector);
    delegated.contexts .push(context);
    delegated.listeners.push([]);
  }

  // keep listener and capture and passive flags
  delegated.listeners[index].push([listener, !!options.capture, options.passive]);
}

function removeDelegate (selector, context, type, listener, optionalArg) {
  const options = getOptions(optionalArg);
  const delegated = delegatedEvents[type];
  let matchFound = false;
  let index;

  if (!delegated) { return; }

  // count from last index of delegated to 0
  for (index = delegated.selectors.length - 1; index >= 0; index--) {
    // look for matching selector and context Node
    if (delegated.selectors[index] === selector
        && delegated.contexts[index] === context) {

      const listeners = delegated.listeners[index];

      // each item of the listeners array is an array: [function, capture, passive]
      for (let i = listeners.length - 1; i >= 0; i--) {
        const [fn, capture, passive] = listeners[i];

        // check if the listener functions and capture and passive flags match
        if (fn === listener && capture === !!options.capture && passive === options.passive) {
          // remove the listener from the array of listeners
          listeners.splice(i, 1);

          // if all listeners for this interactable have been removed
          // remove the interactable from the delegated arrays
          if (!listeners.length) {
            delegated.selectors.splice(index, 1);
            delegated.contexts .splice(index, 1);
            delegated.listeners.splice(index, 1);

            // remove delegate function from context
            remove(context, type, delegateListener);
            remove(context, type, delegateUseCapture, true);

            // remove the arrays if they are empty
            if (!delegated.selectors.length) {
              delegatedEvents[type] = null;
            }
          }

          // only remove one listener
          matchFound = true;
          break;
        }
      }

      if (matchFound) { break; }
    }
  }
}

// bound to the interactable context when a DOM event
// listener is added to a selector interactable
function delegateListener (event, optionalArg) {
  const options = getOptions(optionalArg);
  const fakeEvent = {};
  const delegated = delegatedEvents[event.type];
  const [eventTarget] = (pointerUtils.getEventTargets(event));
  let element = eventTarget;

  // duplicate the event so that currentTarget can be changed
  pExtend(fakeEvent, event);

  fakeEvent.originalEvent = event;
  fakeEvent.preventDefault = preventOriginalDefault;

  // climb up document tree looking for selector matches
  while (is.element(element)) {
    for (let i = 0; i < delegated.selectors.length; i++) {
      const selector = delegated.selectors[i];
      const context = delegated.contexts[i];

      if (domUtils.matchesSelector(element, selector)
          && domUtils.nodeContains(context, eventTarget)
          && domUtils.nodeContains(context, element)) {

        const listeners = delegated.listeners[i];

        fakeEvent.currentTarget = element;

        for (let j = 0; j < listeners.length; j++) {
          const [fn, capture, passive] = listeners[j];

          if (capture === !!options.capture && passive === options.passive) {
            fn(fakeEvent);
          }
        }
      }
    }

    element = domUtils.parentNode(element);
  }
}

function delegateUseCapture (event) {
  return delegateListener.call(this, event, true);
}

function preventOriginalDefault () {
  this.originalEvent.preventDefault();
}

function getOptions (param) {
  return is.object(param)? param : { capture: param };
}

module.exports = {
  add,
  remove,

  addDelegate,
  removeDelegate,

  delegateListener,
  delegateUseCapture,
  delegatedEvents,
  documents,

  supportsOptions,

  _elements: elements,
  _targets: targets,
};

},{"./arr":36,"./domUtils":40,"./is":47,"./pointerExtend":49,"./pointerUtils":50,"./window":53}],42:[function(require,module,exports){
module.exports = function extend (dest, source) {
  for (const prop in source) {
    dest[prop] = source[prop];
  }
  return dest;
};

},{}],43:[function(require,module,exports){
const {
  resolveRectLike,
  rectToXY,
} = require('./rect');

module.exports = function (target, element, action) {
  const actionOptions = target.options[action];
  const actionOrigin = actionOptions && actionOptions.origin;
  const origin = actionOrigin || target.options.origin;

  const originRect = resolveRectLike(origin, target, element, [target && element]);

  return rectToXY(originRect) || { x: 0, y: 0 };
};

},{"./rect":52}],44:[function(require,module,exports){
module.exports = (x, y) =>  Math.sqrt(x * x + y * y);

},{}],45:[function(require,module,exports){
const extend = require('./extend');
const win    = require('./window');

const utils = {
  warnOnce: function (method, message) {
    let warned = false;

    return function () {
      if (!warned) {
        win.window.console.warn(message);
        warned = true;
      }

      return method.apply(this, arguments);
    };
  },

  // http://stackoverflow.com/a/5634528/2280888
  _getQBezierValue: function (t, p1, p2, p3) {
    const iT = 1 - t;
    return iT * iT * p1 + 2 * iT * t * p2 + t * t * p3;
  },

  getQuadraticCurvePoint: function (startX, startY, cpX, cpY, endX, endY, position) {
    return {
      x:  utils._getQBezierValue(position, startX, cpX, endX),
      y:  utils._getQBezierValue(position, startY, cpY, endY),
    };
  },

  // http://gizma.com/easing/
  easeOutQuad: function (t, b, c, d) {
    t /= d;
    return -c * t*(t-2) + b;
  },

  copyAction: function (dest, src) {
    dest.name  = src.name;
    dest.axis  = src.axis;
    dest.edges = src.edges;

    return dest;
  },

  is         : require('./is'),
  extend     : extend,
  hypot      : require('./hypot'),
  getOriginXY: require('./getOriginXY'),
};

extend(utils, require('./arr'));
extend(utils, require('./domUtils'));
extend(utils, require('./pointerUtils'));
extend(utils, require('./rect'));

module.exports = utils;

},{"./arr":36,"./domUtils":40,"./extend":42,"./getOriginXY":43,"./hypot":44,"./is":47,"./pointerUtils":50,"./rect":52,"./window":53}],46:[function(require,module,exports){
const scope   = require('../scope');
const utils   = require('./index');

const finder = {
  methodOrder: [ 'simulationResume', 'mouseOrPen', 'hasPointer', 'idle' ],

  search: function (pointer, eventType, eventTarget) {
    const pointerType = utils.getPointerType(pointer);
    const pointerId = utils.getPointerId(pointer);
    const details = { pointer, pointerId, pointerType, eventType, eventTarget };

    for (const method of finder.methodOrder) {
      const interaction = finder[method](details);

      if (interaction) {
        return interaction;
      }
    }
  },

  // try to resume simulation with a new pointer
  simulationResume: function ({ pointerType, eventType, eventTarget }) {
    if (!/down|start/i.test(eventType)) {
      return null;
    }

    for (const interaction of scope.interactions) {
      let element = eventTarget;

      if (interaction.simulation && interaction.simulation.allowResume
          && (interaction.pointerType === pointerType)) {
        while (element) {
          // if the element is the interaction element
          if (element === interaction.element) {
            return interaction;
          }
          element = utils.parentNode(element);
        }
      }
    }

    return null;
  },

  // if it's a mouse or pen interaction
  mouseOrPen: function ({ pointerId, pointerType, eventType }) {
    if (pointerType !== 'mouse' && pointerType !== 'pen') {
      return null;
    }

    let firstNonActive;

    for (const interaction of scope.interactions) {
      if (interaction.pointerType === pointerType) {
        // if it's a down event, skip interactions with running simulations
        if (interaction.simulation && !utils.contains(interaction.pointerIds, pointerId)) { continue; }

        // if the interaction is active, return it immediately
        if (interaction.interacting()) {
          return interaction;
        }
        // otherwise save it and look for another active interaction
        else if (!firstNonActive) {
          firstNonActive = interaction;
        }
      }
    }

    // if no active mouse interaction was found use the first inactive mouse
    // interaction
    if (firstNonActive) {
      return firstNonActive;
    }

    // find any mouse or pen interaction.
    // ignore the interaction if the eventType is a *down, and a simulation
    // is active
    for (const interaction of scope.interactions) {
      if (interaction.pointerType === pointerType && !(/down/i.test(eventType) && interaction.simulation)) {
        return interaction;
      }
    }

    return null;
  },

  // get interaction that has this pointer
  hasPointer: function ({ pointerId }) {
    for (const interaction of scope.interactions) {
      if (utils.contains(interaction.pointerIds, pointerId)) {
        return interaction;
      }
    }
  },

  // get first idle interaction with a matching pointerType
  idle: function ({ pointerType }) {
    for (const interaction of scope.interactions) {
      // if there's already a pointer held down
      if (interaction.pointerIds.length === 1) {
        const target = interaction.target;
        // don't add this pointer if there is a target interactable and it
        // isn't gesturable
        if (target && !target.options.gesture.enabled) {
          continue;
        }
      }
      // maximum of 2 pointers per interaction
      else if (interaction.pointerIds.length >= 2) {
        continue;
      }

      if (!interaction.interacting() && (pointerType === interaction.pointerType)) {
        return interaction;
      }
    }

    return null;
  },
};

module.exports = finder;

},{"../scope":34,"./index":45}],47:[function(require,module,exports){
const win        = require('./window');
const isWindow   = require('./isWindow');

const is = {
  array   : () => {},

  window  : thing => thing === win.window || isWindow(thing),

  docFrag : thing => is.object(thing) && thing.nodeType === 11,

  object  : thing => !!thing && (typeof thing === 'object'),

  function: thing => typeof thing === 'function',

  number  : thing => typeof thing === 'number'  ,

  bool    : thing => typeof thing === 'boolean' ,

  string  : thing => typeof thing === 'string'  ,

  element: thing => {
    if (!thing || (typeof thing !== 'object')) { return false; }

    const _window = win.getWindow(thing) || win.window;

    return (/object|function/.test(typeof _window.Element)
      ? thing instanceof _window.Element //DOM2
      : thing.nodeType === 1 && typeof thing.nodeName === 'string');
  },

  plainObject: thing => is.object(thing) && thing.constructor.name === 'Object',
};

is.array = thing => (is.object(thing)
  && (typeof thing.length !== 'undefined')
  && is.function(thing.splice));

module.exports = is;

},{"./isWindow":48,"./window":53}],48:[function(require,module,exports){
module.exports = (thing) => !!(thing && thing.Window) && (thing instanceof thing.Window);

},{}],49:[function(require,module,exports){
function pointerExtend (dest, source) {
  for (const prop in source) {
    const prefixedPropREs = module.exports.prefixedPropREs;
    let deprecated = false;

    // skip deprecated prefixed properties
    for (const vendor in prefixedPropREs) {
      if (prop.indexOf(vendor) === 0 && prefixedPropREs[vendor].test(prop)) {
        deprecated = true;
        break;
      }
    }

    if (!deprecated && typeof source[prop] !== 'function') {
      dest[prop] = source[prop];
    }
  }
  return dest;
}

pointerExtend.prefixedPropREs = {
  webkit: /(Movement[XY]|Radius[XY]|RotationAngle|Force)$/,
};

module.exports = pointerExtend;

},{}],50:[function(require,module,exports){
const hypot         = require('./hypot');
const browser       = require('./browser');
const dom           = require('./domObjects');
const domUtils      = require('./domUtils');
const domObjects    = require('./domObjects');
const is            = require('./is');
const pointerExtend = require('./pointerExtend');

const pointerUtils = {
  copyCoords: function (dest, src) {
    dest.page = dest.page || {};
    dest.page.x = src.page.x;
    dest.page.y = src.page.y;

    dest.client = dest.client || {};
    dest.client.x = src.client.x;
    dest.client.y = src.client.y;

    dest.timeStamp = src.timeStamp;
  },

  setCoordDeltas: function (targetObj, prev, cur) {
    targetObj.page.x    = cur.page.x    - prev.page.x;
    targetObj.page.y    = cur.page.y    - prev.page.y;
    targetObj.client.x  = cur.client.x  - prev.client.x;
    targetObj.client.y  = cur.client.y  - prev.client.y;
    targetObj.timeStamp = cur.timeStamp - prev.timeStamp;

    // set pointer velocity
    const dt = Math.max(targetObj.timeStamp / 1000, 0.001);

    targetObj.page.speed   = hypot(targetObj.page.x, targetObj.page.y) / dt;
    targetObj.page.vx      = targetObj.page.x / dt;
    targetObj.page.vy      = targetObj.page.y / dt;

    targetObj.client.speed = hypot(targetObj.client.x, targetObj.page.y) / dt;
    targetObj.client.vx    = targetObj.client.x / dt;
    targetObj.client.vy    = targetObj.client.y / dt;
  },

  isNativePointer: function  (pointer) {
    return (pointer instanceof dom.Event || pointer instanceof dom.Touch);
  },

  // Get specified X/Y coords for mouse or event.touches[0]
  getXY: function (type, pointer, xy) {
    xy = xy || {};
    type = type || 'page';

    xy.x = pointer[type + 'X'];
    xy.y = pointer[type + 'Y'];

    return xy;
  },

  getPageXY: function (pointer, page) {
    page = page || {};

    // Opera Mobile handles the viewport and scrolling oddly
    if (browser.isOperaMobile && pointerUtils.isNativePointer(pointer)) {
      pointerUtils.getXY('screen', pointer, page);

      page.x += window.scrollX;
      page.y += window.scrollY;
    }
    else {
      pointerUtils.getXY('page', pointer, page);
    }

    return page;
  },

  getClientXY: function (pointer, client) {
    client = client || {};

    if (browser.isOperaMobile && pointerUtils.isNativePointer(pointer)) {
      // Opera Mobile handles the viewport and scrolling oddly
      pointerUtils.getXY('screen', pointer, client);
    }
    else {
      pointerUtils.getXY('client', pointer, client);
    }

    return client;
  },

  getPointerId: function (pointer) {
    return is.number(pointer.pointerId)? pointer.pointerId : pointer.identifier;
  },

  setCoords: function (targetObj, pointers, timeStamp) {
    const pointer = (pointers.length > 1
                     ? pointerUtils.pointerAverage(pointers)
                     : pointers[0]);

    const tmpXY = {};

    pointerUtils.getPageXY(pointer, tmpXY);
    targetObj.page.x = tmpXY.x;
    targetObj.page.y = tmpXY.y;

    pointerUtils.getClientXY(pointer, tmpXY);
    targetObj.client.x = tmpXY.x;
    targetObj.client.y = tmpXY.y;

    targetObj.timeStamp = is.number(timeStamp) ? timeStamp :new Date().getTime();
  },

  pointerExtend: pointerExtend,

  getTouchPair: function (event) {
    const touches = [];

    // array of touches is supplied
    if (is.array(event)) {
      touches[0] = event[0];
      touches[1] = event[1];
    }
    // an event
    else {
      if (event.type === 'touchend') {
        if (event.touches.length === 1) {
          touches[0] = event.touches[0];
          touches[1] = event.changedTouches[0];
        }
        else if (event.touches.length === 0) {
          touches[0] = event.changedTouches[0];
          touches[1] = event.changedTouches[1];
        }
      }
      else {
        touches[0] = event.touches[0];
        touches[1] = event.touches[1];
      }
    }

    return touches;
  },

  pointerAverage: function (pointers) {
    const average = {
      pageX  : 0,
      pageY  : 0,
      clientX: 0,
      clientY: 0,
      screenX: 0,
      screenY: 0,
    };

    for (const pointer of pointers) {
      for (const prop in average) {
        average[prop] += pointer[prop];
      }
    }
    for (const prop in average) {
      average[prop] /= pointers.length;
    }

    return average;
  },

  touchBBox: function (event) {
    if (!event.length && !(event.touches && event.touches.length > 1)) {
      return;
    }

    const touches = pointerUtils.getTouchPair(event);
    const minX = Math.min(touches[0].pageX, touches[1].pageX);
    const minY = Math.min(touches[0].pageY, touches[1].pageY);
    const maxX = Math.max(touches[0].pageX, touches[1].pageX);
    const maxY = Math.max(touches[0].pageY, touches[1].pageY);

    return {
      x: minX,
      y: minY,
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  },

  touchDistance: function (event, deltaSource) {
    const sourceX = deltaSource + 'X';
    const sourceY = deltaSource + 'Y';
    const touches = pointerUtils.getTouchPair(event);


    const dx = touches[0][sourceX] - touches[1][sourceX];
    const dy = touches[0][sourceY] - touches[1][sourceY];

    return hypot(dx, dy);
  },

  touchAngle: function (event, prevAngle, deltaSource) {
    const sourceX = deltaSource + 'X';
    const sourceY = deltaSource + 'Y';
    const touches = pointerUtils.getTouchPair(event);
    const dx = touches[1][sourceX] - touches[0][sourceX];
    const dy = touches[1][sourceY] - touches[0][sourceY];
    const angle = 180 * Math.atan2(dy , dx) / Math.PI;

    return  angle;
  },

  getPointerType: function (pointer) {
    return is.string(pointer.pointerType)
      ? pointer.pointerType
      : is.number(pointer.pointerType)
        ? [undefined, undefined,'touch', 'pen', 'mouse'][pointer.pointerType]
          // if the PointerEvent API isn't available, then the "pointer" must
          // be either a MouseEvent, TouchEvent, or Touch object
          : /touch/.test(pointer.type) || pointer instanceof domObjects.Touch
            ? 'touch'
            : 'mouse';
  },

  // [ event.target, event.currentTarget ]
  getEventTargets: function (event) {
    const path = is.function(event.composedPath) ? event.composedPath() : event.path;

    return [
      domUtils.getActualElement(path ? path[0] : event.target),
      domUtils.getActualElement(event.currentTarget),
    ];
  },
};

module.exports = pointerUtils;

},{"./browser":37,"./domObjects":39,"./domUtils":40,"./hypot":44,"./is":47,"./pointerExtend":49}],51:[function(require,module,exports){
const { window } = require('./window');

const vendors = ['ms', 'moz', 'webkit', 'o'];
let lastTime = 0;
let request;
let cancel;

for (let x = 0; x < vendors.length && !window.requestAnimationFrame; x++) {
  request = window[vendors[x] + 'RequestAnimationFrame'];
  cancel = window[vendors[x] +'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
}

if (!request) {
  request = function (callback) {
    const currTime = new Date().getTime();
    const timeToCall = Math.max(0, 16 - (currTime - lastTime));
    const id = setTimeout(function () { callback(currTime + timeToCall); },
                          timeToCall);

    lastTime = currTime + timeToCall;
    return id;
  };
}

if (!cancel) {
  cancel = function (id) {
    clearTimeout(id);
  };
}

module.exports = {
  request,
  cancel,
};

},{"./window":53}],52:[function(require,module,exports){
const extend = require('./extend');
const is = require('./is');
const {
  closest,
  parentNode,
  getElementRect,
} = require('./domUtils');

const rectUtils = {
  getStringOptionResult: function (value, interactable, element) {
    if (!is.string(value)) {
      return null;
    }

    if (value === 'parent') {
      value = parentNode(element);
    }
    else if (value === 'self') {
      value = interactable.getRect(element);
    }
    else {
      value = closest(element, value);
    }

    return value;
  },

  resolveRectLike: function (value, interactable, element, functionArgs) {
    value = rectUtils.getStringOptionResult(value, interactable, element) || value;

    if (is.function(value)) {
      value = value.apply(null, functionArgs);
    }

    if (is.element(value)) {
      value = getElementRect(value);
    }

    return value;
  },

  rectToXY: function (rect) {
    return  rect && {
      x: 'x' in rect ? rect.x : rect.left,
      y: 'y' in rect ? rect.y : rect.top,
    };
  },

  xywhToTlbr: function (rect) {
    if (rect && !('left' in rect && 'top' in rect)) {
      rect = extend({}, rect);

      rect.left   = rect.x || 0;
      rect.top    = rect.y || 0;
      rect.right  = rect.right   || (rect.left + rect.width);
      rect.bottom = rect.bottom  || (rect.top + rect.height);
    }

    return rect;
  },

  tlbrToXywh: function (rect) {
    if (rect && !('x' in rect && 'y' in rect)) {
      rect = extend({}, rect);

      rect.x      = rect.left || 0;
      rect.top    = rect.top  || 0;
      rect.width  = rect.width  || (rect.right  - rect.x);
      rect.height = rect.height || (rect.bottom - rect.y);
    }

    return rect;
  },
};

module.exports = rectUtils;

},{"./domUtils":40,"./extend":42,"./is":47}],53:[function(require,module,exports){
const win = module.exports;
const isWindow = require('./isWindow');

function init (window) {
  // get wrapped window if using Shadow DOM polyfill

  win.realWindow = window;

  // create a TextNode
  const el = window.document.createTextNode('');

  // check if it's wrapped by a polyfill
  if (el.ownerDocument !== window.document
      && typeof window.wrap === 'function'
    && window.wrap(el) === el) {
    // use wrapped window
    window = window.wrap(window);
  }

  win.window = window;
}

if (typeof window === 'undefined') {
  win.window     = undefined;
  win.realWindow = undefined;
}
else {
  init(window);
}

win.getWindow = function getWindow (node) {
  if (isWindow(node)) {
    return node;
  }

  const rootNode = (node.ownerDocument || node);

  return rootNode.defaultView || rootNode.parentWindow || win.window;
};

win.init = init;

},{"./isWindow":48}]},{},[1]);
