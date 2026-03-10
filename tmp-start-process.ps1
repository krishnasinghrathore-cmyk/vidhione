param(
  [string]$Root,
  [string]$WorkingDirectory,
  [string]$LogName,
  [string]$ErrLogName,
  [string]$Cmd
)

$out = Join-Path $Root $LogName
$err = Join-Path $Root $ErrLogName
if (Test-Path $out) { Remove-Item $out -Force }
if (Test-Path $err) { Remove-Item $err -Force }

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'cmd.exe'
$psi.Arguments = "/c $Cmd 1> `"$out`" 2> `"$err`""
$psi.WorkingDirectory = $WorkingDirectory
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$merged = New-Object 'System.Collections.Generic.Dictionary[string,string]' ([System.StringComparer]::OrdinalIgnoreCase)
foreach ($scope in @('Machine', 'User', 'Process')) {
  $vars = [System.Environment]::GetEnvironmentVariables($scope)
  foreach ($key in $vars.Keys) {
    $merged[$key] = [string]$vars[$key]
  }
}
$envVars = $psi.EnvironmentVariables
$envVars.Clear()
foreach ($entry in $merged.GetEnumerator()) {
  $envVars[$entry.Key] = $entry.Value
}

$process = [System.Diagnostics.Process]::Start($psi)
if (-not $process) {
  throw 'Failed to start process.'
}
Write-Output $process.Id
