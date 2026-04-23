Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c timeout /t 5 /nobreak && cd /d ""C:\Users\tzvik\OneDrive\Desktop\Habits"" && ""C:\Program Files\nodejs\npm.cmd"" run dev", 0, False
