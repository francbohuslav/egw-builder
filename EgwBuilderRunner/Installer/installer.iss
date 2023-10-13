; Script generated by the Inno Setup Script Wizard.
; SEE THE DOCUMENTATION FOR DETAILS ON CREATING INNO SETUP SCRIPT FILES!

#define MyAppName "EgwBuilderRunner"
#define MyAppVersion "1.24"
#define MyAppPublisher "Bogan"
#define MyAppURL "http://www.bogan.cz/"
#define MyAppExeName "EgwBuilderRunner.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application. Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{0E67FC1E-1CAC-486D-B803-1263995242FE}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
;AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppPublisher}\EgwBuilderRunner
DisableProgramGroupPage=yes
OutputDir=.
OutputBaseFilename=setup-EgwBuilderRunner
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "czech"; MessagesFile: "compiler:Languages\Czech.isl"

[Files]
Source: "..\EgwBuilderRunner\bin\Debug\EgwBuilderRunner.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\EgwBuilderRunner\bin\Debug\EgwBuilderRunner.exe.config"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\EgwBuilderRunner\bin\Debug\*.pdb"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\EgwBuilderRunner\bin\Debug\*.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\EgwBuilderRunner\bin\Debug\cs\*"; DestDir: "{app}\cs"; Flags: ignoreversion recursesubdirs createallsubdirs
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
Name: "{autoprograms}\Create {#MyAppName} link"; Filename: "{app}\{#MyAppExeName}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall
