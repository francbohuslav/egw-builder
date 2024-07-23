using EgwBuilderRunner.Helpers;
using System;
using System.Threading.Tasks;

namespace EgwBuilderRunner
{
    internal class HealthChecker
    {
        public async Task<string> GetHealth()
        {
            try
            {
                var text = await ProcessRunner.RunProcessAsync("netsh", "interface portproxy show all");
                var isOk = text.Contains("10090") && text.Contains("4444");
                /*
                Listen on ipv4:             Connect to ipv4:

                Address         Port        Address         Port
                --------------- ----------  --------------- ----------
                0.0.0.0         10090       172.20.141.80   10090
                0.0.0.0         4444        172.20.141.80   4444
                 */
                return isOk ? "" : "AsyncJob (10090) or MockServer (4444) missing in port forwarding\n" + text;
            }
            catch (Exception ex)
            {
                return ex.Message;
            }
        }
    }
}
