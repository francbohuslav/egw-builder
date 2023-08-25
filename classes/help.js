class Help {
  printTroubleShootHelp() {
    const message =
      "Go to page \x1b[32mhttps://uuapp.plus4u.net/uu-bookkit-maing01/c250fdbbe5af44c28cdbdd050c5febf4/book/page?code=troubleshooting\x1b[0m and search how to solve that.";
    console.log("\x1b[1m\x1b[46m\x1b[37m" + "=".repeat(message.length) + "\x1b[0m\x1b[1m");
    console.log("");
    console.log("\x1b[1m\x1b[31mDamned, ERROR!!!\x1b[0m\x1b[1m");
    console.log(message);
    console.log("");
    console.log("\x1b[1m\x1b[46m\x1b[37m" + "=".repeat(message.length) + "\x1b[0m");
    console.log("");
  }
}

module.exports = new Help();
