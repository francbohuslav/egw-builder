using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace EgwBuilderRunner.Helpers
{
    internal static class EnvironmentHelper
    {
        public static bool ContainsNonDefault(IEnumerable<string> list)
        {
            return list != null && list.Any(e => e != "env_localhost_builder");
        }

        public static string FileToLabel(string file)
        {
            try
            {
                if (file == "env_localhost_builder")
                {
                    return "default";
                }
                return Regex.Match(file, "env_localhost_builder_(.+)").Groups[1].Value;
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
                return "env_localhost_builder";
            }
            return $"env_localhost_builder_{label}";
        }
    }
}
