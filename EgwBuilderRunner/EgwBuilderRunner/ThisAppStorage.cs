using BoganApp.Storages;

namespace EgwBuilderRunner
{
    public class ThisAppStorage : AppStorage
    {
        public ThisAppStorage(IStorager storager) : base(storager)
        {
        }

        public string YourUid
        {
            get { return storager.GetValue("YourUid", "12-8835-1"); }
            set { storager.SetValue("YourUid", value); }
        }

        public bool RunInSequence
        {
            get { return storager.GetValue("RunInSequence", "0") == "1"; }
            set { storager.SetValue("RunInSequence", value ? "1" : "0"); }
        }

        public bool CloseApplicationAfterRun
        {
            get { return storager.GetValue("CloseApplicationAfterRun", "1") == "1"; }
            set { storager.SetValue("CloseApplicationAfterRun", value ? "1" : "0"); }
        }

        public bool ShowDockerContainers
        {
            get { return storager.GetValue("ShowDockerContainers", "1") == "1"; }
            set { storager.SetValue("ShowDockerContainers", value ? "1" : "0"); }
        }
    }
}
