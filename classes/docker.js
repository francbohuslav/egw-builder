const core = require("../core");

class Docker {
  /**
   * @param {string} command
   * @returns {Promise<{ code: any, stdOut: string, stdErr: any }>}
   */
  async compose(command) {
    return await this.run(`compose ${command}`);
  }

  /**
   * @param {string} command
   * @returns {Promise<{ code: any, stdOut: string, stdErr: any }>}
   */
  async run(command) {
    return await core.runCommand(`wsl docker ${command}`);
  }
}

module.exports = new Docker();
