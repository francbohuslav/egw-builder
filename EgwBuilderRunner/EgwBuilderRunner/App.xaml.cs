using BoganApp.Applications;
using BoganApp.Storages;
using System;
using System.IO;
using System.Windows;

namespace EgwBuilderRunner
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : BaseApplication
    {
        public new ThisAppStorage AppStorage => base.AppStorage as ThisAppStorage;

        public string BuilderFolder { get; set; }
        public string EgwFolder { get; set; }

        public Runner Runner { get; set; } = new Runner();


        protected override AppSettings GetAppSettings()
        {
            return new AppSettings("EgwBuilderRunner", "EgwBuilderRunner", "EgwBuilderRunner", new Version("1.8"));
        }

        protected override AppStorage GetAppStorage()
        {
            return new ThisAppStorage(new RegistryStorager("EgwBuilderRunner", RegistryStorageType.CURRENT_USER));
        }

        private void Application_Startup(object sender, StartupEventArgs e)
        {
            if (e.Args.Length > 1)
            {
                BuilderFolder = Path.GetFullPath(e.Args[0]);
                EgwFolder = Path.GetFullPath(e.Args[1]);
            }
        }

    }
}
