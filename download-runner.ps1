$ProcName = "setup-EgwBuilderRunner.exe"
$WebFile = "http://www.bogan.cz/files/programy/egw-builder-runner/setup-EgwBuilderRunner.exe"
$Folder = ("$env:TEMP\EGW-Builder")
echo "Creating $Folder..."
md $Folder -ea 0
$Downladed = ("$Folder\$ProcName")
  
echo "Downloading to $Downladed ..."
(New-Object System.Net.WebClient).DownloadFile($WebFile,$Downladed)
echo "Installing..."
Start-Process -NoNewWindow -Wait $Downladed -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /CLOSEAPPLICATIONS /FORCECLOSEAPPLICATIONS"
echo "Removing installator..."
Remove-Item -Force $Downladed    
echo "All Done"