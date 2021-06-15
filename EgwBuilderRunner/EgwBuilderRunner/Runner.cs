using System.Diagnostics;

namespace EgwBuilderRunner
{
    public class Runner
    {


        public void Run(string builderFolder, Structure structure)
        {
            Process.Start(new ProcessStartInfo()
            {
                FileName = "node",
                Arguments = "index -last",
                WorkingDirectory = builderFolder
            });
        }
    }
}