import DE from '@dreamirl/dreamengine/src';

// TODO idea Inputs.js
// ajouter une fonction dans les callback, si on a le pointer d'un gameObject sur la callback;
// si le gameobject est !enable on empêche le trigger callback sauf si argument "force" est a
// "true" lors de la déclaration (ddonc ajouter un paramètre dans la déclaration d'events)

/**
 * @constructor GameScreen
 * @class A plugin to create a complete GameScreen with a Camera and a Scene inside + useful middle-ware
 * It's compatible with the plugin GameScreensManager to handle easily multiple Game Screens
 * GameScreen can also handle for you Gamepad navigation though menus and/or objects in your scene, and add shortcuts binded on input
 * @param {String} name - The GameScreen name, useful only for debug and if you use the GameScreensManager
 * @param {Object} params - All parameters are optional
 * @author Inateno
 */
function GameScreen(name, params) {
  DE.Events.Emitter.call(this);

  if (!params) params = {};

  if (params.initialize) this.initialize = params.initialize;

  this.name = name || 'gamescreen' + ((Math.random() * 10) >> 0);
  this.scene = new DE.Scene();
  this.camera = new (Function.prototype.bind.apply(
    DE.Camera,
    [DE.Camera].concat(params.camera),
  ))();
  this.camera.scene = this.scene;

  if (params.gui) {
    this.gui = new DE.Gui(name + '-gui');
  }

  this.enable = true;
  /***
   * declare your buttons inside this namespace, it's used by gamepad navigation
   * it can be a GameObject or a button, but it must contain a "mouseUp" function as trigger
   */
  this.buttons = params.buttons || {};
  // {
  //   next: null
  //   ,previous: null
  //   ,play: null
  // };

  this.currentButton = null;
}

GameScreen.prototype = Object.create(DE.Events.Emitter.prototype);
GameScreen.prototype.constructor = GameScreen;

GameScreen.prototype.trigger = GameScreen.prototype.emit;
// DE.Event.addEventCapabilities( GameScreen );

GameScreen.prototype.initialize = function() {};

GameScreen.prototype.initializeGamepadControls = function(params) {
  if (params.useGamepad || params.gamepad) {
    if (!params.gamepad) params.gamepad = {};

    /***
     * cursor is used for gamepad navigation
     */
    this.selectorFX = params.selectorFX;

    this.screen = params.screen || '';
    this.activeScreen = params.activeScreen || [];

    // to do, get the key and search the index automaticaly for the default button
    this.gamepadPosX =
      params.defaultbutton.x || params.gamepad.defaultbutton.x || 0;
    this.gamepadPosY =
      params.defaultbutton.y || params.gamepad.defaultbutton.y || 0;

    // this._updateCursorPos();
    /***
     * declare gamepad navigation as a 2D array push buttons or objects names
     */
    this.gamepadNavigation = []; /*
      [ "play", "previous", "next" ]
      ,[ "lib", "previous", "next" ]
      ,[ "options", "previous", "next" ]
      ,[ "previous", "options", "next" ]
    ];*/

    /***
     * declare gamepad shortcuts, when this input occurs it fire defined function previously declared in your screen
     * if function doesn't exist, trigger an error
     * use addGamepadShortcuts and removeGamepadShortcuts
     */
    this._gamepadShortcuts = {};
    /*{
      b: "back"
      ,start: "play"
      ,a: "select"
      ,RT: "page,1"
      ,LT: "page,-1"
    };*/

    if (params.shortcuts)
      for (var i in params.shortcuts)
        this.addGamepadShortcuts(i, params.shortcuts[i]);

    // TODO inputs binding based on gamepadShortcuts (we should be able to change shortcuts after, add or remove ?)
    // TODO axe input for gamepad navigation
    if (params.navigation)
      this.enableGamepadNavigation(
        params.navigation,
        params.gamepad.navigationOpts,
      );

    this.gamepadSettings = {
      minForceX: params.gamepad.minForceX || params.gamepad.minforcex || 0.8,
      minForceY: params.gamepad.minForceY || params.gamepad.minforcey || 0.8,
      navDelayLong:
        params.gamepad.navDelayLong || params.gamepad.navdelaylong || 1000,
      navDelayShort:
        params.gamepad.navDelayShort || params.gamepad.navdelayshort || 700,
    };
  }
  // DE.Event.addEventComponents( this );
};

/**
 * @public
 * enable gamepad navigation with a stick + a confirm button
 * @memberOf GameScreen
 * @param {Array} navigationArray a 2d array with objects name inside, these object should already exist in the screen
 * @param {Object} options configure inputs names, default is: "haxe", "vaxe", "confirm"
 */
GameScreen.prototype.enableGamepadNavigation = function(
  navigationArray,
  options,
) {
  this.gamepadNavigation = navigationArray;
  DE.Inputs.on(
    'axeMoved',
    options.haxe || 'haxe',
    (val) => {
      this._onGamepadHAxe(val);
    },
    this,
  );
  DE.Inputs.on(
    'axeMoved',
    options.vaxe || 'vaxe',
    (val) => {
      this._onGamepadVAxe(val);
    },
    this,
  );
  DE.Inputs.on(
    'axeStop',
    options.haxe || 'haxe',
    () => {
      this.__storedH = 0;
      this.__onGamepadHAxeCount = 0;
    },
    this,
  );
  DE.Inputs.on(
    'axeStop',
    options.vaxe || 'vaxe',
    () => {
      this.__storedV = 0;
      this.__onGamepadVAxeCount = 0;
    },
    this,
  );

  DE.Inputs.on(
    'keyUp',
    options.confirmInput || 'confirm',
    () => {
      console.log('confirm Input');
      this._cursorSelect();
    },
    this,
  );
  // console.log("Gamepad Control enabled", options)
};

/**
 * @public
 * a shortcut to GameScreen.scene.add
 * @memberOf GameScreen
 * @param {GameObject} GameObject same as Scene.add, call with one or more GameObject or array, or both
 * @example myScreen.add( object1, button, [ tile1, tile2, tile3 ] );
 */
GameScreen.prototype.add = function() {
  this.scene.add.apply(this.scene, arguments);
};

/**
 * @public
 * A middle-ware to avoid repeating this each time
 * Add given buttons inside this.buttons (required for gamepad trigger) and add each of them into the scene
 * @memberOf GameScreen
 * @param {Object} buttons list of buttons, need as JS Object
 */
GameScreen.prototype.addButtons = function(buttons) {
  for (var i in buttons) {
    if (this.buttons[i] && DE.CONFIG.DEBUG_LEVEL > 0)
      console.warn(
        'You just overwrite an existing button in your screen: ' + this.name,
      );

    this.buttons[i] = buttons[i];
    this.scene.add(buttons[i]);
  }
};

/**
 * @public
 * add a shortcuts binding, you can only bind 1 button to call by inputName, you can do an invisible button with lot of logic inside the fired function
 * @memberOf GameScreen
 * @param {String} inputName input to listen
 * @param {String} btnName button to trigger when input occur
 */
GameScreen.prototype.addGamepadShortcuts = function(inputName, btnName) {
  // TODO add listener
  this._gamepadShortcuts[inputName] = btnName;
  // DE.GamePad.on
  // _onGamepadHAxe
};

/**
 * @public
 * remove a shortcut binding
 * @memberOf GameScreen
 * @param {String} inputName input to remove
 */
GameScreen.prototype.removeGamepadShortcuts = function(inputName) {
  // TODO remove listener
  delete this._gamepadShortcuts[inputName];
};

/**
 * @protected
 * related to gamepad navigation, fired when an axe event occur and update cursor position
 * you can call it directly if you are doing stuff on GameObjects and/or changing your gamepadNavigation
 * @memberOf GameScreen
 */
GameScreen.prototype._updateCursorPos = function() {
  if (
    this.gamepadNavigation[this.gamepadPosY][this.gamepadPosX] == '_' ||
    !this.gamepadNavigation[this.gamepadPosY][this.gamepadPosX].btn.enable
  ) {
    return console.log('bouton not enabled'); // this._updateCursorsPos(axisMove, true);
  }

  if (this.currentButton) {
    this.currentButton.rnr.filters = [];
  }

  this.currentButton = this.gamepadNavigation[this.gamepadPosY][
    this.gamepadPosX
  ];

  if (this.currentButton.btn && !this.currentButton.rnr) {
    this.currentButton.rnr = this.currentButton.btn.spriteRenderer;
  } else if (this.currentButton.callB) {
    this.currentButton.btn = this.currentButton.callB;
  }

  this.currentButton.rnr.filters = [this.selectorFX];

  this.currentButton.rnr.filterArea = new DE.PIXI.Rectangle(
    0,
    0,
    this.scene.width,
    this.scene.height,
  );

  return this.currentButton;

  // TODO add cursor offset here based on object collider size + cursor pos (top/bottom/left/right ?) + cursor offsets ?
};

/**
 * @protected
 * related to gamepad navigation fired when an axe event occur
 * also onGamepadVAxe and cursorSelect exist too, and if you plan to overwrite one of these functions you should do it for all
 * @memberOf GameScreen
 */
GameScreen.prototype.__onGamepadHAxeCount = 0;
GameScreen.prototype.__storedH = 0;
GameScreen.prototype._onGamepadHAxe = function(val) {
  if (
    !this.enable ||
    (val < this.gamepadSettings.minForceX &&
      val > -this.gamepadSettings.minForceX) ||
    val == undefined ||
    (this.lastInputHaxe && Date.now() - this.lastInputHaxe < 500)
  )
    return;

  if (this.activeScreen[0] != this.screen) {
    return console.log(this.activeScreen[0], this.screen);
  }

  if (val) this.__storedH = val;

  this.lastInputHaxe = Date.now();
  this.gamepadPosX += this.__storedH > 0 ? 1 : -1;

  if (this.gamepadPosX >= this.gamepadNavigation[this.gamepadPosY].length)
    this.gamepadPosX = this.gamepadNavigation[this.gamepadPosY].length - 1;

  if (this.gamepadPosX < 0) this.gamepadPosX = 0;

  this._updateCursorPos('haxe');
  ++this.__onGamepadHAxeCount;
  // var self = this;
  // if (this.__onGamepadHAxeCount == 1)
  //   setTimeout(function() {
  //     self._onGamepadHAxe();
  //   }, this.gamepadSettings.navDelayLong);
  // else
  //   setTimeout(function() {
  //     self._onGamepadHAxe();
  //   }, this.gamepadSettings.navDelayShort);
};
GameScreen.prototype.__onGamepadVAxeCount = 0;
GameScreen.prototype.__storedV = 0;
GameScreen.prototype._onGamepadVAxe = function(val) {
  if (
    !this.enable ||
    (val < this.gamepadSettings.minForceY &&
      val > -this.gamepadSettings.minForceY) ||
    val == undefined ||
    (this.lastInputVaxe && Date.now() - this.lastInputVaxe < 500)
  )
    return;

  if (this.activeScreen[0] != this.screen) {
    return console.log(this.activeScreen[0], this.screen);
  }

  if (val) this.__storedV = val;

  this.lastInputVaxe = Date.now();

  this.gamepadPosY += this.__storedV > 0 ? 1 : -1;

  if (this.gamepadPosY < 0) this.gamepadPosY = 0;

  if (this.gamepadPosY >= this.gamepadNavigation.length)
    this.gamepadPosY = this.gamepadNavigation.length - 1;

  if (this.gamepadPosX >= this.gamepadNavigation[this.gamepadPosY].length)
    this.gamepadPosX = this.gamepadNavigation[this.gamepadPosY].length - 1;

  if (this.gamepadNavigation[this.gamepadPosY].length <= this.gamepadPosX)
    this.gamepadPosX = 0;

  this._updateCursorPos('vaxe');

  ++this.__onGamepadVAxeCount;
  // var self = this;
  // if (this.__onGamepadVAxeCount == 1)
  //   setTimeout(function() {
  //     self._onGamepadHAxe();
  //   }, this.gamepadSettings.navDelayLong);
  // else
  //   setTimeout(function() {
  //     self._onGamepadHAxe();
  //   }, this.gamepadSettings.navDelayShort);
};
GameScreen.prototype._cursorSelect = function() {
  if (!this.enable) return;
  if (this.currentButton.spriteRenderer)
    console.log('_cursorSelect', this.currentButton.spriteRenderer.spriteName);

  if (this.activeScreen[0] != this.screen) {
    return console.log(this.activeScreen[0], this.screen);
  }

  var self = this;
  setTimeout(function() {
    console.log('click');
    if (!self.currentButton.btn.onMouseClick)
      self.currentButton.btn.pointerdown();
    else self.currentButton.btn.onMouseClick();
  }, 200);
};

/**
 * @public
 * show this screen (enable camera and scene)
 * @memberOf GameScreen
 * @param {*} args optional arguments bubbled trough events
 * @param {Object} transition used transition, check transition method
 */
GameScreen.prototype.show = function(args, transition) {
  DE.emit('gamescreen-show', this.name, args);
  this.emit.apply(
    this,
    args && args.push ? ['show'].concat(args) : ['show', args],
  );

  this.scene.enable = true;
  this.camera.enable = true;
  if (this.gui) {
    this.gui.enable = true;
  }
  this.enable = true;

  this.emit.apply(
    this,
    args && args.push ? ['shown'].concat(args) : ['shown', args],
  );
  DE.emit('gamescreen-shown', this.name, args);
};

/**
 * @public
 * hide this screen (disable camera and scene)
 * @memberOf GameScreen
 */
GameScreen.prototype.hide = function(keepSceneActive, transition, silent) {
  if (!silent) {
    DE.emit('gamescreen-hide', this.name);
    this.emit('hide', this);
  }

  if (keepSceneActive) {
    this.scene.enable = true;
  } else {
    this.scene.enable = false;
  }

  if (this.gui) {
    this.gui.enable = false;
  }
  this.camera.enable = false;
  this.enable = false;

  if (!silent) {
    this.emit('hidden', this);
    DE.emit('gamescreen-hidden', this.name);
  }
};

/**
 * @public
 * TODO
 * @memberOF GameScreen
 */
GameScreen.prototype.transition = function(data) {
  // data.type
  // data.delay
};

DE.GameScreen = GameScreen;

export default GameScreen;
