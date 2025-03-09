import DE, { GameObject } from '@dreamirl/dreamengine';

// TODO idea Inputs.js
// ajouter une fonction dans les callback, si on a le pointer d'un gameObject sur la callback;
// si le gameobject est !enable on empêche le trigger callback sauf si argument "force" est a
// "true" lors de la déclaration (ddonc ajouter un paramètre dans la déclaration d'events)

// TODO: update engine so it exports CameraParams
type CameraParams = Record<string, any> & {
  scene: DE.Scene;
};

export type GameScreenParams = {
  initialize?: () => void;
  /**
   * @param {Camera} camera
   * @param {number} camera.x
   * @param {number} camera.y
   * @param {number} camera.width
   * @param {number} camera.height
   * @param {CameraParams} camera.params
   * Or deprecated:
   * @param {[number, number, number, number, CameraParams]} camera.array
   */
  camera:
    | {
        x: number;
        y: number;
        width: number;
        height: number;
        params: CameraParams;
      }
    | any[];
  gui: Partial<GameObject> & {
    automatisms?: Array<Array<any>>;
    scaleX?: number;
    scaleY?: number;
  };
  buttons?: Record<string, GameObject>;
  persistent?: boolean;
};

/**
 * @constructor GameScreen
 * @class A plugin to create a complete GameScreen with a Camera and a Scene inside + useful middle-ware
 * It's compatible with the plugin GameScreensManager to handle easily multiple Game Screens
 * GameScreen can also handle for you Gamepad and keyboard navigation though menus and/or objects in your scene, and add shortcuts binded on input
 * @param {String} name - The GameScreen name, useful only for debug and if you use the GameScreensManager
 * @param {Object} params - All parameters are optional
 * @author Inateno
 */
export default class GameScreen extends DE.Events.Emitter {
  name: string;
  scene: DE.Scene;
  camera: DE.Camera;

  persistent = false;
  enable = true;

  gui?: DE.Gui;

  buttons = {};

  oldButton = null;
  currentButton = null;
  lastDownButton = null;

  constructor(name: string, params: Partial<GameScreenParams> = {}) {
    super();

    if (params.initialize) this.initialize = params.initialize;

    this.name = name || 'gamescreen' + ((Math.random() * 10) >> 0);
    this.scene = new DE.Scene(name);

    if (!params.camera) {
      params.camera = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        params: {
          scene: this.scene,
        },
      };
    }

    if (Array.isArray(params.camera)) {
      const [x, y, width, height, camParams] = params.camera;
      this.camera = new DE.Camera(x, y, width, height, camParams);
    } else {
      this.camera = new DE.Camera(
        params.camera.x,
        params.camera.y,
        params.camera.width,
        params.camera.height,
        params.camera.params,
      );
    }

    this.camera.scene = this.scene;
    this.persistent = params.persistent || false;

    if (params.gui) {
      this.gui = new DE.Gui({
        ...params.gui,
        name: name + '-gui',
      });
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

  /**
   * @public
   * a shortcut to GameScreen.scene.add
   * @memberOf GameScreen
   * @param {GameObject} GameObject same as Scene.add, call with one or more GameObject or array, or both
   * @example myScreen.add( object1, button, [ tile1, tile2, tile3 ] );
   */
  add(...objects: GameObject[]) {
    this.scene.add(...objects);
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
   * show this screen (enable camera and scene)
   * @memberOf GameScreen
   * @param {*} args optional arguments bubbled trough events
   * @param {Object} TODO: transition used transition, check transition method
   */
  show(args: any[], transition?: any) {
    DE.emit('gamescreen-show', this.name, args);

    if (Array.isArray(args) && args.length) {
      let argsArr: [string, ...any] = ['show', ...args];
      this.emit.apply(this, argsArr);
    } else {
      let argsArr: [string, ...any[]] = ['show', args];
      this.emit.apply(this, argsArr);
    }

    this.scene.enable = true;
    this.camera.enable = true;
    if (this.gui) {
      this.gui.enable = true;
    }
    this.enable = true;

    if (Array.isArray(args) && args.length) {
      let argsArr: [string, ...any] = ['shown', ...args];
      this.emit.apply(this, argsArr);
    } else {
      let argsArr: [string, ...any[]] = ['shown', args];
      this.emit.apply(this, argsArr);
    }
    DE.emit('gamescreen-shown', this.name, args);
  }

  /**
   * @public
   * hide this screen (disable camera and scene)
   * @memberOf GameScreen
   */
  hide(keepSceneActive = false, transition?: any, silent = false) {
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
   * TODO: transition
   * @memberOF GameScreen
   */
  transition(data?: any) {
    // data.type
    // data.delay
  }
}

// DE.GameScreen = GameScreen;
