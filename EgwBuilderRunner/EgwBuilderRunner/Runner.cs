using System.Diagnostics;

namespace EgwBuilderRunner
{
    public class Runner
    {


        public void Run(string builderFolder, Structure structure)
        {
            Process.Start(new ProcessStartInfo()
            {
                FileName = "cmd",
                Arguments = "/K node index -last",
                WorkingDirectory = builderFolder,
            });
        }
    }
}