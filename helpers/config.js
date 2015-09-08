var hostname = process.env.NODE_APP_HOSTNAME || require('os').hostname();

var appRoutes = {};

appRoutes.api = {
  relativePath: '/api',
  fullPath: '/api'
};
appRoutes.login = {
  relativePath: '/login',
  fullPath: appRoutes.api.fullPath + '/login'
};
appRoutes.profile = {
  relativePath: '/profile',
  fullPath: appRoutes.api.fullPath + '/profile'
};
appRoutes.register = {
  relativePath: '/register',
  fullPath: appRoutes.api.fullPath + '/register'
};
appRoutes.activate = {
  relativePath: '/activate',
  fullPath: appRoutes.api.fullPath + '/activate'
};
appRoutes.token = {
  relativePath: '/token',
  fullPath: appRoutes.api.fullPath + '/token'
};
appRoutes.tokenRefresh = {
  relativePath: '/refresh',
  fullPath: appRoutes.token.fullPath + '/refresh'
};
appRoutes.item = {
  relativePath: '/item',
  fullPath: appRoutes.api.fullPath + '/item'
};
appRoutes.itemAdd = {
  relativePath: '/add',
  fullPath: appRoutes.item.fullPath + '/add'
};
appRoutes.itemRemove = {
  relativePath: '/remove',
  fullPath: appRoutes.item.fullPath + '/remove'
};
appRoutes.itemCheck = {
  relativePath: '/check',
  fullPath: appRoutes.item.fullPath + '/check'
};
appRoutes.admin = {
  relativePath: '/admin',
  fullPath: '/admin'
};
appRoutes.adminLogger = {
  relativePath: '/logger',
  fullPath: appRoutes.admin.fullPath + '/logger'
};

module.exports = {
  appRoutes: appRoutes,
  hostname: hostname
};
