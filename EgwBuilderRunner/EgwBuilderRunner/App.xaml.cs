using BoganApp.Applications;
using BoganApp.Storages;
using System;
using System.Windows;

namespace EgwBuilderRunner
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : BaseApplication
    {
        public new ThisAppStorage AppStorage { get { return (ThisAppStorage)base.AppStorage; } }

        public string Folder { get; set; }

        protected override AppSettings GetAppSettings()
        {
            return new AppSettings("EgwBuilderRunner", "EgwBuilderRunner", "EgwBuilderRunner", new Version("1.0"));
        }

        protected override AppStorage GetAppStorage()
        {
            return new ThisAppStorage(new RegistryStorager("EgwBuilderRunner", RegistryStorageType.CURRENT_USER));
        }

        private void Application_Startup(object sender, StartupEventArgs e)
        {
            Folder = e.Args.Length > 0 ? e.Args[0] : ExeDir;
        }

    }
}
