using System;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;

namespace EgwBuilderRunner
{
    /// <summary>
    /// Interaction logic for DockerController.xaml
    /// </summary>
    public partial class DockerController : UserControl
    {
        private const string KafkaName = "kafka-kafka1-1";
        private DispatcherTimer timer;
        private App myApp;
        private Runner runner;

        public DockerController()
        {
            InitializeComponent();
            myApp = (Application.Current as App);
            runner = myApp.Runner;
        }

        private void UserControl_Loaded(object sender, System.Windows.RoutedEventArgs e)
        {
            RefreshUi();
            timer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(15),
                IsEnabled = true
            };
            timer.Tick += (s, e2) => RefreshUi();
        }


        private void RefreshUi()
        {
            var allContainers = runner.GetDockerContainers(true).Where(name => name.Contains("egw-tests") && !name.Contains("mongosetup"));
            var runningContainers = runner.GetDockerContainers(false);

            var containers = allContainers.Select(name => new DockerContainer
            {
                Label = ToLabel(name),
                Name = name,
                IsRunning = runningContainers.Contains(name),
                Background = runningContainers.Contains(name) ? Brushes.Transparent : Brushes.PaleVioletRed,
                IsEnabled = false
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
            ContainersPanel.ItemsSource = containers;
        }

        private string ToLabel(string name)
        {
            var label = Regex.Replace(name, "^egw-tests-", "").Replace("-1", "").Replace("-", " ");
            label = label.Substring(0, 1).ToUpper() + label.Substring(1);
            return label;
        }

        private async void StartService(object sender, System.Windows.RoutedEventArgs e)
        {
            if (!(sender is CheckBox checkbox))
            {
                return;
            }
            var container = checkbox.DataContext as DockerContainer;
            if (container == null)
            {
                myApp.ShowMessage("Data from checkbox can not be obtained. Contact Bogan if you see this message too often.");
                return;
            }
            if (container.Name == KafkaName)
            {
                checkbox.Content = "Loading ...";
                await Task.Delay(1);
                runner.StartKafka(myApp.EgwFolder);
            }
            else
            {
                (Application.Current as App).ShowMessage("Unknown service " + container.Name);
            }
        }

        private void UserControl_Unloaded(object sender, System.Windows.RoutedEventArgs e)
        {
            timer?.Stop();
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
