#API for tracking product prices

**This is a work in progress.**

The final application will be a web app which allows users to be notified about
product prices from any website.
It will scrap the pages, grab the price and notify the user by email when the
price is smaller than a certain value set by the user.

**The current project is the API component.**

The system is based on the following components:
- NodeJS API with the following sub-components:
  - Redis
  - MongoDB
  - Graylog2
- Web client using React
- Website implemented in NodeJS most likely using:
  - Express
  - Jade
  - Stylus
- Docker (docker-compose.yml in the root is currently only used for development and it's using a default unsecure configuration.)

The purpose of this project is to experiment with and improve the knowledge of technologies like:
Docker, JWT tokens, React, NodeJS, Graylog, MongoDB, npm, Redis, middlewares, design patterns in NodeJS, TDD/unit/integration testing etc. 

##A few implementation details

- JWT tokens are used for authentification and permissions.
- Mocha/Istanbul/Chai(expect) for testing/code coverage/assertions.
- Bcrypt to encrypt sensitive data before storing in the database.
- The implementation makes heavy use of promises using bluebird library.

All the environment variables used by the app are specified in the `config.env.sample` file. This file should be renamed/duplicated to `config.env` and the application will default to the values in this file if the variables are not already present in system's environment variables.

licensed under [The MIT License](http://www.opensource.org/licenses/mit-license.php).
