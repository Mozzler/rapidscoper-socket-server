module.exports = {
  models: {
    user: 'app.user',
    team: 'team',
    project: 'project',
  },
  server_models: {
    'app.user': 'mozzler\\auth\\models\\User',
  },
  routes: {
    user: 'user',
    stream: '_metadata/stream'
  }
};
