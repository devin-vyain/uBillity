Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

$projPath = "C:\devops\crud\python\uBillity\"
$envScriptsPath = "$projPath\env_ubillity\Scripts"
$npmPath = "$projPath\uBillity\frontend"
$djangoPath = "$projPath\uBillity"
$djangoCmd = "python manage.py runserver"
$npmCmd = "npm run dev"

Set-Location $envScriptsPath
pwd
& "$envScriptsPath\Activate.ps1"
Write-Host "Virtual environment activated..."

Set-Location $djangoPath
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$ErrorActionPreference='Stop'; & $djangoCmd"
Write-Host "Starting Django API server..."
Start-Sleep -Seconds 5
Set-Location $npmPath
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$ErrorActionPreference='Stop'; & $npmCmd"
Write-Host "Starting uBillity..."