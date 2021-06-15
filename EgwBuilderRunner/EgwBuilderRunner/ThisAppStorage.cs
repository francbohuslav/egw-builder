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
    }
}
