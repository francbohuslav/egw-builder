const fs = require("fs");
const path = require("path");
const CommandLine = require("./command-line");
const core = require("./core");

class Last {
  constructor() {
    this.path = path.join(__dirname, "last.json");
  }
  /**
   * @param {CommandLine} cmd
   */
  saveSettings(cmd) {
    core.writeTextFile(this.path, JSON.stringify(cmd, null, 4));
  }

  /**
   * @returns {CommandLine}
   */
  loadSettings() {
    if (!fs.existsSync(this.path)) {
      return null;
    }
    const content = core.readTextFile(this.path);
    /** @type {CommandLine} */
    const cmd = Object.setPrototypeOf(JSON.parse(content), CommandLine.prototype);
    cmd.interactively = false;
    cmd.last = true;
    cmd.environmentFile = cmd.environmentFile || "env_localhost_builder";
    return cmd;
  }
}
module.exports = new Last();
