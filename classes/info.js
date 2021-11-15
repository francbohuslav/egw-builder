const fs = require("fs");
const core = require("../core");

class Info {
    /**
     *
     * @param {import("..").IProject[]} projects
     * @param {import("..").IProject} MR
     */
    async getInfo(projects, MR) {
        const info = this.getTests(projects, MR);
        await this.getBranches(info, projects);
        console.log(JSON.stringify(info, null, 2));
    }

    getTests(projects, MR) {
        const tests = fs
            .readdirSync(`${MR.folder}/${MR.server}/src/test/jmeter/`)
            .filter((t) => t.match(/^tests_.*\.jmx/))
            .map((t) => t.match(/^tests_(.*)\.jmx/)[1]);
        tests.push("Web");
        return {
            projects: projects.map((p) => ({ code: p.code, supportTests: !!p.testFile, directory: p.folder })),
            additionalTests: tests,
        };
    }

    async getBranches(info) {
        for (const project of info.projects) {
            if (fs.existsSync(project.directory)) {
                await core.inLocationAsync(project.directory, async () => {
                    try {
                        const { stdOut } = await core.runCommand("git branch --show-current", undefined, { disableStdOut: true });
                        project.branch = stdOut.trim();
                    } catch (err) {
                        project.branch = err.stdErr;
                    }
                });
            }
        }
    }
}

module.exports = new Info();
