# Changelog

## [0.2.1](https://github.com/AbnerHS/FinancesFullstack/compare/v0.2.0...v0.2.1) (2026-03-25)


### Bug Fixes

* prevent revalidate CI on release ([#19](https://github.com/AbnerHS/FinancesFullstack/issues/19)) ([2a3f005](https://github.com/AbnerHS/FinancesFullstack/commit/2a3f0050972fed0be042a498c61adf412220f7c5))

## [0.2.0](https://github.com/AbnerHS/FinancesFullstack/compare/v0.1.0...v0.2.0) (2026-03-25)


### Features

* add payment tracking fields to transactions ([#16](https://github.com/AbnerHS/FinancesFullstack/issues/16)) ([d89fdca](https://github.com/AbnerHS/FinancesFullstack/commit/d89fdca1834a4033809f67d87574550cfc2019f0))

## [0.1.0](https://github.com/AbnerHS/FinancesFullstack/compare/v0.0.1...v0.1.0) (2026-03-25)


### Features

* add ApiPatchResponses annotation and update controllers for partial updates ([d2e2457](https://github.com/AbnerHS/FinancesFullstack/commit/d2e2457d8e989d9a3e4274761ce7b532eb535695))
* add endpoints to retrieve CreditCardInvoices by Financial Period ([7bb0bc1](https://github.com/AbnerHS/FinancesFullstack/commit/7bb0bc15653d8188daa19abbd939700b64726866))
* add financial summary endpoints and DTOs for reports ([c661122](https://github.com/AbnerHS/FinancesFullstack/commit/c661122ef17f180c0b7b20726ef2cd5a33ef30bd))
* add HATEOAS to FinancialPlan and FinancialPeriod ([a7a8aa0](https://github.com/AbnerHS/FinancesFullstack/commit/a7a8aa03741a0acaa3393ed53d080b30437bd697))
* add HATEOAS to Transaction and change children endpoints: api/periods/plan/{planId} =&gt; api/plan/{planId}/periods ([0e43be4](https://github.com/AbnerHS/FinancesFullstack/commit/0e43be4ef05eef97ff5f453b2e6ecd61db45c4f3))
* backend support to google oauth2, frontend integration with google login ([0c5dd61](https://github.com/AbnerHS/FinancesFullstack/commit/0c5dd6118e0314dbf7e7197a887f8c15b5c069e7))
* BadCredentialsException handler and Authentication Response includes User ([653c7ad](https://github.com/AbnerHS/FinancesFullstack/commit/653c7adcf52407db62ed92051a1482133ad9e075))
* change plan to support multiple partners, generate invite link ([6a07295](https://github.com/AbnerHS/FinancesFullstack/commit/6a07295c2f20e09876343a803a04db3d609ffbff))
* CI/CD and semantic versions with release-please ([e879d7e](https://github.com/AbnerHS/FinancesFullstack/commit/e879d7e79cd9b733d0df681a6770b1b8fbf56950))
* config add ip to whitelist ([b14e4fe](https://github.com/AbnerHS/FinancesFullstack/commit/b14e4feb042d5e08b62776d4ea339a064edaf71c))
* config CORS allowed origin patterns ([250548e](https://github.com/AbnerHS/FinancesFullstack/commit/250548ee501dd700ce2933a29f150d0760fc0e3e))
* credit card invoices endpoints and apply swagger docs on controllers ([a5b1151](https://github.com/AbnerHS/FinancesFullstack/commit/a5b1151759737399d3f409936ce88d98309eb5f9))
* Docker Componse, Oracle DB initial setup, models, DTOs, Projection ([1b735c9](https://github.com/AbnerHS/FinancesFullstack/commit/1b735c956bcfc4549b6cbb6062adb38592cd56da))
* docker development live build ([506f330](https://github.com/AbnerHS/FinancesFullstack/commit/506f330ca66542a5cc7e16ac5121d5dd0d2da497))
* docker volumes and method PATCH for plans, periods and transactions ([6104e3f](https://github.com/AbnerHS/FinancesFullstack/commit/6104e3f457aa3f1330392b4710bc207a9c601a2f))
* docker-compose production ([f3112e9](https://github.com/AbnerHS/FinancesFullstack/commit/f3112e9f453953adfcba5b56a425ab274b7bd1ed))
* env example Google OAuth ([aac447d](https://github.com/AbnerHS/FinancesFullstack/commit/aac447dbf784f77c1ded1668a54f9e407f76c82b))
* field order in transaction to sort in frontend ([715fd0e](https://github.com/AbnerHS/FinancesFullstack/commit/715fd0e9fb65d8bb078237e82191cdc0ec2a5a6b))
* implement authentication endpoints and JWT service ([8e0e051](https://github.com/AbnerHS/FinancesFullstack/commit/8e0e0519978730d270cf2921c6d4120688a8f468))
* implement refresh token ([a222ba2](https://github.com/AbnerHS/FinancesFullstack/commit/a222ba258b361b9d3fce140c40a047613216e981))
* implement semantic versions with release-please ([e879d7e](https://github.com/AbnerHS/FinancesFullstack/commit/e879d7e79cd9b733d0df681a6770b1b8fbf56950))
* implement semantic versions with release-please ([104aeb4](https://github.com/AbnerHS/FinancesFullstack/commit/104aeb481f26919f3b543644e485870fe3be492a))
* initial CI/CD with github actions ([40effa1](https://github.com/AbnerHS/FinancesFullstack/commit/40effa1a0fbfb16220da11e56af73c4a89978bf7))
* install and configure OpenAPI Swagger ([bf7736b](https://github.com/AbnerHS/FinancesFullstack/commit/bf7736ba7561356d6f51d255e613377b87e1c463))
* method PATCH in transactions to do partial update ([764c8c6](https://github.com/AbnerHS/FinancesFullstack/commit/764c8c627ce1ca4f68dc9e4bf964ab02eca2b874))
* partner can see plan credit cards and create invoices ([c9b5d21](https://github.com/AbnerHS/FinancesFullstack/commit/c9b5d211f71d64a506e19cca0154030a310a55be))
* refresh token works only in cookies ([e8c0452](https://github.com/AbnerHS/FinancesFullstack/commit/e8c0452930cac99ec3273c8fb68db4f60b89fb71))
* Transaction relationship with CreditCardInvoice, CreditCard endpoints ([ebfe129](https://github.com/AbnerHS/FinancesFullstack/commit/ebfe1292ebf37a83dc7bd407fee85e074323f5f7))
* transaction tag string changed to TransactionCategory entity ([6221a48](https://github.com/AbnerHS/FinancesFullstack/commit/6221a480e269389a726c32e5b30244ad2f784dcd))
* user logged with google can't change email/password ([9d0049c](https://github.com/AbnerHS/FinancesFullstack/commit/9d0049c12e4ba2f622c4ab70c36a47eff0c0338f))


### Bug Fixes

* don't let browser translate pages ([4d96a0d](https://github.com/AbnerHS/FinancesFullstack/commit/4d96a0deb9458a8f7437839aafcfbc4bdc75611a))
* mappers unmapped target properties ([7df3958](https://github.com/AbnerHS/FinancesFullstack/commit/7df3958c90c11eae1eda2c894e6856d27b5671a6))
* remove unused import ([5902c43](https://github.com/AbnerHS/FinancesFullstack/commit/5902c436115c57677dc097cf5f333755cb9dbc06))
* spring security /actuator/health permit all ([a911ac5](https://github.com/AbnerHS/FinancesFullstack/commit/a911ac5aea59793c21695649e2f0ccad988d82be))
* spring security /actuator/health permit all ([48a0b5d](https://github.com/AbnerHS/FinancesFullstack/commit/48a0b5d595d0cbfe176a091eb2faee2e03bbf921))
* update Transaction set creditCardInvoice null ([bdcbfcd](https://github.com/AbnerHS/FinancesFullstack/commit/bdcbfcd13bc6ceb1c87c7634f95d0222c39183d2))
