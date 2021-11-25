using BoganApp.Core;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;
using static EgwBuilderRunner.InfoStructure;

namespace EgwBuilderRunner
{
    /// <summary>
    /// Interaction logic for DockerController.xaml
    /// </summary>
    public partial class DockerController : UserControl
    {
        private const string KafkaName = "kafka1";
        private DispatcherTimer timer;
        private App myApp;
        private Runner runner;
        private bool isRefreshing;
        private Dictionary<string, Project> allDockerServices = null;

        public DockerController()
        {
            InitializeComponent();
            myApp = (Application.Current as App);
            runner = myApp?.Runner;
        }

        private void UserControl_Loaded(object sender, System.Windows.RoutedEventArgs e)
        {
            timer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(1),
                IsEnabled = true
            };
            timer.Tick += (s, e2) => RefreshUi();
        }


        private async Task RefreshUi()
        {
            if (isRefreshing)
            {
                return;
            }
            try
            {
                isRefreshing = true;
                timer.Interval = TimeSpan.FromSeconds(15);
                if (runner.Info != null)
                {
                    Progress.SetVisible(true);
                    if (allDockerServices == null)
                    {
                        allDockerServices = await runner.GetAllDockerContainers(myApp.EgwFolder);
                        allDockerServices = allDockerServices.Where(kv => !kv.Key.Contains("mongosetup")).ToDictionary(kv => kv.Key, kv => kv.Value);
                    }
                    var runningContainers = await runner.GetRunningDockerContainers(myApp.EgwFolder);

                    var containers = allDockerServices.Keys.Select(name => new DockerContainer
                    {
                        Label = ToLabel(name),
                        Name = name,
                        IsRunning = runningContainers.Contains(name),
                        Background = runningContainers.Contains(name) ? Brushes.Transparent : Brushes.PaleVioletRed,
                        IsEnabled = true,
                        ToolTip = runningContainers.Contains(name) ? "Uncheck to restart. GUI will be freezed a while." : null
                    }).ToList();
                    containers.Add(new DockerContainer
                    {
                        Label = "Kafka",
                        Name = KafkaName,
                        IsRunning = runningContainers.Contains(KafkaName),
                        Background = Brushes.Transparent,
                        IsEnabled = true,
                        ToolTip = runningContainers.Contains(KafkaName) ? "Uncheck to restart. GUI will be freezed a while." : null
                    });
                    Progress.SetVisible(false);
                    ContainersPanel.ItemsSource = containers;
                }
            }
            catch (Exception ex)
            {
                myApp.ShowError(ex);
            }
            finally
            {
                isRefreshing = false;
            }
        }

        private string ToLabel(string name)
        {
            var label = name.Replace("-", " ");
            label = label.Substring(0, 1).ToUpper() + label.Substring(1);
            return label;
        }

        private void StartService(object sender, System.Windows.RoutedEventArgs e)
        {
            if (!(sender is CheckBox checkbox))
            {
                return;
            }
            StartDocker(checkbox, false);
        }

        private async void StartDocker(CheckBox checkbox, bool restart)
        {

            if (!(checkbox.DataContext is DockerContainer container))
            {
                myApp.ShowMessage("Data from checkbox can not be obtained. Contact Bogan if you see this message too often.");
                return;
            }

            checkbox.Content = "Loading ...";
            await Task.Delay(1);
            if (container.Name == KafkaName)
            {
                runner.StartKafka(myApp.EgwFolder);
            }
            else
            {
                runner.StartDocker(myApp.EgwFolder, allDockerServices[container.Name].Directory, container.Name, restart);
            }
        }

        private void UserControl_Unloaded(object sender, System.Windows.RoutedEventArgs e)
        {
            timer?.Stop();
        }

        private async void RestartService(object sender, RoutedEventArgs e)
        {
            if (!(sender is CheckBox checkbox))
            {
                return;
            }
            StartDocker(checkbox, true);
        }
    }

    internal class DockerContainer
    {
        public string Label { get; set; }
        public string Name { get; set; }
        public bool IsRunning { get; set; }
        public Brush Background { get; set; }
        public bool IsEnabled { get; set; }
        public string ToolTip { get; set; }
    }
}
