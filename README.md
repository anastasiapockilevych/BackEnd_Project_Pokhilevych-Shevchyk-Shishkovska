# Pochilevych, Shevchuk and Shishkovska BackEnd Project

## Initial Machine Setup

1. **Install NodeJS 22**

## Get Started

1. **Install** `npm install`
2. **Configure connection** [config file]((https://github.com/anastasiapockilevych/BackEnd_Project_Pokhilevych-Shevchyk-Shishkovska/blob/main/.env))
2. **Run the app** `npm run start`

## Documentation
Swagger docs can be found at:
- http://localhost:3000/api-docs/

### Linting

Code linters: [eslint](https://eslint.org/) with pluggable [Prettier](https://github.com/jlongster/prettier) configs.

- run: `npm run lint`
- fix JS errors: `lint:fix`
  Eslint configuration file: [here](.eslintrc.json)

### Testing

We use Jest for unit tests. Test file for .js should be named as .test.js and be placed along with code file.

- run unit tests: `npm run test`
- run tests with coverage: `npm run test:cover`

Refer to this [document](https://jestjs.io/docs/en/api) for more details.
