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
        public new ThisAppStorage AppStorage { get { return (ThisAppStorage)base.AppStorage; } }

        public string BuilderFolder { get; set; }
        public string EgwFolder { get; set; }

        protected override AppSettings GetAppSettings()
        {
            return new AppSettings("EgwBuilderRunner", "EgwBuilderRunner", "EgwBuilderRunner", new Version("1.1"));
        }

        protected override AppStorage GetAppStorage()
        {
            return new ThisAppStorage(new RegistryStorager("EgwBuilderRunner", RegistryStorageType.CURRENT_USER));
        }

        private void Application_Startup(object sender, StartupEventArgs e)
        {
            if (e.Args.Length < 2)
            {
                ShowMessage("App needs two arguments. Path to builder and path to EGW folder.", MessageBoxImage.Error);
                ShowMessage(string.Join(" ", e.Args));
                Environment.Exit(1);
            }
            else
            {
                BuilderFolder = Path.GetFullPath(e.Args[0]);
                EgwFolder = Path.GetFullPath(e.Args[1]);
            }
        }

    }
}
