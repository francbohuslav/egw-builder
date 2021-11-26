using EgwBuilderRunner.Services;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows;
using static EgwBuilderRunner.InfoStructure;

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

        internal async Task<Dictionary<string, Project>> GetAllDockerContainers(string egwFolder)
        {
            var allServices = new Dictionary<string, Project>();
            var dockerService = new DockerService();
            foreach (var project in Info.Projects)
            {
                var services = await dockerService.GetDockerServices(Path.Combine(egwFolder, project.Directory, "docker", "egw-tests"));
                foreach (var service in services.Where(s => !string.IsNullOrWhiteSpace(s)))
                {
                    allServices.Add(service, project);
                }
            }
            return allServices;
        }


        internal async Task<List<string>> GetRunningDockerContainers(string egwFolder)
        {
            var dockerService = new DockerService();
            var services = await dockerService.GetRunningDockerContainers(Path.Combine(egwFolder, Info.Projects.First(p => p.Code == "DG").Directory, "docker", "egw-tests"));
            services = services.Where(s => !string.IsNullOrWhiteSpace(s)).ToList();

            var dg = Info.Projects.First(p => p.Code == "DG");
            var kafkaServices = await dockerService.GetRunningDockerContainers(Path.Combine(egwFolder, dg.Directory, "docker", "kafka"));
            foreach (var service in kafkaServices.Where(s => !string.IsNullOrWhiteSpace(s)))
            {
                services.Add(service);
            }
            return services;
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

        internal void StartDocker(string egwFolder, string directory, string name, bool restart)
        {
            if (Info == null)
            {
                (Application.Current as App).ShowMessage("EGW info is not ready yet, try it again after second.", MessageBoxImage.Error);
                return;
            }

            if (directory == null)
            {
                (Application.Current as App).ShowMessage("EGW builder does not give directories of project. Update builder.", MessageBoxImage.Error);
                return;
            }
            var process = Process.Start(new ProcessStartInfo()
            {
                FileName = "docker-compose",
                Arguments = (restart ? "restart " : "up -d ") + name,
                WorkingDirectory = Path.Combine(egwFolder, directory, "docker\\egw-tests"),
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true,
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

        public string MessageBroker { get; set; }

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