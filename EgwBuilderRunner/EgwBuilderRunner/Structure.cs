using Newtonsoft.Json;

namespace EgwBuilderRunner
{
    public class Structure
    {
        [JsonProperty("folder")]
        public string Folder { get; set; }

        [JsonProperty("version")]
        public string Version { get; set; }

        [JsonProperty("clear")]
        public bool Clear { get; set; }

        [JsonProperty("metamodel")]
        public bool Metamodel { get; set; }

        [JsonProperty("build")]
        public bool Build => BuildDG || BuildMR || BuildFTP || BuildEMAIL || BuildECP || BuildIEC62325 || BuildAS24;

        [JsonProperty("buildDG")]
        public bool BuildDG { get; set; }

        [JsonProperty("buildMR")]
        public bool BuildMR { get; set; }

        [JsonProperty("buildFTP")]
        public bool BuildFTP { get; set; }

        [JsonProperty("buildEMAIL")]
        public bool BuildEMAIL { get; set; }

        [JsonProperty("buildECP")]
        public bool BuildECP { get; set; }

        [JsonProperty("buildIEC62325")]
        public bool BuildIEC62325 { get; set; }

        [JsonProperty("buildAS24")]
        public bool BuildAS24 { get; set; }

        [JsonProperty("unitTests")]
        public bool UnitTests { get; set; }

        [JsonProperty("run")]
        public bool Run => RunDG || RunMR || RunFTP || RunEMAIL || RunECP || RunIEC62325 || RunAS24;

        [JsonProperty("runDG")]
        public bool RunDG { get; set; }

        [JsonProperty("runMR")]
        public bool RunMR { get; set; }

        [JsonProperty("runFTP")]
        public bool RunFTP { get; set; }

        [JsonProperty("runEMAIL")]
        public bool RunEMAIL { get; set; }

        [JsonProperty("runECP")]
        public bool RunECP { get; set; }

        [JsonProperty("runIEC62325")]
        public bool RunIEC62325 { get; set; }

        [JsonProperty("runAS24")]
        public bool RunAS24 { get; set; }

        [JsonProperty("runInSequence")]
        public bool RunInSequence { get; set; }

        [JsonProperty("init")]
        public bool Init => InitDG || InitMR || InitFTP || InitEMAIL || InitECP || InitIEC62325 || InitAS24;

        [JsonProperty("initDG")]
        public bool InitDG { get; set; }

        [JsonProperty("initMR")]
        public bool InitMR { get; set; }

        [JsonProperty("initFTP")]
        public bool InitFTP { get; set; }

        [JsonProperty("initEMAIL")]
        public bool InitEMAIL { get; set; }

        [JsonProperty("initECP")]
        public bool InitECP { get; set; }

        [JsonProperty("initIEC62325")]
        public bool InitIEC62325 { get; set; }

        [JsonProperty("initAS24")]
        public bool InitAS24 { get; set; }

        [JsonProperty("initASYNC")]
        public bool InitASYNC { get; set; }

        [JsonProperty("uid")]
        public string Uid { get; set; }

        [JsonProperty("tests")]
        public bool Tests => TestDG || TestMR || TestFTP || TestEMAIL || TestECP || TestIEC62325 || TestAS24;

        [JsonProperty("testDG")]
        public bool TestDG { get; set; }

        [JsonProperty("testMR")]
        public bool TestMR { get; set; }

        [JsonProperty("testFTP")]
        public bool TestFTP { get; set; }

        [JsonProperty("testEMAIL")]
        public bool TestEMAIL { get; set; }

        [JsonProperty("testECP")]
        public bool TestECP { get; set; }

        [JsonProperty("testIEC62325")]
        public bool TestIEC62325 { get; set; }

        [JsonProperty("testAS24")]
        public bool TestAS24 { get; set; }


    }
}
