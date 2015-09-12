'use strict';

let express = require('express');
let compress = require('compression');
let bodyParser = require('body-parser');
let _ = require('lodash');
let logger = require('./decorators/logger');
let responseHelpers = require('./helpers/response');
let errorHelpers = require('./helpers/error');
let jwtHelpers = require('./facades/jwt');
let routes = require('./routes');
let appRoutes = require('./helpers/config').appRoutes;
let injector = require('./decorators/injector');

module.exports = injector(
  function makeServer(dependencies) {
    let app = express();

    //DI - inject dependencies by extending the app.locals with instances
    //received in the makeServer function. This will make them available to
    //middlewares.
    _.assign(app.locals, dependencies);

    loadMiddlewares();

    setupRequestsLimiter();

    setupRoutes();

    logger.info(
      'Started app in %s environment on port %s.',
      process.env.NODE_ENV,
      process.env.NODE_APP_PORT
    );

    function loadMiddlewares() {
      app.use(compress());
      app.use(bodyParser.urlencoded({
        extended: true
      }));
      app.use(bodyParser.json());
      app.use(responseHelpers);
      app.use(
        appRoutes.api.relativePath,
        jwtHelpers.parseAuthenticationToken
      );
    }

    function setupRequestsLimiter() {
      //needs to be called before routes are mounted
      if (app.locals.requestsLimiter && app.locals.redisClient) {
        app.locals.requestsLimiter(app, app.locals.redisClient);
      } else {
        logger.debug('Requests limiter is not available.');
      }
    }

    function setupRoutes() {
      let mainRouter = express.Router();
      let itemRouter = express.Router();
      let tokenRouter = express.Router();
      let adminRouter = express.Router();

      app.use(appRoutes.api.relativePath, mainRouter);
      mountMainRoutes(mainRouter);

      mainRouter.use(appRoutes.item.relativePath, itemRouter);
      mountItemRoutes(itemRouter);

      mainRouter.use(appRoutes.token.relativePath, tokenRouter);
      mountTokenRoutes(tokenRouter);

      app.use(appRoutes.admin.relativePath, adminRouter);
      mountAdminRoutes(adminRouter);

      if (process.env.NODE_ENV === 'development') {
        mountDebugRoutes();
      }

      //catch unhandled errors
      app.use(errorHelpers.uncaughtErrorsHandler);
    }

    function mountMainRoutes(mainRouter) {
      mainRouter.post(appRoutes.login.relativePath, routes.user.login);
      mainRouter.get(
        appRoutes.activate.relativePath + '/:token',
        routes.user.activate
      );
      mainRouter.post(appRoutes.register.relativePath, routes.user.register);
    }

    function mountItemRoutes(itemRouter) {
      itemRouter.post(
        appRoutes.itemAdd.relativePath,
        jwtHelpers.requirePermissions,
        routes.item.add
      );
      itemRouter.delete(
        appRoutes.itemRemove.relativePath,
        jwtHelpers.requirePermissions,
        routes.item.remove
      );
      itemRouter.get(
        appRoutes.itemCheck.relativePath,
        routes.item.check
      );
    }

    function mountTokenRoutes(tokenRouter) {
      tokenRouter.post(
        appRoutes.tokenRefresh.relativePath,
        routes.user.refreshToken
      );
    }

    function mountAdminRoutes(adminRouter) {
      adminRouter.put(
        appRoutes.adminLogger.relativePath,
        routes.admin.checkPermissions, routes.admin.logger
      );
    }

    function mountDebugRoutes() {
      logger.debug('Mounting /debug router');

      let debugRouter = express.Router();
      app.use('/debug', debugRouter);

      debugRouter.get(
        '/ping',
        routes.debug.checkPermissions,
        routes.debug.ping
      );
      debugRouter.get(
        '/exec',
        routes.debug.checkPermissions,
        routes.debug.exec
      );
      debugRouter.get(
        '/redis/flush',
        routes.debug.checkPermissions,
        routes.debug.redisFlush
      );
      debugRouter.get(
        '/db/clear',
        routes.debug.checkPermissions,
        routes.debug.dbClear
      );
    }

    return app;
  }
);
