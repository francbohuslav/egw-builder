using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

namespace EgwBuilderRunner
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
        }

        private void TextBlock_MouseUp(object sender, MouseButtonEventArgs e)
        {
            setProject("DG", Build_DG.IsChecked != true); 
        }
      

        private void TextBlock_MouseUp_1(object sender, MouseButtonEventArgs e)
        {
            setProject("MR", Build_MR.IsChecked != true);
        }

        private void TextBlock_MouseUp_2(object sender, MouseButtonEventArgs e)
        {
            setProject("FTP", Build_FTP.IsChecked != true);
        }

        private void TextBlock_MouseUp_3(object sender, MouseButtonEventArgs e)
        {
            setProject("Email", Build_Email.IsChecked != true);
        }

        private void TextBlock_MouseUp_4(object sender, MouseButtonEventArgs e)
        {
            setProject("ECP", Build_ECP.IsChecked != true);
        }

        private void TextBlock_MouseUp_5(object sender, MouseButtonEventArgs e)
        {
            setProject("IEC", Build_IEC.IsChecked != true);
        }

        private void TextBlock_MouseUp_6(object sender, MouseButtonEventArgs e)
        {
            setProject("AS24", Build_AS24.IsChecked != true);
        }

        void setProject(string project, bool on)
        {

            (FindName("Build_" + project) as CheckBox).IsChecked = on;
            (FindName("Run_" + project) as CheckBox).IsChecked = on;
            (FindName("Init_" + project) as CheckBox).IsChecked = on;
            (FindName("Test_" + project) as CheckBox).IsChecked = on;
        }
    }

}
