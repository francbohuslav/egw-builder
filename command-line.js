const core = require("./core");

class CommandLine {
  /**
   *
   * @param {string[]} pars arguments of aaplication
   */
  constructor(pars) {
    this.interactively = true;
    this.unitTests = false;
    this.isMerged = false;

    /** Output human readable text */
    this.enableConsole = true;
    while (pars.length > 0) {
      const ar = pars.shift().toLowerCase();
      if (ar == "-last") {
        this.last = true;
        continue;
      }
      if (ar == "-folder") {
        /**
         * @type {string | undefined}
         */
        this.folder = pars.shift();
        continue;
      }
      if (ar == "-version") {
        this.version = pars.shift().replace(/^"/, "").replace(/"$/, "");
        this.interactively = false;
        continue;
      }
      //TODO: BF: casem lze smazat az budou mit vsichni aktualni Runner
      if (ar == "-getversions") {
        this.getVersions = true;
        this.interactively = false;
        this.enableConsole = false;
        continue;
      }
      if (ar == "-info") {
        this.getInfo = true;
        this.interactively = false;
        this.enableConsole = false;
        continue;
      }
      if (ar == "-logasyncjob") {
        this.logAsyncJob = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-ismerged") {
        this.isMerged = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-environmentfile") {
        this.environmentFile = pars.shift();
        continue;
      }
      if (ar == "-clear") {
        this.clear = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-build") {
        this.buildDG = true;
        this.buildMR = true;
        this.buildFTP = true;
        this.buildEMAIL = true;
        this.buildECP = true;
        this.buildIEC62325 = true;
        this.buildAS24 = true;
        this.buildIEC60870 = true;
        this.buildACER = true;
        this.buildKAFKA = true;
        // merged app is not intentionally
        this.interactively = false;
        continue;
      }
      if (ar == "-builddg") {
        this.buildDG = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-buildmr") {
        this.buildMR = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-buildftp") {
        this.buildFTP = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-buildemail") {
        this.buildEMAIL = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-buildecp") {
        this.buildECP = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-buildiec62325") {
        this.buildIEC62325 = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-buildas24") {
        this.buildAS24 = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-buildiec60870") {
        this.buildIEC60870 = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-buildacer") {
        this.buildACER = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-buildkafka") {
        this.buildKAFKA = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-buildmerged") {
        this.buildMERGED = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-unittests") {
        this.unitTests = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-metamodel") {
        this.metamodel = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-results") {
        this.onlyShowResults = true;
        this.interactively = false;
        continue;
      }

      if (ar == "-run") {
        this.runDG = true;
        this.runMR = true;
        this.runFTP = true;
        this.runEMAIL = true;
        this.runECP = true;
        this.runIEC62325 = true;
        this.runAS24 = true;
        this.runIEC60870 = true;
        this.runACER = true;
        this.runKAFKA = true;
        // merged app is not intentionally
        this.interactively = false;
        continue;
      }
      if (ar == "-rundg") {
        this.runDG = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-runmr") {
        this.runMR = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-runftp") {
        this.runFTP = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-runemail") {
        this.runEMAIL = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-runecp") {
        this.runECP = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-runiec62325") {
        this.runIEC62325 = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-runas24") {
        this.runAS24 = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-runiec60870") {
        this.runIEC60870 = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-runacer") {
        this.runACER = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-runkafka") {
        this.runKAFKA = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-runmerged") {
        this.runMERGED = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-runinsequence") {
        this.runInSequence = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-messagebroker") {
        this.messageBroker = pars.shift();
        this.interactively = false;
        continue;
      }

      if (ar == "-init") {
        this.initDG = true;
        this.initMR = true;
        this.initFTP = true;
        this.initEMAIL = true;
        this.initECP = true;
        this.initIEC62325 = true;
        this.initAS24 = true;
        this.initIEC60870 = true;
        this.initACER = true;
        this.initKAFKA = true;
        this.initASYNC = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-initdg") {
        this.initDG = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-initmr") {
        this.initMR = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-initftp") {
        this.initFTP = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-initemail") {
        this.initEMAIL = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-initecp") {
        this.initECP = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-initiec62325") {
        this.initIEC62325 = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-initas24") {
        this.initAS24 = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-initiec60870") {
        this.initIEC60870 = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-initacer") {
        this.initACER = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-initkafka") {
        this.initKAFKA = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-initasync") {
        this.initASYNC = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-uid") {
        this.uid = pars.shift();
        this.interactively = false;
        continue;
      }

      if (ar == "-test") {
        this.testDG = true;
        this.testMR = true;
        this.testFTP = true;
        this.testEMAIL = true;
        this.testECP = true;
        this.testIEC62325 = true;
        this.testAS24 = true;
        this.testIEC60870 = true;
        this.testACER = true;
        this.testKAFKA = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-testdg") {
        this.testDG = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-testmr") {
        this.testMR = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-testftp") {
        this.testFTP = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-testemail") {
        this.testEMAIL = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-testecp") {
        this.testECP = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-testiec62325") {
        this.testIEC62325 = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-testas24") {
        this.testAS24 = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-testiec60870") {
        this.testIEC60870 = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-testacer") {
        this.testACER = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-testkafka") {
        this.testKAFKA = true;
        this.interactively = false;
        continue;
      }
      if (ar == "-tests") {
        this.additionalTests = pars.shift().split(",");
        this.interactively = false;
        continue;
      }
    }
  }

  getCmdValue(property, question) {
    const value = this[property];
    if ((value !== null && value !== undefined) || !this.interactively) {
      console.log(question + " " + (value ? "yes" : "no"));
      return value;
    }
    const answer = core.ask(question);
    this[property] = answer;
    return answer;
  }
}

module.exports = CommandLine;
