using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows;

namespace EgwBuilderRunner
{
    public class Runner
    {
        public InfoStructure Info { get; private set; }

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

        internal List<string> GetDockerContainers(bool all)
        {
            var process = Process.Start(new ProcessStartInfo()
            {
                FileName = "docker",
                Arguments = "container ls " + (all ? "--all " : "") + "--format='{{.Names}}",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true,
                RedirectStandardError = true
            });
            var output = new StringBuilder();
            while (!process.StandardOutput.EndOfStream)
            {
                output.Append(process.StandardOutput.ReadLine() + "\n");
            }
            while (!process.StandardError.EndOfStream)
            {
                output.Append(process.StandardError.ReadLine() + "\n");
            }
            return output.ToString().Trim().Split('\n').Select(l => l.Trim('\'')).ToList();
        }

        public void RetrieveInfo(string builderFolder, string egwFolder)
        {
            var process = Process.Start(new ProcessStartInfo()
            {
                FileName = "node",
                Arguments = "index -folder " + egwFolder + " -info",
                WorkingDirectory = builderFolder,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true
            });
            var output = new StringBuilder();
            while (!process.StandardOutput.EndOfStream)
            {
                output.Append(process.StandardOutput.ReadLine() + "\n");
            }
            Info = JsonConvert.DeserializeObject<InfoStructure>(output.ToString().Trim());
        }

        internal void StartKafka(string egwFolder)
        {
            if (Info == null)
            {
                (Application.Current as App).ShowMessage("EGW info is not ready yet, try it again after second.", MessageBoxImage.Error);
                return;
            }
            var dataGatewayfolder = Info.Projects.First(p => p.Code == "DG").Directory;
            if (dataGatewayfolder == null)
            {
                (Application.Current as App).ShowMessage("EGW builder does not give directories of project. Update builder.", MessageBoxImage.Error);
                return;
            }
            var process = Process.Start(new ProcessStartInfo()
            {
                FileName = "cmd",
                Arguments = "/C stop-clear-start-kafka.cmd",
                WorkingDirectory = Path.Combine(egwFolder, dataGatewayfolder, "docker\\kafka"),
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true,
            });
            var output = new StringBuilder();
            while (!process.StandardOutput.EndOfStream)
            {
                output.Append(process.StandardOutput.ReadLine() + "\n");
            }
        }

        public string GetDockerAddress()
        {
            var process = Process.Start(new ProcessStartInfo()
            {
                FileName = "powershell",
                Arguments = "(Resolve-DnsName host.docker.internal).IPAddress",
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

        public bool IsDockerAddressOk()
        {
            var process = Process.Start(new ProcessStartInfo()
            {
                FileName = "powershell",
                Arguments = "ipconfig | findstr (Resolve-DnsName host.docker.internal).IPAddress",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true,
            });
            var output = new StringBuilder();
            while (!process.StandardOutput.EndOfStream)
            {
                output.Append(process.StandardOutput.ReadLine() + "\n");
            }
            var text = output.ToString().Trim();
            // Valid return: IPv4 Address. . . . . . . . . . . : 192.168.2.4 
            return Regex.IsMatch(text, "IPv4.*\\d+\\.\\d+\\.\\d+\\.\\d+");
        }
    }

    public class InfoStructure
    {
        public List<Project> Projects { get; set; }
        public List<string> AdditionalTests { get; set; }

        public bool ContainsProject(string code) => Projects != null && Projects.Any(p => p.CodeForComponent == code);
        public bool ContainsProjectTest(string codeOfComponent) => Projects != null && Projects.Any(p => p.CodeForComponent == codeOfComponent && p.SupportTests);

        public string GetBranches()
        {
            var validProjects = Projects.Where(p => p.Branch != null).ToList();
            if (!validProjects.Any())
            {
                return "not supported";
            }
            if (validProjects.All(p => p.Branch == validProjects[0].Branch))
            {
                var line = "All: " + validProjects[0].Branch.Replace("feature/", "");
                return line.Substring(0, Math.Min(47, line.Length));
            }
            var codeLength = validProjects.Select(p => p.Code.Length).Max();
            return string.Join("\n", validProjects.Select(p =>
            {
                var line = p.Code.PadLeft(codeLength, ' ') + ": " + p.Branch.Replace("feature/", "");
                return line.Substring(0, Math.Min(47, line.Length));
            }));
        }
        public class Project
        {
            public string Code { get; set; }
            public string CodeForComponent => Code == "IEC62325" ? "IEC" : Code;
            public bool SupportTests { get; set; }
            public string Directory { get; set; }
            public string Branch { get; set; }
        }
    }
}