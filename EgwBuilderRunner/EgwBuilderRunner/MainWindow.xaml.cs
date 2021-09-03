using BoganApp.Core;
using BoganApp.Windows;
using IWshRuntimeLibrary;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;

namespace EgwBuilderRunner
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    [WindowSettings(EnablePositionSaving = true)]
    public partial class MainWindow : BaseWindow<App>
    {
        private LastSaver lastSaver;
        private Runner runner;

        private InfoStructure info = new InfoStructure();

        private List<AdditionalTestModel> additionalTestModels = new List<AdditionalTestModel>();

        public MainWindow()
        {
            InitializeComponent();
            Title = MyApp.AppSettings.ApplicationNameWithVersion;

            Clear_Click(null, null);
            lastSaver = new LastSaver(MyApp.BuilderFolder);
            runner = new Runner();

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
                try
                {
                    var version = runner.GetVersions(MyApp.BuilderFolder, MyApp.EgwFolder);
                    info = runner.GetInfo(MyApp.BuilderFolder, MyApp.EgwFolder);
                    Console.Text = version;
                    additionalTestModels = info.AdditionalTests.Select(test => new AdditionalTestModel(test)).ToList();
                    AdditionalTests.ItemsSource = additionalTestModels;
                    AdditionalTestsContainer.SetVisible(additionalTestModels.Count > 0);
                    if (!info.ContainsProject("IEC"))
                    {
                        IEC.IsEnabled = false;
                        ForProject("IEC", ch => ch.IsEnabled = false);
                    }
                    if (!info.ContainsProject("AS24"))
                    {
                        AS24.IsEnabled = false;
                        ForProject("AS24", ch => ch.IsEnabled = false);
                    }
                    foreach (var project in info.Projects)
                    {
                        if (!project.SupportTests)
                        {
                            (FindName("Test_" + project.CodeForComponent) as CheckBox).IsEnabled = false;
                        }
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
                Environment.Exit(1);
            }

            string builderFolder = null;
            using (var folderDialog = new System.Windows.Forms.FolderBrowserDialog())
            {
                MyApp.ShowMessage("Step 1: Give me EGW builder folder.");
                folderDialog.ShowNewFolderButton = false;
                var folderResult = folderDialog.ShowDialog();
                if (folderResult != System.Windows.Forms.DialogResult.OK)
                {
                    Environment.Exit(2);
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
                    Environment.Exit(2);
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
            Environment.Exit(0);
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

        private void IEC_Click(object sender, RoutedEventArgs e)
        {
            SetProject("IEC", Build_IEC.IsChecked != true);
        }

        private void AS24_Click(object sender, RoutedEventArgs e)
        {
            SetProject("AS24", Build_AS24.IsChecked != true);
        }

        private void SetProject(string project, bool on)
        {

            (FindName("Build_" + project) as CheckBox).IsChecked = on;
            (FindName("Run_" + project) as CheckBox).IsChecked = on;
            (FindName("Init_" + project) as CheckBox).IsChecked = on;
            (FindName("Test_" + project) as CheckBox).IsChecked = on;
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
            foreach (var code in new[] { "DG", "MR", "FTP", "EMAIL", "ECP", "IEC", "AS24" })
            {
                if (!info.ContainsProject(code))
                {
                    continue;
                }

                if (operation == "Test" && !info.ContainsProjectTest(code))
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
            Setversion.Text = "";
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
            runner.Run(MyApp.BuilderFolder);
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
                Clear = ClearDocker.IsChecked == true,
                Metamodel = Metamodel.IsChecked == true,
                UnitTests = UnitTests.IsChecked == true,
                Uid = YourUID.Text,
                InitASYNC = AsyncJob.IsChecked == true,
                RunInSequence = RunInSequence.IsChecked == true,

                BuildDG = Build_DG.IsChecked == true,
                BuildMR = Build_MR.IsChecked == true,
                BuildFTP = Build_FTP.IsChecked == true,
                BuildEMAIL = Build_EMAIL.IsChecked == true,
                BuildECP = Build_ECP.IsChecked == true,
                BuildIEC62325 = Build_IEC.IsChecked == true,
                BuildAS24 = Build_AS24.IsChecked == true,

                RunDG = Run_DG.IsChecked == true,
                RunMR = Run_MR.IsChecked == true,
                RunFTP = Run_FTP.IsChecked == true,
                RunEMAIL = Run_EMAIL.IsChecked == true,
                RunECP = Run_ECP.IsChecked == true,
                RunIEC62325 = Run_IEC.IsChecked == true,
                RunAS24 = Run_AS24.IsChecked == true,

                InitDG = Init_DG.IsChecked == true,
                InitMR = Init_MR.IsChecked == true,
                InitFTP = Init_FTP.IsChecked == true,
                InitEMAIL = Init_EMAIL.IsChecked == true,
                InitECP = Init_ECP.IsChecked == true,
                InitIEC62325 = Init_IEC.IsChecked == true,
                InitAS24 = Init_AS24.IsChecked == true,

                TestDG = Test_DG.IsChecked == true,
                TestMR = Test_MR.IsChecked == true,
                TestFTP = Test_FTP.IsChecked == true,
                TestEMAIL = Test_EMAIL.IsChecked == true,
                TestECP = Test_ECP.IsChecked == true,
                TestIEC62325 = Test_IEC.IsChecked == true,
                TestAS24 = Test_AS24.IsChecked == true,
                AdditionalTests = additionalTestModels.Where(t => t.IsChecked).Select(t => t.Name).ToArray()
            };
            return structure;
        }

        private void SetStructure(Structure structure)
        {
            MyApp.EgwFolder = structure.Folder;
            UpdateStatusBar();
            Setversion.Text = structure.Version;
            ClearDocker.IsChecked = structure.Clear;
            Metamodel.IsChecked = structure.Metamodel;
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
            Build_IEC.IsChecked = structure.BuildIEC62325;
            Build_AS24.IsChecked = structure.BuildAS24;

            Run_DG.IsChecked = structure.RunDG;
            Run_MR.IsChecked = structure.RunMR;
            Run_FTP.IsChecked = structure.RunFTP;
            Run_EMAIL.IsChecked = structure.RunEMAIL;
            Run_ECP.IsChecked = structure.RunECP;
            Run_IEC.IsChecked = structure.RunIEC62325;
            Run_AS24.IsChecked = structure.RunAS24;

            Init_DG.IsChecked = structure.InitDG;
            Init_MR.IsChecked = structure.InitMR;
            Init_FTP.IsChecked = structure.InitFTP;
            Init_EMAIL.IsChecked = structure.InitEMAIL;
            Init_ECP.IsChecked = structure.InitECP;
            Init_IEC.IsChecked = structure.InitIEC62325;
            Init_AS24.IsChecked = structure.InitAS24;

            Test_DG.IsChecked = structure.TestDG;
            Test_MR.IsChecked = structure.TestMR;
            Test_FTP.IsChecked = structure.TestFTP;
            Test_EMAIL.IsChecked = structure.TestEMAIL;
            Test_ECP.IsChecked = structure.TestECP;
            Test_IEC.IsChecked = structure.TestIEC62325;
            Test_AS24.IsChecked = structure.TestAS24;
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
                && Build_IEC.IsChecked == false
                && Build_AS24.IsChecked == false
                )
            {
                UnitTests.IsChecked = false;
                UnitTests.IsEnabled = false;
            }
            else
            {
                UnitTests.IsEnabled = true;
            }
            if (ClearDocker.IsChecked == true && (Run_DG.IsChecked == true || Run_FTP.IsChecked == true))
            {
                AsyncJob.IsChecked = true;
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
