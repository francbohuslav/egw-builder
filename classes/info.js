class Info {
    /**
     *
     * @param {import("..").IProject[]} projects
     */
    getInfo(projects) {
        console.log(
            JSON.stringify(
                {
                    projects: projects.map((p) => ({ code: p.code, supportTests: !!p.testFile })),
                    additionalTests: [],
                },
                null,
                2
            )
        );
    }
}

module.exports = new Info();
