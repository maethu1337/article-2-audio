module.exports = {
  apps: [{
    name: 'article-2-audio',
    script: './server.js',
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '100M',
    env: {
      NODE_ENV: 'production',
      PORT: 3007
    }
  }]
};
