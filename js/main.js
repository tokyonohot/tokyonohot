class App {
  constructor() {
    this.network = null;
    this.renderer = null;
    this.game = null;
    this.ui = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    console.log('初始化游戏...');

    try {
      this.network = new NetworkManager();
      await this.network.connect();
      console.log('网络连接成功');

      const canvas = document.getElementById('game-canvas');
      this.renderer = new GameRenderer(canvas);

      this.game = new GameManager(this.renderer, this.network);

      this.ui = new UIController(this.network, this.game);

      this.isInitialized = true;
      console.log('游戏初始化完成');

    } catch (error) {
      console.error('初始化失败:', error);
      this.showConnectionError();
    }
  }

  showConnectionError() {
    document.getElementById('connection-status').textContent = '🔴 连接失败';
    
    const errorOverlay = document.createElement('div');
    errorOverlay.className = 'error-overlay';
    errorOverlay.innerHTML = `
      <div class="error-content">
        <h2>连接服务器失败</h2>
        <p>请确保游戏服务器正在运行</p>
        <button onclick="location.reload()" class="neon-btn primary">重新连接</button>
      </div>
    `;
    document.body.appendChild(errorOverlay);
  }

  destroy() {
    if (this.network) {
      this.network.disconnect();
    }
    if (this.renderer) {
      this.renderer.destroy();
    }
    if (this.game) {
      this.game.destroy();
    }
    this.isInitialized = false;
  }
}

let app;

document.addEventListener('DOMContentLoaded', () => {
  app = new App();
  app.init();

  window.addEventListener('beforeunload', () => {
    if (app) {
      app.destroy();
    }
  });
});

window.App = App;
