# EGW builder

Cleaner, builder, initializer, tester of EnergyGateway

Home page: <https://github.com/francbohuslav/egw-builder>  
Skype: [cis_franc](skype:cis_franc), E-mail: [bohuslav.franc@unicornuniverse.eu](bohuslav.franc@unicornuniverse.eu)

---

## Preparation

[Node.js](https://nodejs.org/) must be installed. Sorry, but for now it works only on Windows.  
Builder was fully tested with EGW version 1.1. Sprint should work also, but maybe `init` and `test*` will not work. Support for sprint will be done soon.

Builder supports this EGW projects, which are hosted in UU Codebase GIT repository:

-   Gateway
-   Message Registry
-   FTP endpoint
-   E-mail endpoint
-   ECP endpoint

Default folder structure:

-   `builder` - repository of this builder
-   `uu_energygateway_datagatewayg01` - repository of Gateway
-   `uu_energygateway_messageregistryg01` - repository of Message Regsitry
-   `uu_energygateway_ftpendpointg01` - repository of FTP endpoint
-   `uu_energygateway_emailendpointg01` - repository of E-mail endpoint
-   `uu_energygateway_ecpendpointg01` - repository of ECP endpoint

Custom folder is supported. Look into `config.default.js` file and follow instructions.

---

## Instalation

1. Clone GIT repository https://github.com/francbohuslav/egw-builder.git.
2. Install node modules by command `npm i` from folder of builder.

---

## Usage

Run command `node index`.

### Options

    -folder <name>    - Name of folder where all projects are stored, mandatory.
    -version <ver>    - Version to be stored in build.gradle, uucloud-developmnet.json, ...etc.
    -clear            - Shutdown and remove docker containers.
    -build            - Builds apps by gradle.
    -metamodel        - Regenerates metamodel for Business Territory.
    -runDG            - Runs Datagateway
    -runMR            - Runs Message Registry
    -runFTP           - Runs FTP endpoint
    -runEMAIL         - Runs E-mail endpoint
    -runECP           - Runs ECP endpoint
    -init <your-uid>  - Runs init commands of all apps (creates workspace, sets permissions)
    -testMR           - Tests Message Registry by jmeter
    -testFTP          - Tests FTP endpoint by jmeter
    -testEMAIL        - Tests E-mail endpoint by jmeter

You will be asked interactively if there is none of options (except folder) used on command line.

---

## Common scenarios

Below there are some common scenarios.

**Clean, build, run and init** - for the first time, or if you want to start from scratch.

    node index -folder ../sprint -clear -build -runDG -runMR -init 12-8835-1

**Run tests** - should be called before pushing of your changes to git.

    node index -folder ../sprint -runDG -runMR -runFTP -runEMAIL
    // wait for applications are ready
    node index -folder ../sprint -testMR -testFTP -testEMAIL

**uuCloud or Nexus** - prepare everything to deploy app.

    node index -folder ../sprint -version 1.1.5 -clear -build -metamodel -runDG -runMR -runFTP -runEMAIL -runECP -init 12-8835-1 -testMR -testFTP -testEMAIL
