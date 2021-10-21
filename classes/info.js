const fs = require("fs");

class Info {
    /**
     *
     * @param {import("..").IProject[]} projects
     * @param {import("..").IProject} MR
     */
    getInfo(projects, MR) {
        const tests = fs
            .readdirSync(`${MR.folder}/${MR.server}/src/test/jmeter/`)
            .filter((t) => t.match(/^tests_.*\.jmx/))
            .map((t) => t.match(/^tests_(.*)\.jmx/)[1]);
        tests.push("Web");
        console.log(
            JSON.stringify(
                {
                    projects: projects.map((p) => ({ code: p.code, supportTests: !!p.testFile })),
                    additionalTests: tests,
                },
                null,
                2
            )
        );
    }
}

module.exports = new Info();
