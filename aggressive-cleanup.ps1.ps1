# Aggressive cleanup for remaining nested backend folders
# Run this in Admin PowerShell after the first script

Write-Host "AGGRESSIVE CLEANUP: Destroying remaining nested folders" -ForegroundColor Red
Write-Host "=========================================================" -ForegroundColor Yellow

# Method 1: Multiple robocopy passes
function Aggressive-Robocopy-Cleanup {
    $backendFolders = Get-ChildItem -Directory | Where-Object { $_.Name -match "backend" -or $_.Name -match "Backend" }
    
    if ($backendFolders.Count -eq 0) {
        Write-Host "No backend folders found!" -ForegroundColor Green
        return $true
    }
    
    Write-Host "Found $($backendFolders.Count) remaining backend folders" -ForegroundColor Yellow
    
    foreach ($folder in $backendFolders) {
        Write-Host "Processing: $($folder.Name)" -ForegroundColor Cyan
        
        # Create multiple empty directories for robocopy
        for ($i = 1; $i -le 3; $i++) {
            $emptyDir = "empty_cleanup_$i"
            New-Item -ItemType Directory -Path $emptyDir -Force | Out-Null
            
            Write-Host "  Robocopy pass $i..." -ForegroundColor Gray
            & robocopy "$emptyDir" "$($folder.FullName)" /MIR /R:0 /W:0 /NFL /NDL /NP /MT:1
            
            Remove-Item $emptyDir -Force -ErrorAction SilentlyContinue
        }
        
        # Try to remove the folder
        try {
            Remove-Item $folder.FullName -Recurse -Force -ErrorAction SilentlyContinue
        } catch {}
    }
    
    # Check if cleanup worked
    $remaining = Get-ChildItem -Directory | Where-Object { $_.Name -match "backend" -or $_.Name -match "Backend" }
    return ($remaining.Count -eq 0)
}

# Method 2: Windows subst drive method (for path length issues)
function Subst-Drive-Cleanup {
    Write-Host "Using SUBST drive method for deep paths..." -ForegroundColor Cyan
    
    $backendFolders = Get-ChildItem -Directory | Where-Object { $_.Name -match "backend" -or $_.Name -match "Backend" }
    
    foreach ($folder in $backendFolders) {
        try {
            # Create a virtual drive pointing to the nested folder
            $driveLetter = "Z:"
            & subst $driveLetter "$($folder.FullName)"
            
            # Use the virtual drive to delete (shorter paths)
            & cmd /c "rmdir /s /q $driveLetter\"
            
            # Remove the virtual drive
            & subst $driveLetter /d
            
            Write-Host "SUBST cleanup completed for: $($folder.Name)" -ForegroundColor Green
        }
        catch {
            Write-Host "SUBST method failed for: $($folder.Name)" -ForegroundColor Yellow
            # Clean up virtual drive if it exists
            & subst $driveLetter /d 2>$null
        }
    }
}

# Method 3: PowerShell with .NET methods
function DotNet-Cleanup {
    Write-Host "Using .NET directory methods..." -ForegroundColor Cyan
    
    $backendFolders = Get-ChildItem -Directory | Where-Object { $_.Name -match "backend" -or $_.Name -match "Backend" }
    
    foreach ($folder in $backendFolders) {
        try {
            [System.IO.Directory]::Delete($folder.FullName, $true)
            Write-Host ".NET cleanup succeeded for: $($folder.Name)" -ForegroundColor Green
        }
        catch {
            Write-Host ".NET cleanup failed for: $($folder.Name)" -ForegroundColor Yellow
        }
    }
}

# Method 4: CMD with short names
function CMD-Short-Path-Cleanup {
    Write-Host "Using CMD with short paths..." -ForegroundColor Cyan
    
    $backendFolders = Get-ChildItem -Directory | Where-Object { $_.Name -match "backend" -or $_.Name -match "Backend" }
    
    foreach ($folder in $backendFolders) {
        try {
            # Get short path name
            $shortPath = (New-Object -ComObject Scripting.FileSystemObject).GetFolder($folder.FullName).ShortPath
            & cmd /c "rmdir /s /q `"$shortPath`""
            Write-Host "CMD short path cleanup succeeded for: $($folder.Name)" -ForegroundColor Green
        }
        catch {
            Write-Host "CMD short path cleanup failed for: $($folder.Name)" -ForegroundColor Yellow
        }
    }
}

# Main execution
Write-Host "Starting aggressive cleanup..." -ForegroundColor Red

# Try each method until successful
$methods = @(
    { Aggressive-Robocopy-Cleanup },
    { Subst-Drive-Cleanup },
    { DotNet-Cleanup },
    { CMD-Short-Path-Cleanup }
)

$success = $false
$methodNames = @("Aggressive Robocopy", "SUBST Drive", ".NET Methods", "CMD Short Paths")

for ($i = 0; $i -lt $methods.Length; $i++) {
    Write-Host "`nTrying method $($i + 1): $($methodNames[$i])" -ForegroundColor Magenta
    
    try {
        & $methods[$i]
        
        # Check if any backend folders remain
        $remaining = Get-ChildItem -Directory | Where-Object { $_.Name -match "backend" -or $_.Name -match "Backend" }
        
        if ($remaining.Count -eq 0) {
            Write-Host "SUCCESS: All backend folders destroyed with $($methodNames[$i])!" -ForegroundColor Green
            $success = $true
            break
        } else {
            Write-Host "Method $($methodNames[$i]) incomplete. $($remaining.Count) folders remain." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Method $($methodNames[$i]) failed: $_" -ForegroundColor Red
    }
}

# Final status
if ($success) {
    Write-Host "`nCLEANUP COMPLETE!" -ForegroundColor Green
    Write-Host "All nested backend folders have been destroyed." -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Create a new 'backend' folder: mkdir backend" -ForegroundColor White
    Write-Host "2. Copy your files from the backup folder" -ForegroundColor White
    Write-Host "3. Test your backend: cd backend && node index.cjs" -ForegroundColor White
} else {
    Write-Host "`nCLEANUP INCOMPLETE" -ForegroundColor Red
    $remaining = Get-ChildItem -Directory | Where-Object { $_.Name -match "backend" -or $_.Name -match "Backend" }
    Write-Host "$($remaining.Count) backend folders still remain:" -ForegroundColor Yellow
    $remaining | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor White }
    
    Write-Host "`nTry these manual commands:" -ForegroundColor Cyan
    Write-Host "takeown /f backend /r /d y" -ForegroundColor Gray
    Write-Host "icacls backend /grant administrators:F /t" -ForegroundColor Gray
    Write-Host "rmdir backend /s /q" -ForegroundColor Gray
}

Write-Host "`nScript completed!" -ForegroundColor Magenta