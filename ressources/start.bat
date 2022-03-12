:: From leagueofgraphs.com by Trebonius

@echo off
setlocal enabledelayedexpansion

:start
set LOL_PATH=""

if exist "%APPDATA%\LoG_lolinstallpath.txt" (
    set /p LOL_PATH0=< "%APPDATA%\LoG_lolinstallpath.txt"
    call :Trim LOL_PATH !LOL_PATH0!
    echo Manually set Path found: "!LOL_PATH!"
    
    IF EXIST "!LOL_PATH!" (
        goto runSpectate
    )
)

for /F "delims=" %%R in ('
    tasklist /FI "ImageName eq LeagueClient.exe" /FI "Status eq Running" /FO CSV /NH
') do (
    set "FLAG1=" & set "FLAG2="
    for %%C in (%%R) do (
        if defined FLAG1 (
            if not defined FLAG2 (
                set LOL_PID=%%~C
                IF NOT "%LOL_PID%"=="" goto pidFound
            )
            set "FLAG2=#"
        )
        set "FLAG1=#"
    )
)

FOR %%G IN ("HKLM\SOFTWARE\WOW6432Node\Riot Games, Inc\League of Legends") DO (
	for /f "usebackq skip=2 tokens=1,2*" %%a in (`%systemroot%\system32\REG.EXE QUERY %%G /v "Location"`) do  (
		set LOL_PATH=%%c
		echo "Path found: !LOL_PATH!
		goto runSpectate
	)
)

IF EXIST "C:\Riot Games\League of Legends" (
	set LOL_PATH="C:\Riot Games\League of Legends"
	goto runSpectate
)
IF EXIST "D:\Riot Games\League of Legends" (
	set LOL_PATH="D:\Riot Games\League of Legends"
	goto runSpectate
)
IF EXIST "C:\Program Files\Riot Games\League of Legends" (
	set LOL_PATH="C:\Program Files\Riot Games\League of Legends"
	goto runSpectate
)
IF EXIST "C:\Program Files (x86)\Riot Games\League of Legends" (
	set LOL_PATH="C:\Program Files (x86)\Riot Games\League of Legends"
	goto runSpectate
)
IF EXIST "C:\Program Files\League of Legends" (
	set LOL_PATH="C:\Program Files\League of Legends"
	goto runSpectate
)
IF EXIST "C:\Program Files (x86)\League of Legends" (
	set LOL_PATH="C:\Program Files (x86)\League of Legends"
	goto runSpectate
)
IF EXIST "D:\Program Files\Riot Games\League of Legends" (
	set LOL_PATH="D:\Program Files\Riot Games\League of Legends"
	goto runSpectate
)
IF EXIST "D:\Program Files (x86)\Riot Games\League of Legends" (
	set LOL_PATH="D:\Program Files (x86)\Riot Games\League of Legends"
	goto runSpectate
)
IF EXIST "D:\Program Files\League of Legends" (
	set LOL_PATH="D:\Program Files\League of Legends"
	goto runSpectate
)
IF EXIST "D:\Program Files (x86)\League of Legends" (
	set LOL_PATH="D:\Program Files (x86)\League of Legends"
	goto runSpectate
)

goto notfound

:pidFound
set "lcpath="
for /f "skip=1delims=" %%a in (
	'wmic process where "ProcessID=%LOL_PID%" get ExecutablePath'
) do if not defined lcpath set "lcpath=%%a"

For %%A in ("%lcpath%") do (
    Set LOL_PATH=%%~dpA
)

goto runSpectate

:runSpectate
cls
for /f "tokens=* delims= " %%a in ("%LOL_PATH%") do set LOL_PATH=%%a
for /l %%a in (1,1,100) do if "!LOL_PATH:~-1!"==" " set LOL_PATH=!LOL_PATH:~0,-1!
cd /D %LOL_PATH%

for /f "tokens=1,* delims=" %%i in ('type Config\LeagueClientSettings.yaml ^| find /i "locale:"') do (
    set line=%%i
    call :Trim trimmed !line!
    SET locale=!trimmed:~9,-1!
)


cd Game
if exist "League of Legends.exe" (
	goto start
)

goto notfound

:start
@start "" "League of Legends.exe" "spectator {address}:{port} {encryptionKey} {gameId} {region}" -UseRads -GameBaseDir=.. "-Locale=%locale%" -SkipBuild -EnableCrashpad=true -EnableLNP
goto exit

:Trim
SetLocal EnableDelayedExpansion
set Params=%*
for /f "tokens=1*" %%a in ("!Params!") do EndLocal & set %1=%%b
exit /b

:notfound
cls
echo Cannot find your League of Legends installation.
set /p manualFolder="Please enter your League of Legends installation path: "

call :Trim manualFolder !manualFolder!
IF "!manualFolder!" NEQ "" (
    echo !manualFolder! > "%APPDATA%\LoG_lolinstallpath.txt"
)
goto start

:exit