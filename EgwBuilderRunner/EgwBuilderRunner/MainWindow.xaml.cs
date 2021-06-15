using BoganApp.Windows;
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
        public MainWindow()
        {
            InitializeComponent();
            Title = MyApp.AppSettings.ApplicationNameWithVersion;

            Clear_Click(null, null);
            lastSaver = new LastSaver(MyApp.BuilderFolder);
            runner = new Runner();

            var last = lastSaver.Load();
            if (last != null)
            {
                SetStructure(last);
            }
            else
            {
                YourUID.Text = MyApp.AppStorage.YourUid;
                UpdateStatusBar();
            }
        }

        private void UpdateStatusBar()
        {
            StatusBar.SetStatusText(MyApp.EgwFolder + " | " + MyApp.BuilderFolder);
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

            (FindName(operation + "_DG") as CheckBox).IsChecked = on;
            (FindName(operation + "_MR") as CheckBox).IsChecked = on;
            (FindName(operation + "_FTP") as CheckBox).IsChecked = on;
            (FindName(operation + "_EMAIL") as CheckBox).IsChecked = on;
            (FindName(operation + "_ECP") as CheckBox).IsChecked = on;
            (FindName(operation + "_IEC") as CheckBox).IsChecked = on;
            (FindName(operation + "_AS24") as CheckBox).IsChecked = on;
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
            runner.Run(MyApp.BuilderFolder, structure);
        }

        private Structure GetStructure()
        {
            return new Structure
            {
                Folder = MyApp.EgwFolder,
                Version = Setversion.Text,
                Clear = ClearDocker.IsChecked == true,
                Metamodel = Metamodel.IsChecked == true,
                UnitTests = UnitTests.IsChecked == true,
                Uid = YourUID.Text,
                InitASYNC = AsyncJob.IsChecked == true,

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
            };
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
        }
    }

}
