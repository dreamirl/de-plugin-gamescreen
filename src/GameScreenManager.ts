import DE from '@dreamirl/dreamengine';

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
class GameScreensManager {
  render: DE.Render;
  screens = {};
  history = [];
  historyId = 0;

  currentScreenName: string = '';

  consturctor(render, screens) {
    this.render = render;

    if (screens.length) {
      for (let i = 0; i < screens.length; ++i) {
        this.add(screens[i]);
        screens[i].initialize();
      }
    } else {
      for (let i in screens) {
        this.add(screens[i]);
        screens[i].initialize();
      }
    }
    screens = null;
  }

  /**
   * @public
   * move to previous screen in the history if possible (keep used transition)
   * @memberOf GameScreensManager
   */
  previous() {
    if (this.history.length == 0) return;

    this.historyId = (this.historyId || this.history.length) - 1;
    this.changeScreen(this.history[this.historyId]);
  }

  /**
   * @public
   * move to next screen in the history if possible (keep used transition)
   * @memberOf GameScreensManager
   */
  next() {
    if (this.history.length == 0 || this.historyId >= this.history.length - 1)
      return;

    this.historyId = this.historyId + 1;
    this.changeScreen(this.history[this.historyId]);
  }

  /**
   * @public
   * add a Screen
   * @memberOf GameScreensManager
   * @param {DE.GameScreen} screen
   * @example myGameScreen.add( titleScreen );
   */
  add(screen) {
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
  }

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
  changeScreen(
    screenName,
    args = [],
    keepScenesActive = false,
    transition = {},
  ) {
    for (var i in this.screens) {
      if (i == screenName || this.screens[i].persistent) continue;
      this.screens[i].hide(keepScenesActive, transition);
    }

    this.screens[screenName].show(args, transition);
    this.currentScreenName = screenName;
    DE.emit('changeScreen', screenName);
  }
}

DE.GameScreensManager = GameScreensManager;

export default GameScreensManager;
