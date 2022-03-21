import DE from '@dreamirl/dreamengine/src';

/* TODO
 * fadeOut/In transition
 * moveOut/In transition (top/down and left/right + reverse)
 */

/**
 * @constructor GameScreensManager
 * a middle-ware to manage screens with history and transitions
 * @param {DE.Render} render - the game render where you want to see your Game screens
 * @param {Array} screens - screens to push inside the manager, can be done later
 * @author Inateno
 */
var GameScreensManager = function (render, screens) {
  this.render = render;

  this.screens = {};
  this.history = [];

  if (screens.length) {
    for (var i = 0; i < screens.length; ++i) {
      this.add(screens[i]);
      screens[i].initialize();
    }
  } else {
    for (var i in screens) {
      this.add(screens[i]);
      screens[i].initialize();
    }
  }
  screens = null;
};

GameScreensManager.prototype = {};

/**
 * @public
 * move to previous screen in the history if possible (keep used transition)
 * @memberOf GameScreensManager
 */
GameScreensManager.prototype.previous = function () {
  if (this.history.length == 0) return;

  this.historyId = (this.historyId || this.history.length) - 1;
  this.changeScreen(this.history[this.historyId]);
};

/**
 * @public
 * move to next screen in the history if possible (keep used transition)
 * @memberOf GameScreensManager
 */
GameScreensManager.prototype.next = function () {
  if (this.history.length == 0 || this.historyId >= this.history.length - 1)
    return;

  this.historyId = this.historyId + 1;
  this.changeScreen(this.history[this.historyId]);
};

/**
 * @public
 * add a Screen
 * @memberOf GameScreensManager
 * @param {DE.GameScreen} screen
 * @example myGameScreen.add( titleScreen );
 */
GameScreensManager.prototype.add = function (screen) {
  if (this.screens[screen.name] && DE.CONFIG.DEBUG_LEVEL > 0)
    console.warn(
      'You just overwrite an existing screen in your GameScreensManager',
    );

  this.screens[screen.name] = screen;
  this.screens[screen.name].on('changeScreen', this.changeScreen, this);
  this.render.add(screen.camera);
  if (screen.gui) {
    this.render.add(screen.gui);
  }

  screen.hide(undefined, undefined, true);
};

/**
 * @public
 * change current screen, can be event related or direct call
 * hide all other screens, if you want to show a screen and keep an other one active, do it manually
 * @memberOf GameScreensManager
 * @param {String} screenName screen to show
 * @param {*} args argument passed to the screen shown bubbled trough events
 * @param {Bool} keepScenesActive if you want to keep all other scene active (update won't be shot off)
 * @param {Object} transition describe the transition, check transitions list in DE.GameScreen
 */
GameScreensManager.prototype.changeScreen = function (
  screenName,
  args,
  keepScenesActive,
  transition,
) {
  for (var i in this.screens) {
    if (i == screenName || this.screens[i].persistent) continue;
    this.screens[i].hide(keepScenesActive, transition);
  }

  this.screens[screenName].show(args, transition);
  DE.emit('changeScreen', screenName);
};

DE.GameScreensManager = GameScreensManager;

export default GameScreensManager;
