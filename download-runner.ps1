$ProcName = "setup-EgwBuilderRunner.exe"
$WebFile = "http://www.bogan.cz/files/programy/egw-builder-runner/setup-EgwBuilderRunner.exe"
$Downladed = ("$env:APPDATA\$ProcName")
  
echo Downloading...
(New-Object System.Net.WebClient).DownloadFile($WebFile,$Downladed)
echo Installing...
Start-Process -NoNewWindow -Wait $Downladed -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /CLOSEAPPLICATIONS /FORCECLOSEAPPLICATIONS"
echo "Removing installator..."
Remove-Item -Force $Downladed    
echo "All Done"