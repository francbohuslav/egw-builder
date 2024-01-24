using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace EgwBuilderRunner.Helpers
{
    internal static class EnvironmentHelper
    {

        public const string DefaultEnvironmentFile = "env_localhost_A";

        public static bool ContainsNonDefault(IEnumerable<string> list)
        {
            return list != null && list.Any(e => e != "env_localhost");
        }

        public static string FileToLabel(string file)
        {
            try
            {
                if (file == "env_localhost")
                {
                    return "default";
                }
                return Regex.Match(file, "env_localhost_(.+)").Groups[1].Value;
            }
            catch
            {
                return "error";
            }
        }

        public static string LabelToFile(string label)
        {
            if (label == "default" || label == "error")
            {
                return "env_localhost";
            }
            return $"env_localhost_{label}";
        }
    }
}
