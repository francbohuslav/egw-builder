using EgwBuilderRunner.Helpers;
using EgwBuilderRunner.Services;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Text;
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
                Arguments = "/C start /MAX cmd /K node index -last",
                WorkingDirectory = builderFolder,
            });
        }

        public Task<string> GetVersions(string builderFolder, string egwFolder)
        {
            return ProcessRunner.RunProcessAsync("node", "index -folder " + egwFolder + " -getversions", builderFolder);
        }

        internal async Task<Dictionary<string, Project>> GetAllDockerContainers(string egwFolder)
        {
            var allServices = new Dictionary<string, Project>();
            var dockerService = new DockerService();
            foreach (var project in Info.Projects)
            {
                if (project.Directory == null)
                {
                    continue;
                }
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
            var dgDir = Info.Projects.First(p => p.Code == "DG").Directory;
            if (dgDir == null)
            {
                return new List<string>();
            }
            var services = await dockerService.GetRunningDockerContainers(Path.Combine(egwFolder, dgDir, "docker", "egw-tests"));
            services = services.Where(s => !string.IsNullOrWhiteSpace(s)).ToList();

            var dg = Info.Projects.First(p => p.Code == "DG");
            var kafkaServices = await dockerService.GetRunningDockerContainers(Path.Combine(egwFolder, dg.Directory, "docker", "kafka"));
            foreach (var service in kafkaServices.Where(s => !string.IsNullOrWhiteSpace(s)))
            {
                services.Add(service);
            }
            return services;
        }

        public async Task RetrieveInfo(string builderFolder, string egwFolder)
        {
            var output = await ProcessRunner.RunProcessAsync("node", "index -folder " + egwFolder + " -info", builderFolder);

            try
            {
                Info = JsonConvert.DeserializeObject<InfoStructure>(output);
            }
            catch
            {
                throw new Exception("Can not parse: " + output.ToString().Trim());
            }
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


        public async Task<bool> IsDockerAddressOk()
        {
            try
            {
                var localIpList = GetAllLocalIpList();
                var task = Task.Run(() =>
                {
                    var entry = Dns.GetHostEntry("host.docker.internal");
                    if (entry.AddressList.Length > 0)
                    {
                        return entry.AddressList[0].ToString();
                    }
                    return null;
                });
                if (await Task.WhenAny(task, Task.Delay(TimeSpan.FromSeconds(2.0))) == task)
                {
                    return localIpList.Contains(task.Result);
                }
                else
                {
                    return false;
                }
            }
            catch
            {
                return false;
            }
        }

        private string[] GetAllLocalIpList()
        {
            var addresses = new HashSet<string>();
            addresses.Add("127.0.0.1");
            foreach (var netInterface in NetworkInterface.GetAllNetworkInterfaces())
            {
                var ipProps = netInterface.GetIPProperties();
                foreach (var addr in ipProps.UnicastAddresses)
                {
                    addresses.Add(addr.Address.ToString());
                }
            }
            return addresses.OrderBy(s => s).ToArray();
        }

    }

    public class InfoStructure
    {
        public List<Project> Projects { get; set; }

        public List<string> AdditionalTests { get; set; }

        public List<string> EnvironmentFiles { get; set; }
        public List<string> GetEnvironments() => EnvironmentFiles?.Select(EnvironmentHelper.FileToLabel).ToList();

        public bool IsEnvironmentsShowable => EnvironmentHelper.ContainsNonDefault(EnvironmentFiles);

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
            public string CodeForComponent
            {
                get
                {
                    if (Code == "IEC62325")
                    {
                        return "IEC623";
                    }
                    if (Code == "IEC60870")
                    {
                        return "IEC608";
                    }
                    return Code;
                }
            }
            public bool SupportTests { get; set; }
            public string Directory { get; set; }
            public string Branch { get; set; }
        }
    }
}