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
console.log('DE EVent is', DE.Events);
export default class GameScreen extends DE.Events.Emitter {
  constructor(name, params) {
    super();

    if (!params) params = {};

    if (params.initialize) this.initialize = params.initialize;

    this.name = name || 'gamescreen' + ((Math.random() * 10) >> 0);
    this.scene = new DE.Scene();

    this.camera = new DE.Camera(...params.camera);
    this.camera.scene = this.scene;
    this.persistent = params.persistent || false;

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

    this.oldButton = null;
    this.currentButton = null;
    this.lastDownButton = null;
  }

  initialize() {}

  initializeMenuControls(params) {
    const useGamepad = params.gamepad !== undefined;
    const useKeyboard =
      params.useKeyboard === undefined ? true : params.useKeyboard;

    if (!useGamepad && !useKeyboard) return;

    /***
     * cursor is used for menu navigation
     */

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
      navDelayLong: params.navDelayLong || params.gamepad.navDelayLong || 400,
      navDelayShort:
        params.navDelayShort || params.gamepad.navDelayShort || 300,
    };

    if (params.shortcuts)
      for (var i in params.shortcuts) this.addShortcut(params.shortcuts[i]);

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

    window.addEventListener(
      'mousemove',
      () => {
        this._onMouseMove(this.currentButton);
      },
      { once: true },
    );

    // DE.Event.addEventComponents( this );
  }

  /**
   * @public
   * enable gamepad and keyboard navigation with movements and shortcuts
   * @memberOf GameScreen
   * @param {Array} navigationArray a 2d array with objects name inside, these object should already exist in the screen
   * @param {Object} options configure inputs names, default is: "haxe", "vaxe", "confirm"
   */
  enableMenuNavigation(
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
          else this.currentAxeMoved = undefined;
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
          else this.currentAxeMoved = undefined;
          this._onGamepadVAxe(val, this.currentAxeMoved);
        },
        this,
      );
      DE.Inputs.on(
        'axeStop',
        gamepadOptions.haxe || 'haxe',
        () => {
          this.useNavShortDelay = false;
          this.lastInputHaxe = 0;
        },
        this,
      );
      DE.Inputs.on(
        'axeStop',
        gamepadOptions.vaxe || 'vaxe',
        () => {
          this.useNavShortDelay = false;
          this.lastInputVaxe = 0;
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
          if (this.keyPressTimeout) clearTimeout(this.keyPressTimeout);
        },
        this,
      );
    }

    DE.Inputs.on(
      'keyDown',
      gamepadOptions.confirmInput || 'confirm',
      () => {
        if (!this.currentButton || this.activeScreen[0] != this.screen) return;
        this.currentButton.onMouseDown();
        this.lastDownButton = this.currentButton;
      },
      this,
    );

    DE.Inputs.on(
      'keyUp',
      gamepadOptions.confirmInput || 'confirm',
      () => {
        if (!this.currentButton || this.activeScreen[0] != this.screen) return;

        if (this.lastDownButton !== this.currentButton) {
          if (this.lastDownButton) this.lastDownButton.onMouseUpOutside();
          return;
        }

        this.currentButton.onMouseUp();
        this.currentButton.onMouseClick();
        this.lastDownButton = undefined;
      },
      this,
    );

    if (this.tabsNavigation) {
      DE.Inputs.on(
        'keyDown',
        gamepadOptions.rightTrigger || 'rightTrigger',
        () => {
          if (this.disableShortcuts) return;
          this._tabsNavigation(
            this.tabsNavigation,
            1,
            defaultCursorPosX,
            defaultCursorPosY,
          );
        },
        this,
      );
      DE.Inputs.on(
        'keyDown',
        gamepadOptions.leftTrigger || 'leftTrigger',
        () => {
          if (this.disableShortcuts) return;
          this._tabsNavigation(
            this.tabsNavigation,
            -1,
            defaultCursorPosX,
            defaultCursorPosY,
          );
        },
        this,
      );

      if (this.subTabsNavigation) {
        DE.Inputs.on(
          'keyDown',
          gamepadOptions.rightBumper || 'rightBumper',
          () => {
            if (this.disableShortcuts) return;
            this._tabsNavigation(
              this.subTabsNavigation,
              1,
              defaultCursorPosX,
              defaultCursorPosY,
            );
          },
          this,
        );
        DE.Inputs.on(
          'keyDown',
          gamepadOptions.leftBumper || 'leftBumper',
          () => {
            if (this.disableShortcuts) return;
            this._tabsNavigation(
              this.subTabsNavigation,
              -1,
              defaultCursorPosX,
              defaultCursorPosY,
            );
          },
          this,
        );
      }
    }
  }

  /**
   * @public
   * a shortcut to GameScreen.scene.add
   * @memberOf GameScreen
   * @param {GameObject} GameObject same as Scene.add, call with one or more GameObject or array, or both
   * @example myScreen.add( object1, button, [ tile1, tile2, tile3 ] );
   */
  add() {
    this.scene.add.apply(this.scene, arguments);
  }

  /**
   * @public
   * A middle-ware to avoid repeating this each time
   * Add given buttons inside this.buttons (required for gamepad trigger) and add each of them into the scene
   * @memberOf GameScreen
   * @param {Object} buttons list of buttons, need as JS Object
   */
  addButtons(buttons) {
    for (var i in buttons) {
      if (this.buttons[i] && DE.CONFIG.DEBUG_LEVEL > 0)
        console.warn(
          'You just overwrite an existing button in your screen: ' + this.name,
        );

      this.buttons[i] = buttons[i];
      this.scene.add(buttons[i]);
    }
  }

  /**
   * @public
   * add a shortcut binding
   * @memberOf GameScreen
   * @param {Object} shortcut an object with these properties :
   * {String} name name to identify shortcut
   * {String} inputName input to listen
   * {GameObject} btn button to trigger when input occur
   */
  addShortcut(shortcut) {
    if (shortcut.isAxe) {
      this._shortcuts[shortcut.name] = {
        axeMoved:
          shortcut.btn.onAxeMove &&
          DE.Inputs.on(
            'axeMoved',
            shortcut.inputName,
            (val) => {
              if (
                !this.enable ||
                (!this.persistent && this.activeScreen[0] !== this.screen) ||
                this.disableShortcuts
              )
                return;
              shortcut.btn.onAxeMove(val);
            },
            this,
          ),
        axeStopped:
          shortcut.btn.onAxeStop &&
          DE.Inputs.on(
            'axeStop',
            shortcut.inputName,
            () => {
              if (
                !this.enable ||
                (!this.persistent && this.activeScreen[0] !== this.screen) ||
                this.disableShortcuts
              )
                return;
              shortcut.btn.onAxeStop();
            },
            this,
          ),
      };
    } else {
      this._shortcuts[shortcut.name] = {
        keyDown: DE.Inputs.on(
          'keyDown',
          shortcut.inputName,
          () => {
            if (
              !this.enable ||
              (!this.persistent && this.activeScreen[0] !== this.screen) ||
              this.disableShortcuts
            )
              return;
            shortcut.btn.onMouseDown();
          },
          this,
        ),
        keyUp: DE.Inputs.on(
          'keyUp',
          shortcut.inputName,
          () => {
            if (
              !this.enable ||
              (!this.persistent && this.activeScreen[0] !== this.screen) ||
              this.disableShortcuts
            )
              return;
            const shortcutButton = shortcut.btn;
            shortcutButton.onMouseUp();
            shortcutButton.onMouseClick();
            // TODO this need to be played after onMouseClick animation if it's not currentButton
            setTimeout(() => shortcutButton.onMouseLeave(), 100);
          },
          this,
        ),
      };
    }
  }

  /**
   * @public
   * remove a shortcut binding
   * @memberOf GameScreen
   * @param {String} name shortcut to remove
   */
  removeShortcut(name) {
    delete this._shortcuts[name];
  }

  /**
   * @protected
   * related to menu navigation, update cursor position
   * you can call it directly if you are doing stuff on GameObjects and/or changing your menuNavigation
   * @memberOf GameScreen
   */
  _updateCursorPos() {
    if (!this.menuNavigation[this.cursorPosY])
      return console.warn('cursorPosY is out of the navigation map bounds');
    const btn = this.menuNavigation[this.cursorPosY][this.cursorPosX];
    if (!btn || (!btn.enable && !btn.btn) || (btn.btn && !btn.btn.enable)) {
      return console.warn('bouton not enabled');
    }

    window.addEventListener(
      'mousemove',
      () => {
        this._onMouseMove(this.currentButton);
      },
      { once: true },
    );

    this.oldButton = this.currentButton;
    this.currentButton =
      this.menuNavigation[this.cursorPosY][this.cursorPosX].btn ||
      this.menuNavigation[this.cursorPosY][this.cursorPosX];

    if (this.currentButton.scroll)
      this.currentButton.scroll.container.scrollTo(
        this.currentButton.scroll.x,
        this.currentButton.scroll.y,
      );

    if (this.oldButton && this.oldButton.onMouseLeave)
      this.oldButton.onMouseLeave();
    if (this.currentButton && this.currentButton.onMouseEnter)
      this.currentButton.onMouseEnter();

    return this.currentButton;

    // TODO add cursor offset here based on object collider size + cursor pos (top/bottom/left/right ?) + cursor offsets ?
  }

  /**
   * @protected
   * related to menu navigation, fired when a mouse movement is detected
   * @memberOf GameScreen
   */
  _onMouseMove() {
    if (this.currentButton && this.currentButton.onMouseLeave) {
      this.currentButton.onMouseLeave();
    }
  }

  /**
   * @protected
   * calculate cursor position with pathfinding
   * + is used as multi-directionnals channels
   * | is used as verticals channels
   * - is used as horizontals channels
   * |- is used as up left corner
   * -| is used as up right corner
   * |_ is used as down left corner
   * _| is used as down right corner
   * # is used as a block
   * @memberOf GameScreen
   * @param {Boolean} changePosX false if changing Y
   * @param {Number} cursorMovement -1 or 1, the cursor movement
   */
  calculateCursorPos(changePosX, cursorMovement) {
    let tempCursorPosX = this.cursorPosX;
    let tempCursorPosY = this.cursorPosY;
    let oldCursorPosX = this.cursorPosX;
    let oldCursorPosY = this.cursorPosY;

    if (changePosX) tempCursorPosX += cursorMovement;
    else tempCursorPosY += cursorMovement;

    let dir;
    if (oldCursorPosX < tempCursorPosX) dir = 'right';
    else if (oldCursorPosX > tempCursorPosX) dir = 'left';
    else if (oldCursorPosY < tempCursorPosY) dir = 'down';
    else if (oldCursorPosY > tempCursorPosY) dir = 'up';
    else return [oldCursorPosX, oldCursorPosY];

    const initDir = dir;

    let cursorLooped = false;
    function loopCursor(cursorX, cursorY, menuNavigation) {
      let cursorMoved = true;
      if (cursorY < 0) cursorY = menuNavigation.length - 1;
      else if (cursorY > menuNavigation.length - 1) cursorY = 0;
      else if (cursorX < 0) cursorX = menuNavigation[0].length - 1;
      else if (cursorX > menuNavigation[0].length - 1) cursorX = 0;
      else cursorMoved = false;

      if (cursorMoved) cursorLooped = true;
      return [cursorX, cursorY];
    }

    [tempCursorPosX, tempCursorPosY] = loopCursor(
      tempCursorPosX,
      tempCursorPosY,
      this.menuNavigation,
    );

    const newCursorPos = this.menuNavigation[tempCursorPosY][tempCursorPosX];

    if (newCursorPos === '#') return [oldCursorPosX, oldCursorPosY];

    let cursors = [{ dir: dir, x: tempCursorPosX, y: tempCursorPosY }];

    const self = this;
    function navigate(cursorIndex) {
      const cursor = cursors[cursorIndex];

      [cursor.x, cursor.y] = loopCursor(
        cursor.x,
        cursor.y,
        self.menuNavigation,
      );
      let cursorPos = self.menuNavigation[cursor.y][cursor.x];

      if (
        (initDir === 'up' && cursor.dir === 'down') ||
        (initDir === 'right' && cursor.dir === 'left') ||
        (initDir === 'down' && cursor.dir === 'up') ||
        (initDir === 'left' && cursor.dir === 'right')
      ) {
        cursors[cursorIndex] = undefined;
        return;
      }

      if (cursorPos) {
        const btn = cursorPos.btn || cursorPos;
        if (typeof btn === 'object') {
          if (btn.enable && !btn.locked) return cursorIndex;
          else cursorPos = '+';
        }
      }

      switch (cursorPos) {
        case '#':
          cursors[cursorIndex] = undefined;
          return;
        case '-':
          if (cursor.dir === 'right') cursors[cursorIndex].x++;
          else if (cursor.dir === 'left') cursors[cursorIndex].x--;
          else {
            cursors.push({
              dir: 'right',
              x: cursors[cursorIndex].x + 1,
              y: cursors[cursorIndex].y,
            });
            cursors[cursorIndex].dir = 'left';
            cursors[cursorIndex].x--;
          }
          break;
        case '|':
          if (cursor.dir === 'down') cursors[cursorIndex].y++;
          else if (cursor.dir === 'up') cursors[cursorIndex].y--;
          else {
            cursors.push({
              dir: 'down',
              x: cursors[cursorIndex].x,
              y: cursors[cursorIndex].y + 1,
            });
            cursors[cursorIndex].dir = 'up';
            cursors[cursorIndex].y--;
          }
          break;
        case '|-':
          switch (cursor.dir) {
            case 'up':
              cursors[cursorIndex].dir = 'right';
              cursors[cursorIndex].x++;
              break;
            case 'down':
              cursors[cursorIndex].y++;
              break;
            case 'left':
              cursors[cursorIndex].dir = 'down';
              cursors[cursorIndex].y++;
              break;
            case 'right':
              cursors[cursorIndex].x++;
              break;
          }
          break;
        case '-|':
          switch (cursor.dir) {
            case 'up':
              cursors[cursorIndex].dir = 'left';
              cursors[cursorIndex].x--;
              break;
            case 'down':
              cursors[cursorIndex].y++;
              break;
            case 'left':
              cursors[cursorIndex].x--;
              break;
            case 'right':
              cursors[cursorIndex].dir = 'down';
              cursors[cursorIndex].y++;
              break;
          }
          break;
        case '|_':
          switch (cursor.dir) {
            case 'up':
              cursors[cursorIndex].y--;
              break;
            case 'down':
              cursors[cursorIndex].dir = 'right';
              cursors[cursorIndex].x++;
              break;
            case 'left':
              cursors[cursorIndex].dir = 'up';
              cursors[cursorIndex].y--;
              break;
            case 'right':
              cursors[cursorIndex].x++;
              break;
          }
          break;
        case '_|':
          switch (cursor.dir) {
            case 'up':
              cursors[cursorIndex].y--;
              break;
            case 'down':
              cursors[cursorIndex].dir = 'left';
              cursors[cursorIndex].x--;
              break;
            case 'left':
              cursors[cursorIndex].x--;
              break;
            case 'right':
              cursors[cursorIndex].dir = 'up';
              cursors[cursorIndex].y--;
              break;
          }
          break;
        case '+':
          if (cursor.dir === 'up' || cursor.dir === 'down') {
            cursors.push({
              dir: 'left',
              x: cursors[cursorIndex].x - 1,
              y: cursors[cursorIndex].y,
            });
            cursors.push({
              dir: 'right',
              x: cursors[cursorIndex].x + 1,
              y: cursors[cursorIndex].y,
            });
          } else {
            cursors.push({
              dir: 'up',
              x: cursors[cursorIndex].x,
              y: cursors[cursorIndex].y - 1,
            });
            cursors.push({
              dir: 'down',
              x: cursors[cursorIndex].x,
              y: cursors[cursorIndex].y + 1,
            });
          }
          switch (cursor.dir) {
            case 'up':
              cursors[cursorIndex].y--;
              break;
            case 'down':
              cursors[cursorIndex].y++;
              break;
            case 'left':
              cursors[cursorIndex].x--;
              break;
            case 'right':
              cursors[cursorIndex].x++;
              break;
          }
          break;
      }

      [cursor.x, cursor.y] = loopCursor(
        cursor.x,
        cursor.y,
        self.menuNavigation,
      );

      if (!cursorLooped) {
        if (
          (initDir === 'right' && cursor.x <= oldCursorPosX) ||
          (initDir === 'left' && cursor.x >= oldCursorPosX) ||
          (initDir === 'down' && cursor.y <= oldCursorPosY) ||
          (initDir === 'up' && cursor.y >= oldCursorPosY)
        ) {
          cursors[cursorIndex] = undefined;
          return;
        }
      }
    }

    const maxSteps = this.menuNavigation.length * this.menuNavigation[0].length;
    let step = 0;
    while (cursors.length > 0) {
      if (step >= maxSteps) {
        console.error(
          'Menu navigation of',
          this.screen,
          'have an infinite loop',
          this.menuNavigation,
        );
        return [undefined, undefined];
      }
      const nbCursors = cursors.length;
      step++;
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
  }

  /**
   * @protected
   * related to tabs navigation
   * you can call it directly to change tabs
   * @memberOf GameScreen
   * @param {Number} dir positive or negative number to change tab relative to current one
   * @param {Number} buttonX new x position of the cursor after tab navigation
   * @param {Number} buttonY new y position of the cursor after tab navigation
   */
  _tabsNavigation(tabsNavigation, dir, buttonX, buttonY) {
    if (tabsNavigation.ref) tabsNavigation = tabsNavigation.ref;
    if (this.activeScreen[0] != this.screen || !tabsNavigation.tabs) return;
    const currentIndex = tabsNavigation.currentTabIndex;
    let newIndex = currentIndex + dir;

    if (newIndex < 0) newIndex = tabsNavigation.tabs.length - 1;
    if (newIndex >= tabsNavigation.tabs.length) newIndex = 0;

    if (newIndex === currentIndex) return;

    tabsNavigation.navigateTo(newIndex);
    this.cursorPosX = buttonX;
    this.cursorPosY = buttonY;
    this._updateCursorPos();
  }

  /**
   * @protected
   * related to menu navigation fired when a key is pressed
   * @param {Boolean} changePosX false if changing Y
   * @param {Number} dir -1 or 1, the cursor movement
   * @param {String} key key pressed, used for nav delay
   * @memberOf GameScreen
   */
  _onKeyPress(changePosX, dir, key) {
    if (
      !this.enable ||
      this.currentKeyPressed !== key ||
      this.activeScreen[0] != this.screen
    )
      return;

    const [newCursorPosX, newCursorPosY] = this.calculateCursorPos(
      changePosX,
      dir,
    );
    if (newCursorPosX === undefined || newCursorPosY === undefined) return;
    this.cursorPosX = newCursorPosX;
    this.cursorPosY = newCursorPosY;

    this._updateCursorPos();

    const delay = this.useNavShortDelay
      ? this.menuSettings.navDelayShort
      : this.menuSettings.navDelayLong;

    var self = this;
    this.keyPressTimeout = setTimeout(function() {
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
  _onGamepadHAxe(val, axe) {
    if (
      !this.enable ||
      (val < this.gamepadSettings.minForceX &&
        val > -this.gamepadSettings.minForceX) ||
      val == undefined ||
      this.currentAxeMoved !== axe ||
      (this.lastInputHaxe &&
        Date.now() - this.lastInputHaxe < this.menuSettings.navDelayShort)
    )
      return;

    if (this.activeScreen[0] != this.screen) {
      return;
    }

    this.lastInputHaxe = Date.now();

    const dir = val > 0 ? 1 : -1;
    const [newCursorPosX, newCursorPosY] = this.calculateCursorPos(true, dir);
    if (newCursorPosX === undefined || newCursorPosY === undefined) return;
    this.cursorPosX = newCursorPosX;
    this.cursorPosY = newCursorPosY;

    this._updateCursorPos();

    const delay = this.useNavShortDelay
      ? this.menuSettings.navDelayShort
      : this.menuSettings.navDelayLong;

    var self = this;
    setTimeout(function() {
      self._onGamepadHAxe(val, axe);
    }, delay);

    this.useNavShortDelay = true;
  }
  _onGamepadVAxe(val, axe) {
    if (
      !this.enable ||
      (val < this.gamepadSettings.minForceY &&
        val > -this.gamepadSettings.minForceY) ||
      val == undefined ||
      this.currentAxeMoved !== axe ||
      (this.lastInputVaxe &&
        Date.now() - this.lastInputVaxe < this.menuSettings.navDelayShort)
    )
      return;

    if (this.activeScreen[0] != this.screen) {
      return;
    }

    this.lastInputVaxe = Date.now();

    const dir = val > 0 ? 1 : -1;
    const [newCursorPosX, newCursorPosY] = this.calculateCursorPos(false, dir);
    if (newCursorPosX === undefined || newCursorPosY === undefined) return;
    this.cursorPosX = newCursorPosX;
    this.cursorPosY = newCursorPosY;

    this._updateCursorPos();

    const delay = this.useNavShortDelay
      ? this.menuSettings.navDelayShort
      : this.menuSettings.navDelayLong;

    var self = this;
    setTimeout(function() {
      self._onGamepadVAxe(val, axe);
    }, delay);

    this.useNavShortDelay = true;
  }

  /**
   * @public
   * show this screen (enable camera and scene)
   * @memberOf GameScreen
   * @param {*} args optional arguments bubbled trough events
   * @param {Object} transition used transition, check transition method
   */
  show(args, transition) {
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
  }

  /**
   * @public
   * hide this screen (disable camera and scene)
   * @memberOf GameScreen
   */
  hide(keepSceneActive, transition, silent) {
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
  }

  /**
   * @public
   * TODO
   * @memberOF GameScreen
   */
  transition(data) {
    // data.type
    // data.delay
  }
}

DE.GameScreen = GameScreen;
