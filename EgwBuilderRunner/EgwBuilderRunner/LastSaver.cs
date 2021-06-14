using Newtonsoft.Json;
using System.IO;

namespace EgwBuilderRunner
{
    public class LastSaver
    {
        private readonly string folder;

        public LastSaver(string folder)
        {
            this.folder = folder;
        }

        private string LastFilePath => Path.Combine(folder, "last.json");
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
