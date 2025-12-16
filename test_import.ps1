
$projectName = "Test Import " + (Get-Date -Format "HHmm")
$createBody = @{
    name = $projectName
} | ConvertTo-Json

$project = Invoke-RestMethod -Uri "http://localhost:3000/api/projects" -Method Post -Body $createBody -ContentType "application/json"
$projectId = $project._id
Write-Host "Created Project: $projectId"

$boundary = [System.Guid]::NewGuid().ToString() 
$LF = "`r`n"
$fileBytes = [System.IO.File]::ReadAllBytes("c:\Users\f.biggi\Taboolo-nuxt\4440_08-11-2025.xml")
$fileEnc = [System.Text.Encoding]::GetEncoding('iso-8859-1')

# Construct Multipart Body manually (Powershell < 7 is hard with -InFile, assuming new PS or simple approach)
# Actually curl is easier if available.
# Let's try curl (if using Git Bash or similar alias). 
# Or just use Python script? Python is running.
