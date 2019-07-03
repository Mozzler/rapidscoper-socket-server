module.exports = {
  models: {
    user: 'app.user',
    team: 'team',
    project: 'project',
    userProject: 'userProject',
    userTeam: 'userTeam',
    section: 'section'
  },
  server_models: {
    'app.user': 'app\\models\\User',
    'project': 'app\\models\\Project',
    'userProject': 'app\\models\\UserProject',
    'userTeam': 'app\\models\\UserTeam',
    'team': 'app\\models\\Team',
    'section': 'app\\models\\Section'
  },
  routes: {
    user: 'user',
    stream: '_metadata/streams'
  }
};
