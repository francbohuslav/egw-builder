using System.Diagnostics;
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
                CreateNoWindow = true
            });
            var output = new StringBuilder();
            while (!process.StandardOutput.EndOfStream)
            {
                output.Append(process.StandardOutput.ReadLine() + "\n");
            }
            return output.ToString().Trim();
        }
    }
}