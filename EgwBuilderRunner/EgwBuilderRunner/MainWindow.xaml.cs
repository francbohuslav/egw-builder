using BoganApp.Core;
using BoganApp.Windows;
using EgwBuilderRunner.Helpers;
using IWshRuntimeLibrary;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Env = System.Environment;

namespace EgwBuilderRunner
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    [WindowSettings(EnablePositionSaving = true)]
    public partial class MainWindow : BaseWindow<App>
    {
        private LastSaver lastSaver;

        private List<AdditionalTestModel> additionalTestModels = new List<AdditionalTestModel>();

        public MainWindow()
        {
            InitializeComponent();
            Title = MyApp.AppSettings.ApplicationNameWithVersion;
            DockerInternalAddressWarningIsOk.SetVisible(false);
            EnvironmentContainer.Visibility = Visibility.Hidden; // Not to shift controlls after showing

            Clear_Click(null, null);
            lastSaver = new LastSaver(MyApp.BuilderFolder);

            YourUID.Text = MyApp.AppStorage.YourUid;
            RunInSequence.IsChecked = MyApp.AppStorage.RunInSequence;
            CloseApplicationAfterRun.IsChecked = MyApp.AppStorage.CloseApplicationAfterRun;
            UpdateStatusBar();
            UpdateAfterChecked(null, null);
        }

        private async void BaseWindow_Loaded(object sender, RoutedEventArgs e)
        {
            if (MyApp.EgwFolder == null)
            {
                await Task.Delay(1);
                Wizzard();
            }
            else
            {
                Console.Text = "Loading versions...";
                await Task.Delay(1);
                try
                {
                    var versionTask = MyApp.Runner.GetVersions(MyApp.BuilderFolder, MyApp.EgwFolder);
                    var infoTask = MyApp.Runner.RetrieveInfo(MyApp.BuilderFolder, MyApp.EgwFolder);
                    var isDockerAddressOkTask = MyApp.Runner.IsDockerAddressOk(); // Waiting is below
                    await Task.WhenAll(versionTask, infoTask);
                    var version = await versionTask;
                    Console.Text = version + "\n\nBranches\n" + MyApp.Runner.Info.GetBranches();
                    var info = MyApp.Runner.Info;
                    additionalTestModels = info.AdditionalTests.Select(test => new AdditionalTestModel(test)).ToList();
                    AdditionalTests.ItemsSource = additionalTestModels;
                    AdditionalTestsContainer.SetVisible(additionalTestModels.Count > 0);
                    if (!info.ContainsProject("IEC623"))
                    {
                        IEC623.IsEnabled = false;
                        ForProject("IEC623", ch => ch.IsEnabled = false);
                    }
                    if (!info.ContainsProject("AS24"))
                    {
                        AS24.IsEnabled = false;
                        ForProject("AS24", ch => ch.IsEnabled = false);
                    }
                    if (!info.ContainsProject("IEC608"))
                    {
                        IEC608.IsEnabled = false;
                        ForProject("IEC608", ch => ch.IsEnabled = false);
                    }
                    if (!info.ContainsProject("ACER"))
                    {
                        ACER.IsEnabled = false;
                        ForProject("ACER", ch => ch.IsEnabled = false);
                    }
                    foreach (var project in info.Projects)
                    {
                        if (!project.SupportTests && FindName("Test_" + project.CodeForComponent) != null)
                        {
                            (FindName("Test_" + project.CodeForComponent) as CheckBox).IsEnabled = false;
                        }
                    }
                    MessageBroker.Text = info.MessageBroker;
                    if (string.IsNullOrWhiteSpace(info.MessageBroker))
                    {
                        MessageBrokerLabel.Foreground = Brushes.Red;
                        MessageBrokerLabel.ToolTip = "Subapps have different brokers. You can set same broker for all subApps here.";
                    }
                    if (info.IsEnvironmentsShowable)
                    {
                        EnvironmentContainer.SetVisible(true);
                        Environment.Items.Clear();
                        Environment.ItemsSource = info.GetEnvironments();
                        Environment.SelectedIndex = 0;
                    }
                    if (await isDockerAddressOkTask)
                    {
                        DockerInternalAddressWarning.SetVisible(false);
                        DockerInternalAddressWarningIsOk.SetVisible(true);
                    }
                    else
                    {
                        DockerInternalAddressWarning.Text = "WARNING: ip address host.docker.internal is binded to " + await MyApp.Runner.GetDockerAddress()
                            + ", which is not address of this computer (ipconfig). Restart Docker Desktop from context menu of Docker Desktop icon in system tray. " +
                            "Otherwise AsyncJob and other services will not work correctly.";

                    }
                }
                catch (Exception ex)
                {
                    Console.Text = "Error: " + ex.Message + "\n" + ex.StackTrace;
                }
            }
        }

        private void Wizzard()
        {
            var result = MessageBox.Show("Hi. You must give me paths to your builder and EGW project. Can I run wizzard to create start link?",
                    MyApp.AppSettings.ApplicationNameWithVersion,
                    MessageBoxButton.OKCancel,
                    MessageBoxImage.Question,
                    MessageBoxResult.OK
                    );
            if (result != MessageBoxResult.OK)
            {
                Env.Exit(1);
            }

            string builderFolder = null;
            using (var folderDialog = new System.Windows.Forms.FolderBrowserDialog())
            {
                MyApp.ShowMessage("Step 1: Give me EGW builder folder.");
                folderDialog.ShowNewFolderButton = false;
                var folderResult = folderDialog.ShowDialog();
                if (folderResult != System.Windows.Forms.DialogResult.OK)
                {
                    Env.Exit(2);
                }
                builderFolder = folderDialog.SelectedPath;

            }
            string egwFolder = null;
            using (var folderDialog = new System.Windows.Forms.FolderBrowserDialog())
            {
                MyApp.ShowMessage("Step 2: Give me folder with EGW subApps.");
                folderDialog.ShowNewFolderButton = false;
                var folderResult = folderDialog.ShowDialog();
                if (folderResult != System.Windows.Forms.DialogResult.OK)
                {
                    Env.Exit(2);
                }
                egwFolder = folderDialog.SelectedPath;
            }

            var fileName = PromptWindow.Show("Step 3: Name of lnk file", "EGW builder", "Enter filename without extension");

            var shell = new WshShell();
            string shortcutAddress = Path.Combine(egwFolder, fileName) + ".lnk";
            IWshShortcut shortcut = (IWshShortcut)shell.CreateShortcut(shortcutAddress);
            shortcut.TargetPath = System.Reflection.Assembly.GetExecutingAssembly().Location;
            shortcut.WorkingDirectory = MyApp.ExeDir;
            shortcut.IconLocation = System.Reflection.Assembly.GetExecutingAssembly().Location + ",0";
            shortcut.Arguments = $"\"{builderFolder}\" \"{egwFolder}\"";
            shortcut.Save();

            MyApp.ShowMessage("Link created. I am going to open target folder and you can use it. Bye.");
            Process.Start(egwFolder);
            Env.Exit(0);
        }

        private void UpdateStatusBar()
        {
            Folders.Text = "EGW:     " + MyApp.EgwFolder + "\nBuilder: " + MyApp.BuilderFolder;
        }

        private void DG_Click(object sender, RoutedEventArgs e)
        {
            SetProject("DG", Build_DG.IsChecked != true);
        }


        private void MR_Click(object sender, RoutedEventArgs e)
        {
            SetProject("MR", Build_MR.IsChecked != true);
        }

        private void FTP_Click(object sender, RoutedEventArgs e)
        {
            SetProject("FTP", Build_FTP.IsChecked != true);
        }

        private void EMAIL_Click(object sender, RoutedEventArgs e)
        {
            SetProject("EMAIL", Build_EMAIL.IsChecked != true);
        }

        private void ECP_Click(object sender, RoutedEventArgs e)
        {
            SetProject("ECP", Build_ECP.IsChecked != true);
        }

        private void IEC623_Click(object sender, RoutedEventArgs e)
        {
            SetProject("IEC623", Build_IEC623.IsChecked != true);
        }

        private void AS24_Click(object sender, RoutedEventArgs e)
        {
            SetProject("AS24", Build_AS24.IsChecked != true);
        }

        private void IEC608_Click(object sender, RoutedEventArgs e)
        {
            SetProject("IEC608", Build_IEC608.IsChecked != true);
        }

        private void ACER_Click(object sender, RoutedEventArgs e)
        {
            SetProject("ACER", Build_ACER.IsChecked != true);
        }


        private void SetProject(string project, bool on)
        {

            (FindName("Build_" + project) as CheckBox).IsChecked = on;
            (FindName("Run_" + project) as CheckBox).IsChecked = on;
            (FindName("Init_" + project) as CheckBox).IsChecked = on;
            if (FindName("Test_" + project) != null)
            {
                (FindName("Test_" + project) as CheckBox).IsChecked = on;
            }
        }

        private void ForProject(string project, Action<CheckBox> action)
        {
            action(FindName("Build_" + project) as CheckBox);
            action(FindName("Run_" + project) as CheckBox);
            action(FindName("Init_" + project) as CheckBox);
            action(FindName("Test_" + project) as CheckBox);
        }

        private void Button_Click(object sender, RoutedEventArgs e)
        {
            SetOperation("Build", Build_DG.IsChecked != true);
        }

        private void Button_Click_1(object sender, RoutedEventArgs e)
        {
            SetOperation("Run", Run_DG.IsChecked != true);
        }

        private void Button_Click_2(object sender, RoutedEventArgs e)
        {
            SetOperation("Init", Init_DG.IsChecked != true);
        }

        private void Button_Click_3(object sender, RoutedEventArgs e)
        {
            SetOperation("Test", Test_DG.IsChecked != true);
        }

        private void SetOperation(string operation, bool on)
        {
            if (MyApp.Runner.Info == null)
            {
                return;
            }
            foreach (var code in new[] { "DG", "MR", "FTP", "EMAIL", "ECP", "IEC623", "AS24", "IEC608", "ACER" })
            {
                if (!MyApp.Runner.Info.ContainsProject(code))
                {
                    continue;
                }

                if (operation == "Test" && !MyApp.Runner.Info.ContainsProjectTest(code))
                {
                    continue;
                }
               (FindName(operation + "_" + code) as CheckBox).IsChecked = on;
            }
        }

        private void Clear_Click(object sender, RoutedEventArgs e)
        {
            ClearDocker.IsChecked = false;
            Metamodel.IsChecked = false;
            IsMerged.IsChecked = false;
            Setversion.Text = "";
            MessageBroker.Text = MyApp.Runner.Info != null ? MyApp.Runner.Info.MessageBroker : "";
            SetOperation("Build", false);
            SetOperation("Run", false);
            SetOperation("Init", false);
            SetOperation("Test", false);
            AsyncJob.IsChecked = false;
            additionalTestModels.ForEach(a => a.IsChecked = false);
            UpdateAfterChecked(null, null);
        }

        private void YourUID_LostFocus(object sender, RoutedEventArgs e)
        {
            if (IsLoaded)
            {
                MyApp.AppStorage.YourUid = YourUID.Text;
            }
        }

        private void Start_Click(object sender, RoutedEventArgs e)
        {
            var structure = GetStructure();
            lastSaver.Save(structure);
            MyApp.Runner.Run(MyApp.BuilderFolder);
            if (MyApp.AppStorage.CloseApplicationAfterRun)
            {
                Close();
            }
        }

        private Structure GetStructure()
        {
            var structure = new Structure
            {
                Folder = MyApp.EgwFolder,
                Version = Setversion.Text,
                MessageBroker = MessageBroker.Text,
                Clear = ClearDocker.IsChecked == true,
                Metamodel = Metamodel.IsChecked == true,
                IsMerged = IsMerged.IsChecked == true,
                UnitTests = UnitTests.IsChecked == true,
                Uid = YourUID.Text,
                InitASYNC = AsyncJob.IsChecked == true,
                RunInSequence = RunInSequence.IsChecked == true,
                EnvironmentFile = MyApp.Runner.Info != null && MyApp.Runner.Info.IsEnvironmentsShowable ? EnvironmentHelper.LabelToFile(Environment.SelectedItem?.ToString()) : null,

                BuildDG = Build_DG.IsChecked == true,
                BuildMR = Build_MR.IsChecked == true,
                BuildFTP = Build_FTP.IsChecked == true,
                BuildEMAIL = Build_EMAIL.IsChecked == true,
                BuildECP = Build_ECP.IsChecked == true,
                BuildIEC62325 = Build_IEC623.IsChecked == true,
                BuildAS24 = Build_AS24.IsChecked == true,
                BuildIEC60870 = Build_IEC608.IsChecked == true,
                BuildACER = Build_ACER.IsChecked == true,
                BuildMERGED = Build_MERGED.IsChecked == true,

                RunDG = Run_DG.IsChecked == true,
                RunMR = Run_MR.IsChecked == true,
                RunFTP = Run_FTP.IsChecked == true,
                RunEMAIL = Run_EMAIL.IsChecked == true,
                RunECP = Run_ECP.IsChecked == true,
                RunIEC62325 = Run_IEC623.IsChecked == true,
                RunAS24 = Run_AS24.IsChecked == true,
                RunIEC60870 = Run_IEC608.IsChecked == true,
                RunACER = Run_ACER.IsChecked == true,
                RunMERGED = Run_MERGED.IsChecked == true,

                InitDG = Init_DG.IsChecked == true,
                InitMR = Init_MR.IsChecked == true,
                InitFTP = Init_FTP.IsChecked == true,
                InitEMAIL = Init_EMAIL.IsChecked == true,
                InitECP = Init_ECP.IsChecked == true,
                InitIEC62325 = Init_IEC623.IsChecked == true,
                InitAS24 = Init_AS24.IsChecked == true,
                InitIEC60870 = Init_IEC608.IsChecked == true,
                InitACER = Init_ACER.IsChecked == true,

                TestDG = Test_DG.IsChecked == true,
                TestMR = Test_MR.IsChecked == true,
                TestFTP = Test_FTP.IsChecked == true,
                TestEMAIL = Test_EMAIL.IsChecked == true,
                TestECP = Test_ECP.IsChecked == true,
                TestIEC62325 = Test_IEC623.IsChecked == true,
                TestAS24 = Test_AS24.IsChecked == true,
                TestIEC60870 = Test_IEC608.IsChecked == true,
                TestACER = Test_ACER.IsChecked == true,
                AdditionalTests = additionalTestModels.Where(t => t.IsChecked).Select(t => t.Name).ToArray()
            };
            return structure;
        }

        private void SetStructure(Structure structure)
        {
            MyApp.EgwFolder = structure.Folder;
            UpdateStatusBar();
            Setversion.Text = structure.Version;
            MessageBroker.Text = structure.MessageBroker;
            if (MyApp.Runner.Info != null && MyApp.Runner.Info.IsEnvironmentsShowable)
            {
                Environment.SelectedItem = EnvironmentHelper.FileToLabel(structure.EnvironmentFile);
            }
            ClearDocker.IsChecked = structure.Clear;
            Metamodel.IsChecked = structure.Metamodel;
            IsMerged.IsChecked = structure.IsMerged;
            UnitTests.IsChecked = structure.UnitTests;
            YourUID.Text = structure.Uid;
            YourUID_LostFocus(null, null);
            AsyncJob.IsChecked = structure.InitASYNC;
            RunInSequence.IsChecked = structure.RunInSequence;

            Build_DG.IsChecked = structure.BuildDG;
            Build_MR.IsChecked = structure.BuildMR;
            Build_FTP.IsChecked = structure.BuildFTP;
            Build_EMAIL.IsChecked = structure.BuildEMAIL;
            Build_ECP.IsChecked = structure.BuildECP;
            Build_IEC623.IsChecked = structure.BuildIEC62325;
            Build_AS24.IsChecked = structure.BuildAS24;
            Build_IEC608.IsChecked = structure.BuildIEC60870;
            Build_ACER.IsChecked = structure.BuildACER;
            Build_MERGED.IsChecked = structure.BuildMERGED;

            Run_DG.IsChecked = structure.RunDG;
            Run_MR.IsChecked = structure.RunMR;
            Run_FTP.IsChecked = structure.RunFTP;
            Run_EMAIL.IsChecked = structure.RunEMAIL;
            Run_ECP.IsChecked = structure.RunECP;
            Run_IEC623.IsChecked = structure.RunIEC62325;
            Run_AS24.IsChecked = structure.RunAS24;
            Run_IEC608.IsChecked = structure.RunIEC60870;
            Run_ACER.IsChecked = structure.RunACER;
            Run_MERGED.IsChecked = structure.RunMERGED;

            Init_DG.IsChecked = structure.InitDG;
            Init_MR.IsChecked = structure.InitMR;
            Init_FTP.IsChecked = structure.InitFTP;
            Init_EMAIL.IsChecked = structure.InitEMAIL;
            Init_ECP.IsChecked = structure.InitECP;
            Init_IEC623.IsChecked = structure.InitIEC62325;
            Init_AS24.IsChecked = structure.InitAS24;
            Init_IEC608.IsChecked = structure.InitIEC60870;
            Init_ACER.IsChecked = structure.InitACER;

            Test_DG.IsChecked = structure.TestDG;
            Test_MR.IsChecked = structure.TestMR;
            Test_FTP.IsChecked = structure.TestFTP;
            Test_EMAIL.IsChecked = structure.TestEMAIL;
            Test_ECP.IsChecked = structure.TestECP;
            Test_IEC623.IsChecked = structure.TestIEC62325;
            Test_AS24.IsChecked = structure.TestAS24;
            Test_IEC608.IsChecked = structure.TestIEC60870;
            Test_ACER.IsChecked = structure.TestACER;
            additionalTestModels.ForEach(a =>
            {
                a.IsChecked = structure.AdditionalTests != null && structure.AdditionalTests.Any(t => t == a.Name);
            });
        }

        private void Last_Click(object sender, RoutedEventArgs e)
        {
            var last = lastSaver.Load();
            if (last != null)
            {
                SetStructure(last);
            }
            else
            {
                MyApp.ShowMessage("There is not last file");
            }
            UpdateAfterChecked(null, null);
        }

        private void UpdateAfterChecked(object sender, RoutedEventArgs e)
        {
            if (Build_DG.IsChecked == false
                && Build_MR.IsChecked == false
                && Build_FTP.IsChecked == false
                && Build_EMAIL.IsChecked == false
                && Build_ECP.IsChecked == false
                && Build_IEC623.IsChecked == false
                && Build_AS24.IsChecked == false
                && Build_IEC608.IsChecked == false
                && Build_ACER.IsChecked == false
                )
            {
                UnitTests.IsChecked = false;
                UnitTests.IsEnabled = false;
            }
            else
            {
                UnitTests.IsEnabled = true;
            }
            if (ClearDocker.IsChecked == true && (Run_DG.IsChecked == true || Run_FTP.IsChecked == true || Run_MERGED.IsChecked == true))
            {
                AsyncJob.IsChecked = true;
            }
            if (Build_MERGED.IsChecked == true || Run_MERGED.IsChecked == true || Init_MERGED.IsChecked == true)
            {
                IsMerged.IsChecked = true;
            }
        }

        private void RunInSequence_Checked(object sender, RoutedEventArgs e)
        {
            if (IsLoaded)
            {
                MyApp.AppStorage.RunInSequence = RunInSequence.IsChecked == true;
            }
        }

        private void CloseApplicationAfterRun_Checked(object sender, RoutedEventArgs e)
        {
            if (IsLoaded)
            {
                MyApp.AppStorage.CloseApplicationAfterRun = CloseApplicationAfterRun.IsChecked == true;
            }
        }

        private void MergedInit_Checked(object sender, RoutedEventArgs e)
        {
            SetOperation("Init", Init_MERGED.IsChecked == true);
        }

        private void MERGED_Click(object sender, RoutedEventArgs e)
        {
            SetProject("MERGED", Build_MERGED.IsChecked != true);
        }

        private void MessageBroker_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            MessageBrokerLabel.Foreground = SystemColors.ActiveCaptionTextBrush;
            MessageBrokerLabel.ToolTip = null;
        }
    }

    internal class AdditionalTestModel : BindableBase
    {

        private bool isChecked;
        public bool IsChecked { get => isChecked; set { isChecked = value; RaisePropertyChanged(); } }

        public string Name { get; }
        public string NameToWPF => Name.Replace("_", "__");


        public AdditionalTestModel(string name)
        {
            Name = name;
        }
    }
}
