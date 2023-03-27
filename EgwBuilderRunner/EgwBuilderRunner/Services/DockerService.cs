using EgwBuilderRunner.Helpers;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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
            var output = await ProcessRunner.RunProcessAsync("docker-compose", "config --services", dockerFolder);
            return output.Split('\n').ToList();

        }

        internal async Task<List<string>> GetRunningDockerContainers(string egwFolder)
        {
            var output = await ProcessRunner.RunProcessAsync("docker", "compose ps --services --status running", egwFolder);
            return output.Split('\n').ToList();
        }


    }
}
