using System;
using System.Diagnostics;
using System.Text;
using System.Threading.Tasks;

namespace EgwBuilderRunner.Helpers
{
    internal static class ProcessRunner
    {

        public static async Task<string> RunProcessAsync(string filename, string arguments = "", string workingDirectory = "")
        {
            var startInfo = new ProcessStartInfo()
            {
                FileName = filename,
                Arguments = arguments,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true,
                RedirectStandardError = true
            };
            if (!string.IsNullOrWhiteSpace(workingDirectory))
            {
                startInfo.WorkingDirectory = workingDirectory;
            }
            using (var process = new Process
            {
                StartInfo = startInfo,
                EnableRaisingEvents = true
            })
            {
                return await RunProcessAsync(process).ConfigureAwait(false);
            }
        }

        public static Task<string> RunProcessAsync(Process process)
        {
            var tcs = new TaskCompletionSource<string>();
            var output = new StringBuilder();
            process.Exited += (s, ea) =>
            {
                tcs.SetResult(output.ToString().Trim());
            };
            process.OutputDataReceived += (s, ea) =>
            {
                if (ea.Data != null)
                {
                    output.Append(ea.Data + "\n");
                }
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
