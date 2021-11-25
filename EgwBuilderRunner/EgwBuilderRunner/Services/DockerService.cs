using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EgwBuilderRunner.Services
{
    internal class DockerService
    {
        internal async Task<List<string>> GetDockerServices(string dockerFolder)
        {
            var dockerComposePath = Path.Combine(dockerFolder, "docker-compose.yml");
            if (!File.Exists(dockerComposePath))
            {
                return new List<string>();
            }
            using (var process = new Process
            {
                StartInfo = new ProcessStartInfo()
                {
                    FileName = "docker-compose",
                    Arguments = "config --services",
                    WorkingDirectory = dockerFolder,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    CreateNoWindow = true,
                    RedirectStandardError = true
                },
                EnableRaisingEvents = true
            })
            {
                var output = await RunProcessAsync(process).ConfigureAwait(false);
                return output.Split('\n').ToList();
            }
        }

        internal async Task<List<string>> GetRunningDockerContainers(string egwFolder)
        {
            using (var process = new Process
            {
                StartInfo = new ProcessStartInfo()
                {
                    FileName = "docker",
                    Arguments = "compose ps --services --status running",
                    WorkingDirectory = egwFolder,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    CreateNoWindow = true,
                    RedirectStandardError = true
                },
                EnableRaisingEvents = true
            })
            {
                var output = await RunProcessAsync(process).ConfigureAwait(false);
                return output.Split('\n').ToList();
            }
        }

        private Task<string> RunProcessAsync(Process process)
        {
            var tcs = new TaskCompletionSource<string>();
            var output = new StringBuilder();
            process.Exited += (s, ea) =>
            {
                tcs.SetResult(output.ToString());
            };
            process.OutputDataReceived += (s, ea) =>
            {
                output.Append(ea.Data + "\n");
            };
            process.ErrorDataReceived += (s, ea) => output.Append(ea.Data);

            bool started = process.Start();
            if (!started)
            {
                //you may allow for the process to be re-used (started = false) 
                //but I'm not sure about the guarantees of the Exited event in such a case
                throw new InvalidOperationException("Could not start process: " + process);
            }

            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            return tcs.Task;
        }
    }
}
