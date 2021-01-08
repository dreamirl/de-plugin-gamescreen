import DE from '@dreamirl/dreamengine/src';

// TODO idea Inputs.js
// ajouter une fonction dans les callback, si on a le pointer d'un gameObject sur la callback;
// si le gameobject est !enable on empêche le trigger callback sauf si argument "force" est a
// "true" lors de la déclaration (ddonc ajouter un paramètre dans la déclaration d'events)

/**
 * @constructor GameScreen
 * @class A plugin to create a complete GameScreen with a Camera and a Scene inside + useful middle-ware
 * It's compatible with the plugin GameScreensManager to handle easily multiple Game Screens
 * GameScreen can also handle for you Gamepad and keyboard navigation though menus and/or objects in your scene, and add shortcuts binded on input
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
   * declare your buttons inside this namespace, it's used by menu navigation
   * it can be a GameObject or a button, but it must contain a "mouseUp" function as trigger
   */
  this.buttons = params.buttons || {};
  // {
  //   next: null
  //   ,previous: null
  //   ,play: null
  // };

  this.currentButton = null;
  this.currentTab = null;
}

GameScreen.prototype = Object.create(DE.Events.Emitter.prototype);
GameScreen.prototype.constructor = GameScreen;

GameScreen.prototype.trigger = GameScreen.prototype.emit;
// DE.Event.addEventCapabilities( GameScreen );

GameScreen.prototype.initialize = function() {};

GameScreen.prototype.initializeMenuControls = function(params) {

  const useGamepad = params.gamepad !== undefined;
  const useKeyboard = params.useKeyboard ? params.useKeyboard : true;

  if (!useGamepad && !useKeyboard) return;

  /***
   * cursor is used for menu navigation
   */
  this.selectorFX = params.selectorFX;

  this.screen = params.screen || '';
  this.activeScreen = params.activeScreen || [];

  // to do, get the key and search the index automaticaly for the default button
  this.cursorPosX =
    params.defaultButton.x || params.gamepad.defaultButton.x || 0;
  this.cursorPosY =
    params.defaultButton.y || params.gamepad.defaultButton.y || 0;

  /***
   * declare menu navigation as a 2D array push buttons or objects names
   */
  this.menuNavigation = []; /*
    [ "play", "previous", "next" ]
    ,[ "lib", "previous", "next" ]
    ,[ "options", "previous", "next" ]
    ,[ "previous", "options", "next" ]
  ];*/

  /***
   * declare menu shortcuts, when this input occurs it fire defined function previously declared in your screen
   * use addShortcut and removeShortcut
   */
  this._shortcuts = {};
  /*shortcuts: [
    {
      name: "exampleButton",
      inputName: "back",
      btn: this.btn,
    },
  ]*/

  if (useGamepad)
    this.gamepadSettings = {
      minForceX: params.gamepad.minForceX || params.gamepad.minforcex || 0.8,
      minForceY: params.gamepad.minForceY || params.gamepad.minforcey || 0.8,
    };

  this.menuSettings = {
    navDelayLong:
      params.navDelayLong || params.gamepad.navDelayLong || 1000,
    navDelayShort:
      params.navDelayShort || params.gamepad.navDelayShort || 700,
  };

  if (params.shortcuts)
    for (var i in params.shortcuts)
      this.addShortcut(params.shortcuts[i]);

  if (params.menuNavigation)
    this.enableMenuNavigation(
      useGamepad,
      useKeyboard,
      params.menuNavigation,
      params.gamepad.navigationOpts,
      params.tabsNavigation,
      params.subTabsNavigation,
      this.cursorPosX,
      this.cursorPosY,
    );

  this.hideOnMouseEvent = params.hideOnMouseEvent;

  if (params.hideOnMouseEvent)
    window.addEventListener('mousemove', () => {this._onMouseMove(this.currentButton)}, {once: true});

  // DE.Event.addEventComponents( this );
};

/**
 * @public
 * enable gamepad and keyboard navigation with movements and shortcuts
 * @memberOf GameScreen
 * @param {Array} navigationArray a 2d array with objects name inside, these object should already exist in the screen
 * @param {Object} options configure inputs names, default is: "haxe", "vaxe", "confirm"
 */
GameScreen.prototype.enableMenuNavigation = function(
  useGamepad,
  useKeyboard,
  menuNavigation,
  gamepadOptions,
  tabsNavigation,
  subTabsNavigation,
  defaultCursorPosX,
  defaultCursorPosY,
) {
  this.menuNavigation = menuNavigation;
  this.tabsNavigation = tabsNavigation;
  this.subTabsNavigation = subTabsNavigation;

  if (useGamepad) {
    DE.Inputs.on(
      'axeMoved',
      gamepadOptions.haxe || 'haxe',
      (val) => {
        if (val > 0) this.currentAxeMoved = 'right';
        else if (val < 0) this.currentAxeMoved = 'left';
        this._onGamepadHAxe(val, this.currentAxeMoved);
      },
      this,
    );
    DE.Inputs.on(
      'axeMoved',
      gamepadOptions.vaxe || 'vaxe',
      (val) => {
        if (val > 0) this.currentAxeMoved = 'up';
        else if (val < 0) this.currentAxeMoved = 'down';
        this._onGamepadVAxe(val, this.currentAxeMoved);
      },
      this,
    );
    DE.Inputs.on(
      'axeStop',
      gamepadOptions.haxe || 'haxe',
      () => {
        this.__storedH = 0;
        this.useNavShortDelay = false;
        this.lastInputHaxe = 0;
        this.currentAxeMoved = undefined;
      },
      this,
    );
    DE.Inputs.on(
      'axeStop',
      gamepadOptions.vaxe || 'vaxe',
      () => {
        this.__storedV = 0;
        this.useNavShortDelay = false;
        this.lastInputVaxe = 0;
        this.currentAxeMoved = undefined;
      },
      this,
    );
  }

  if (useKeyboard) {
    DE.Inputs.on(
      'keyDown',
      'leftArrow',
      () => {
        this.currentKeyPressed = 'left';
        this._onKeyPress(true, -1, 'left');
      },
      this,
    );
    DE.Inputs.on(
      'keyDown',
      'rightArrow',
      () => {
        this.currentKeyPressed = 'right';
        this._onKeyPress(true, 1, 'right');
      },
      this,
    );
    DE.Inputs.on(
      'keyDown',
      'upArrow',
      () => {
        this.currentKeyPressed = 'up';
        this._onKeyPress(false, -1, 'up');
      },
      this,
    );
    DE.Inputs.on(
      'keyDown',
      'downArrow',
      () => {
        this.currentKeyPressed = 'down';
        this._onKeyPress(false, 1, 'down');
      },
      this,
    );

    DE.Inputs.on(
      'keyUp',
      'arrows',
      () => {
        this.currentKeyPressed = undefined;
        this.useNavShortDelay = false;
      },
      this,
    );
  }

  DE.Inputs.on(
    'keyDown',
    gamepadOptions.confirmInput || 'confirm',
    () => {
      this._cursorSelect();
    },
    this,
  );

  if (this.tabsNavigation) {
    DE.Inputs.on(
      'keyDown',
      gamepadOptions.rightTrigger || 'rightTrigger',
      () => {
        this._tabsNavigation(this.tabsNavigation, 1, defaultCursorPosX, defaultCursorPosY);
      },
      this,
    );
    DE.Inputs.on(
      'keyDown',
      gamepadOptions.leftTrigger || 'leftTrigger',
      () => {
        this._tabsNavigation(this.tabsNavigation, -1, defaultCursorPosX, defaultCursorPosY);
      },
      this,
    );

    if (this.subTabsNavigation) {
      DE.Inputs.on(
        'keyDown',
        gamepadOptions.rightBumper || 'rightBumper',
        () => {
          this._tabsNavigation(this.subTabsNavigation, 1, defaultCursorPosX, defaultCursorPosY);
        },
        this,
      );
      DE.Inputs.on(
        'keyDown',
        gamepadOptions.leftBumper || 'leftBumper',
        () => {
          this._tabsNavigation(this.subTabsNavigation, -1, defaultCursorPosX, defaultCursorPosY);
        },
        this,
      );
    }
  }
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
 * add a shortcut binding
 * @memberOf GameScreen
 * @param {Object} shortcut an object with these properties :
 * {String} name name to identify shortcut
 * {String} inputName input to listen
 * {GameObject} btn button to trigger when input occur
 */
GameScreen.prototype.addShortcut = function(shortcut) {
  this._shortcuts[shortcut.name] = DE.Inputs.on(
    'keyDown',
    shortcut.inputName,
    () => {
      if (!this.enable || this.activeScreen[0] != this.screen) return
      if (!shortcut.btn.onMouseClick)
        shortcut.btn.pointerdown();
      else shortcut.btn.onMouseClick();
    },
    this,
  );
};

/**
 * @public
 * remove a shortcut binding
 * @memberOf GameScreen
 * @param {String} name shortcut to remove
 */
GameScreen.prototype.removeShortcut = function(name) {
  delete this._shortcuts[name];
};

/**
 * @protected
 * related to menu navigation, update cursor position
 * you can call it directly if you are doing stuff on GameObjects and/or changing your menuNavigation
 * @memberOf GameScreen
 */
GameScreen.prototype._updateCursorPos = function() {
  if (
    !this.menuNavigation[this.cursorPosY][this.cursorPosX].btn.enable
  ) {
    return console.warn('bouton not enabled');
  }

  if (this.hideOnMouseEvent)
    window.addEventListener('mousemove', () => {this._onMouseMove(this.currentButton)}, {once: true});

  if (this.currentButton) {
    this.currentButton.rnr.filters = [];
  }
  
  this.currentButton = this.menuNavigation[this.cursorPosY][
    this.cursorPosX

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
 * related to menu navigation, fired when a mouse movement is detected
 * you can call it directly to hide filters of the current button
 * @memberOf GameScreen
 */
GameScreen.prototype._onMouseMove = function() {
  if (this.currentButton) {
    this.currentButton.rnr.filters = []
  }
};

/**
 * @protected
 * calculate cursor position with pathfinding
 * | is used as verticals channels
 * - is used as horizontals channels
 * |- is used as up left corner
 * -| is used as up right corner
 * |_ is used as down left corner
 * _| is used as down right corner
 * # is used as a block
 * @memberOf GameScreen
 * @param {Number} oldCursorPosX initial cursor x position
 * @param {Number} oldCursorPosY initial cursor y position
 * @param {Number} newCursorPosX new cursor x position
 * @param {Number} newCursorPosY new cursor y position
 */
GameScreen.prototype.calculateCursorPos = function(oldCursorPosX, oldCursorPosY, newCursorPosX, newCursorPosY) {
  let dir;
  if (oldCursorPosX < newCursorPosX) dir = "right";
  else if (oldCursorPosX > newCursorPosX) dir = "left";
  else if (oldCursorPosY < newCursorPosY) dir = "down";
  else if (oldCursorPosY > newCursorPosY) dir = "up";
  else return [oldCursorPosX, oldCursorPosY];

  if (!this.menuNavigation[newCursorPosY] || !this.menuNavigation[newCursorPosY][newCursorPosX])
    return [oldCursorPosX, oldCursorPosY];

  const newCursorPos = this.menuNavigation[newCursorPosY][newCursorPosX];

  if (newCursorPos === "#") return [oldCursorPosX, oldCursorPosY];

  let cursors = [{dir: dir, x: newCursorPosX, y: newCursorPosY}];

  const self = this;
  function navigate(cursorIndex) {
    const cursor = cursors[cursorIndex]

    if (!self.menuNavigation[cursor.y] || !self.menuNavigation[cursor.y][cursor.x]) {
      cursors[cursorIndex] = undefined;
      return;
    } 

    const cursorPos = self.menuNavigation[cursor.y][cursor.x];

    if (cursorPos.btn && cursorPos.btn.enable) return cursorIndex;

    switch (cursorPos) {
      case "#":
        cursors[cursorIndex] = undefined;
        return;
      case "-":
        if (cursor.dir === "right") cursors[cursorIndex].x++;
        else if (cursor.dir === "left") cursors[cursorIndex].x--;
        else {
          cursors.push({dir: "right", x: cursors[cursorIndex].x, y: cursors[cursorIndex].y});
          cursors[cursorIndex].dir = "left";
        }
        break;
      case "|":
        if (cursor.dir === "down") cursors[cursorIndex].y++;
        else if (cursor.dir === "up") cursors[cursorIndex].y--;
        else {
          cursors.push({dir: "down", x: cursors[cursorIndex].x, y: cursors[cursorIndex].y});
          cursors[cursorIndex].dir = "up";
        }
        break;
      case "|-":
        switch (cursor.dir) {
          case "up":
            cursors[cursorIndex].dir = "right";
            cursors[cursorIndex].x++;
            break;
          case "down":
            cursors[cursorIndex].y++;
            break;
          case "left":
            cursors[cursorIndex].dir = "down";
          cursors[cursorIndex].y++;
            break;
          case "right":
            cursors[cursorIndex].x++;
            break;
        }
        break;
      case "-|":
        switch (cursor.dir) {
          case "up":
            cursors[cursorIndex].dir = "left";
            cursors[cursorIndex].x--;
            break;
          case "down":
            cursors[cursorIndex].y++;
            break;
          case "left":
          cursors[cursorIndex].x--;
            break;
          case "right":
            cursors[cursorIndex].dir = "down";
            cursors[cursorIndex].y++;
            break;
        }
        break;
      case "|_":
        switch (cursor.dir) {
          case "up":
            cursors[cursorIndex].y--;
            break;
          case "down":
            cursors[cursorIndex].dir = "right";
            cursors[cursorIndex].x++;
            break;
          case "left":
            cursors[cursorIndex].dir = "up";
          cursors[cursorIndex].y--;
            break;
          case "right":
            cursors[cursorIndex].x++;
            break;
        }
        break;
      case "_|":
        switch (cursor.dir) {
          case "up":
            cursors[cursorIndex].y--;
            break;
          case "down":
            cursors[cursorIndex].dir = "left";
            cursors[cursorIndex].x--;
            break;
          case "left":
          cursors[cursorIndex].x--;
            break;
          case "right":
            cursors[cursorIndex].dir = "up";
            cursors[cursorIndex].y--;
            break;
        }
        break;
    }
  }

  while(cursors.length > 0) {
    const nbCursors = cursors.length;
    for (let i = 0; i < nbCursors; ++i) {
      const result = navigate(i);
      if (result >= 0) {
        const cursor = cursors[result];
        return [cursor.x, cursor.y];
      }
    }
    
    cursors = cursors.filter(Boolean);
  }

  return [undefined, undefined];
};

/**
 * @protected
 * related to tabs navigation
 * you can call it directly to change tabs
 * @memberOf GameScreen
 * @param {Number} dir positive or negative number to change tab relative to current one
 * @param {Number} buttonX new x position of the cursor after tab navigation
 * @param {Number} buttonY new y position of the cursor after tab navigation
 */
GameScreen.prototype._tabsNavigation = function(tabsNavigation, dir, buttonX, buttonY) {
  if (!tabsNavigation.tabs) return;
  const currentTab = tabsNavigation.currentTab;
  const currentIndex = tabsNavigation.tabs.indexOf(currentTab);
  let newIndex = currentIndex + dir;

  if (newIndex < 0) newIndex = 0;
  if (newIndex >= tabsNavigation.tabs.length) newIndex = tabsNavigation.tabs.length - 1;

  if (newIndex === currentIndex) return;
  
  tabsNavigation.navigateTo(tabsNavigation.tabs[newIndex]);
  this.cursorPosX = buttonX;
  this.cursorPosY = buttonY;
  this._updateCursorPos();
};

/**
 * @protected
 * related to menu navigation fired when a key is pressed
 * @param {Boolean} changePosX false if changing Y
 * @param {Number} dir -1 or 1, the cursor movement
 * @param {String} key key pressed, used for nav delay
 * @memberOf GameScreen
 */
GameScreen.prototype._onKeyPress = function(changePosX, dir, key) {
  if (!this.enable || 
    this.currentKeyPressed !== key || 
    this.activeScreen[0] != this.screen) return;

  let tempCursorPosX = this.cursorPosX;
  let tempCursorPosY = this.cursorPosY;
  let oldCursorPosX = this.cursorPosX;
  let oldCursorPosY = this.cursorPosY;

  if (changePosX) {
    tempCursorPosX += dir;
    if (tempCursorPosX < 0) tempCursorPosX = 0;
  } else {
    tempCursorPosY += dir;
    if (tempCursorPosY < 0) tempCursorPosY = 0;
    if (tempCursorPosY >= this.menuNavigation.length)
      tempCursorPosY = this.menuNavigation.length - 1;
  }

  if (tempCursorPosX >= this.menuNavigation[tempCursorPosY].length)
    tempCursorPosX = this.menuNavigation[tempCursorPosY].length - 1;

  const [newCursorPosX, newCursorPosY] = this.calculateCursorPos(oldCursorPosX, oldCursorPosY, tempCursorPosX, tempCursorPosY);
  if (newCursorPosX === undefined || newCursorPosY === undefined) return;
  this.cursorPosX = newCursorPosX;
  this.cursorPosY = newCursorPosY;
  
  this._updateCursorPos();

  const delay = this.useNavShortDelay ? this.menuSettings.navDelayShort : this.menuSettings.navDelayLong

  var self = this;
  setTimeout(function() {
    self._onKeyPress(changePosX, dir, key);
  }, delay);
  
  this.useNavShortDelay = true;
}

/**
 * @protected
 * related to gamepad navigation fired when an axe event occur
 * also onGamepadVAxe and cursorSelect exist too, and if you plan to overwrite one of these functions you should do it for all
 * @memberOf GameScreen
 */
GameScreen.prototype.__storedH = 0;
GameScreen.prototype._onGamepadHAxe = function(val, axe) {
  if (
    !this.enable ||
    (val < this.gamepadSettings.minForceX &&
      val > -this.gamepadSettings.minForceX) ||
    val == undefined ||
    this.currentAxeMoved !== axe || 
    (this.lastInputHaxe && Date.now() - this.lastInputHaxe < 500)
  )
    return;

  if (this.activeScreen[0] != this.screen) {
    return;
  }

  if (val) this.__storedH = val;

  let tempCursorPosX = this.cursorPosX;

  this.lastInputHaxe = Date.now();
  tempCursorPosX += this.__storedH > 0 ? 1 : -1;

  if (tempCursorPosX >= this.menuNavigation[this.cursorPosY].length)
    tempCursorPosX = this.menuNavigation[this.cursorPosY].length - 1;

  if (tempCursorPosX < 0) tempCursorPosX = 0;

  if (this.menuNavigation[this.cursorPosY][tempCursorPosX] == '#') return;

  this.cursorPosX = tempCursorPosX;

  this._updateCursorPos();

  const delay = this.useNavShortDelay ? this.menuSettings.navDelayShort : this.menuSettings.navDelayLong

  var self = this;
  setTimeout(function() {
    self._onGamepadHAxe(val, axe);
  }, delay);

  this.useNavShortDelay = true;

};
GameScreen.prototype.__storedV = 0;
GameScreen.prototype._onGamepadVAxe = function(val, axe) {
  if (
    !this.enable ||
    (val < this.gamepadSettings.minForceY &&
      val > -this.gamepadSettings.minForceY) ||
    val == undefined ||
    this.currentAxeMoved !== axe || 
    (this.lastInputVaxe && Date.now() - this.lastInputVaxe < 500)
  )
    return;

  if (this.activeScreen[0] != this.screen) {
    return;
  }

  if (val) this.__storedV = val;

  this.lastInputVaxe = Date.now();

  let tempCursorPosX = this.cursorPosX;
  let tempCursorPosY = this.cursorPosY;

  tempCursorPosY += this.__storedV > 0 ? 1 : -1;

  if (tempCursorPosY < 0) tempCursorPosY = 0;

  if (tempCursorPosY >= this.menuNavigation.length)
    tempCursorPosY = this.menuNavigation.length - 1;

  if (tempCursorPosX >= this.menuNavigation[tempCursorPosY].length)
    tempCursorPosX = this.menuNavigation[tempCursorPosY].length - 1;

  if (this.menuNavigation[tempCursorPosY].length <= tempCursorPosX)
    tempCursorPosX = 0;

  if (this.menuNavigation[tempCursorPosY][tempCursorPosX] == '#') return;

  this.cursorPosX = tempCursorPosX;
  this.cursorPosY = tempCursorPosY;

  this._updateCursorPos();

  const delay = this.useNavShortDelay ? this.menuSettings.navDelayShort : this.menuSettings.navDelayLong

  var self = this;
  setTimeout(function() {
    self._onGamepadVAxe(val, axe);
  }, delay);
  
  this.useNavShortDelay = true;
};

/**
 * @protected
 * related to menu navigation fired when the confirm button is pressed
 * click the current button using a key
 * @memberOf GameScreen
 */
GameScreen.prototype._cursorSelect = function() {
  if (
    !this.enable || 
    this.activeScreen[0] != this.screen || 
    !this.currentButton
  ) return;

  if (!this.currentButton.btn.onMouseClick)
    this.currentButton.btn.pointerdown();
  else this.currentButton.btn.customonMouseClick();
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
