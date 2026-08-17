$dir = "v:\___VAC\_PROJ\_PR\machine_asylum\_output\FINAL_TO_SHARE\Friday\"
$files = Get-ChildItem "$dir\*.mp4" | Where-Object { $_.Name -notmatch "_h264\.mp4$" }

Write-Host "Found $($files.Count) files to convert."

foreach ($file in $files) {
    $out = Join-Path $dir ($file.BaseName + "_h264.mp4")
    Write-Host "Converting $($file.Name)..."
    
    # Run ffmpeg to convert to standard h264/aac
    Start-Process -FilePath "ffmpeg" -ArgumentList "-y", "-hide_banner", "-loglevel", "warning", "-i", "`"$($file.FullName)`"", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "`"$out`"" -Wait -NoNewWindow
    
    if (Test-Path $out) {
        Remove-Item $file.FullName -Force
        Rename-Item $out $file.Name
        Write-Host "Done $($file.Name)"
    } else {
        Write-Host "Failed $($file.Name)"
    }
}

Write-Host "All conversions completed."
