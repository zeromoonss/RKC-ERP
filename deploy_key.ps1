$key = Get-Content "$env:USERPROFILE\.ssh\id_rsa.pub"
$password = "Tudy2026"
$server = "root@27.71.25.139"

# Use plink if available, otherwise use expect-like approach
$cmd = "mkdir -p ~/.ssh && echo '$key' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo KEY_ADDED_OK"

# Try using Windows built-in SSH with expect simulation via .NET
Add-Type -AssemblyName System.Runtime

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "ssh"
$psi.Arguments = "-o StrictHostKeyChecking=no $server `"$cmd`""
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true

$process = [System.Diagnostics.Process]::Start($psi)
Start-Sleep -Seconds 5
$process.StandardInput.WriteLine($password)
$process.WaitForExit(30000)
$stdout = $process.StandardOutput.ReadToEnd()
$stderr = $process.StandardError.ReadToEnd()
Write-Output "STDOUT: $stdout"
Write-Output "STDERR: $stderr"
