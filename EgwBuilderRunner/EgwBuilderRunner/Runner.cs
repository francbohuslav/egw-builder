using Newtonsoft.Json;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;

namespace EgwBuilderRunner
{
    public class Runner
    {


        public void Run(string builderFolder)
        {
            Process.Start(new ProcessStartInfo()
            {
                FileName = "cmd",
                Arguments = "/K node index -last",
                WorkingDirectory = builderFolder,
            });
        }

        public string GetVersions(string builderFolder, string egwFolder)
        {
            var process = Process.Start(new ProcessStartInfo()
            {
                FileName = "node",
                Arguments = "index -folder " + egwFolder + " -getversions",
                WorkingDirectory = builderFolder,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true,
            });
            var output = new StringBuilder();
            while (!process.StandardOutput.EndOfStream)
            {
                output.Append(process.StandardOutput.ReadLine() + "\n");
            }
            return output.ToString().Trim();
        }

        public InfoStructure GetInfo(string builderFolder, string egwFolder)
        {
            var process = Process.Start(new ProcessStartInfo()
            {
                FileName = "node",
                Arguments = "index -folder " + egwFolder + " -info",
                WorkingDirectory = builderFolder,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true,
            });
            var output = new StringBuilder();
            while (!process.StandardOutput.EndOfStream)
            {
                output.Append(process.StandardOutput.ReadLine() + "\n");
            }
            return JsonConvert.DeserializeObject<InfoStructure>(output.ToString().Trim());
        }
    }

    public class InfoStructure
    {
        public List<Project> Projects { get; set; }
        public List<string> AdditionalTests { get; set; }

        public bool ContainsProject(string code) => Projects != null && Projects.Any(p => p.Code == code);
        public bool ContainsProjectTest(string code) => Projects != null && Projects.Any(p => p.Code == code && p.SupportTests);

        public class Project
        {
            public string Code { get; set; }
            public bool SupportTests { get; set; }
        }
    }
}