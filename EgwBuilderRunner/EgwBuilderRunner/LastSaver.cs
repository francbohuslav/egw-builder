using Newtonsoft.Json;
using System.IO;

namespace EgwBuilderRunner
{
    public class LastSaver
    {
        private readonly string builderFolder;

        public LastSaver(string builderFolder)
        {
            this.builderFolder = builderFolder;
        }

        private string LastFilePath => Path.Combine(builderFolder, "last.json");
        public void Save(Structure structure)
        {
            File.WriteAllText(LastFilePath, JsonConvert.SerializeObject(structure));
        }

        public Structure Load()
        {
            if (!File.Exists(LastFilePath))
            {
                return null;
            }
            return JsonConvert.DeserializeObject<Structure>(File.ReadAllText(LastFilePath));
        }
    }
}
