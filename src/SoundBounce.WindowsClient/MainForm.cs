using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using CefSharp;
using CefSharp.WinForms;
using NAudio.Wave;
using SoundBounce.SpotifyAPI;
using libspotifydotnet;

namespace SoundBounce.WindowsClient
{
    public partial class MainForm : Form
    {
        public static readonly log4net.ILog Log = log4net.LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        private SpotifyEnabledBrowser browser;

        public MainForm()
        {
            InitializeComponent();
            
            SpotifyEnabledBrowser.Init();
            
            CreateBrowser();
        }

        private void MainForm_Load(object sender, EventArgs e)
        {
         
        }

        private void CreateBrowser()
        {
            browser = new SpotifyEnabledBrowser {Parent = this, Dock = DockStyle.Fill};
            browser.BringToFront();
           
            Controls.Add(browser);
        }

    }
}
