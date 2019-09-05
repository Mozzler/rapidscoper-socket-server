module.exports = {
  models: {
    team: 'team',
    project: 'project',
    userProject: 'userProject',
    userTeam: 'userTeam',
    section: 'section',
    story: 'story',
    dictionary: 'dictionary',
    user: 'app.user',
    userInfo: 'userInfo',
    owner: 'app.user',
    projectShare: 'projectShare',
    comment: 'comment'
  },
  server_models: {
    'app.user': 'app\\models\\User',
    'project': 'app\\models\\Project',
    'userProject': 'app\\models\\UserProject',
    'userTeam': 'app\\models\\UserTeam',
    'team': 'app\\models\\Team',
    'section': 'app\\models\\Section',
    'story': 'app\\models\\Story',
    'dictionary': 'app\\models\\Dictionary',
    'userInfo': 'app\\models\\UserInfo',
    'projectShare': 'app\\models\\ProjectShare',
    'comment': 'app\\models\\Comment'
  },
  routes: {
    user: 'user',
    stream: '_metadata/streams'
  }
};
