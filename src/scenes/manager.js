// ── менеджер сцен ──
window.CV = window.CV || {};
CV.SceneManager = class {
  constructor(app) {
    this.app = app;
    this.defs = {};       // name → factory(container, app, params)
    this.current = null;
    this.currentName = null;
    this.root = new PIXI.Container();
    app.stage.addChild(this.root);
    this.curtain = CV.makeCurtain(app);
    app.stage.addChild(this.curtain);
    app.ticker.add(dt => {
      if (this.current && this.current.update) this.current.update(app.ticker.deltaMS / 1000);
    });
  }
  register(name, factory) { this.defs[name] = factory; }
  async switchTo(name, params = {}) {
    await this.curtain.transition(async () => {
      if (this.current) {
        this.root.removeChild(this.current.view);
        if (this.current.exit) this.current.exit();
      }
      const view = new PIXI.Container();
      const scene = this.defs[name](view, this.app, params);
      scene.view = view;
      this.root.addChild(view);
      this.current = scene;
      this.currentName = name;
      if (scene.enter) await scene.enter(params);
    });
  }
};
