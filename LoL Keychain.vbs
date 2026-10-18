Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir
If Not fso.FolderExists(dir & "\node_modules") Then
  sh.Run "cmd /c npm install", 1, True
End If
sh.Run "cmd /c npm start", 0, False
