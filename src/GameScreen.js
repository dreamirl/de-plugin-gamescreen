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

  if (params.useGamepad || params.gamepad) {
    if (!params.gamepad) params.gamepad = {};

    /***
     * cursor is used for gamepad navigation
     */
    this.cursor = new DE.GameObject({
      zindex: params.gamepad.zindex || 10,
      renderer: new DE.SpriteRenderer({
        spriteName: params.gamepad.cursorSpriteName || 'cursor',
      }),
    });
    this.cursorPosition = params.gamepad.cursorPosition || 'left';
    this.currsorOffset = params.gamepad.cursorOffset || { x: 0, y: 0 };

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

    if (params.gamepad.shortcuts)
      for (var i in params.gamepad.shortcuts)
        this.addGamepadShortcuts(i, params.gamepad.shortcuts[i]);

    // TODO inputs binding based on gamepadShortcuts (we should be able to change shortcuts after, add or remove ?)
    // TODO axe input for gamepad navigation
    if (params.gamepad.navigation)
      this.enableGamepadNavigation(
        params.gamepad.navigation,
        params.gamepad.navigationOpts,
      );

    this.gamepadSettings = {
      minForceX: params.gamepad.minForceX || params.gamepad.minforcex || 0.9,
      minForceY: params.gamepad.minForceY || params.gamepad.minforcey || 0.9,
      navDelayLong:
        params.gamepad.navDelayLong || params.gamepad.navdelaylong || 1000,
      navDelayShort:
        params.gamepad.navDelayShort || params.gamepad.navdelayshort || 700,
    };
  }
  // DE.Event.addEventComponents( this );
}

GameScreen.prototype = Object.create(DE.Events.Emitter.prototype);
GameScreen.prototype.constructor = GameScreen;

GameScreen.prototype.trigger = GameScreen.prototype.emit;
// DE.Event.addEventCapabilities( GameScreen );

GameScreen.prototype.initialize = function() {};
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
  DE.Inputs.on('axeMoved', options.haxe || 'haxe', this._onGamepadHAxe, this);
  DE.Inputs.on('axeMoved', options.vaxe || 'vaxe', this._onGamepadVAxe, this);
  DE.Inputs.on(
    'axeStop',
    options.haxe || 'haxe',
    function() {
      this.__storedH = 0;
      this.__onGamepadHAxeCount = 0;
    },
    this,
  );
  DE.Inputs.on(
    'axeStop',
    options.vaxe || 'vaxe',
    function() {
      this.__storedV = 0;
      this.__onGamepadVAxeCount = 0;
    },
    this,
  );

  DE.Inputs.on(
    'keyUp',
    options.confirmInput || 'confirm',
    this._cursorSelect,
    this,
  );
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
  this.currentCursorObject = this.objects[
    this.gamepadNavigation[this.gamepadPosY][this.gamepadPosX]
  ];
  this.cursor.focus(this.currentButton);

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
  // if value is under minimum, ignore
  if (
    !this.enable ||
    (val !== undefined && val < this.gamepadSettings.minForceX) ||
    // if gamepad is moved by user, but not a 0, ignore it because a setTimouet will be fired
    (this.__storedH > this.gamepadSettings.minForceX && val !== undefined) ||
    // in case user stopped axes between setTimeout
    (val === undefined && this.__storedH == 0 && this.__onGamepadHAxeCount > 0)
  )
    return;
  if (val) this.__storedH = val;

  this.gamepadPosX += this.__storedH > 0 ? 1 : -1;

  if (this.gamepadPosX >= this.gamepadNavigation[this.gamepadPosY].length)
    this.gamepadPosX = 0;
  this._updateCursorPos();

  ++this.__onGamepadHAxeCount;
  var self = this;
  if (this.__onGamepadHAxeCount == 1)
    setTimeout(function() {
      self._onGamepadHAxe();
    }, this.gamepadSettings.navDelayLong);
  else
    setTimeout(function() {
      self._onGamepadHAxe();
    }, this.gamepadSettings.navDelayShort);
};
GameScreen.prototype.__onGamepadVAxeCount = 0;
GameScreen.prototype.__storedV = 0;
GameScreen.prototype._onGamepadVAxe = function(val) {
  // if value is under minimum, ignore
  if (
    !this.enable ||
    (val !== undefined && val < this.gamepadSettings.minForceY) ||
    // if gamepad is moved by user, but not a 0, ignore it because a setTimouet will be fired
    (this.__storedV > this.gamepadSettings.minForceY && val !== undefined) ||
    // in case user stopped axes between setTimeout
    (val === undefined && this.__storedV == 0 && this.__onGamepadVAxeCount > 0)
  )
    return;
  if (val) this.__storedV = val;

  this.gamepadPosX += this.__storedV > 0 ? 1 : -1;

  if (this.gamepadPosX >= this.gamepadNavigation[this.gamepadPosY].length)
    this.gamepadPosX = 0;
  if (this.gamepadNavigation[this.gamepadPosY].length <= this.gamepadPosX)
    this.gamepadPosX = this.gamepadNavigation[this.gamepadPosY].length - 1;

  this._updateCursorPos();

  ++this.__onGamepadVAxeCount;
  var self = this;
  if (this.__onGamepadVAxeCount == 1)
    setTimeout(function() {
      self._onGamepadHAxe();
    }, this.gamepadSettings.navDelayLong);
  else
    setTimeout(function() {
      self._onGamepadHAxe();
    }, this.gamepadSettings.navDelayShort);
};
GameScreen.prototype._cursorSelect = function() {
  if (!this.enable) return;

  this.currentButton.pointerup({ x: 0, y: 0 }, {});
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
