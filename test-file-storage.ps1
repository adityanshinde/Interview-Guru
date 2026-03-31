#!/usr/bin/env pwsh

# Test script to verify file storage is working

$usersFile = "$env:USERPROFILE\.interviewguru\users.json"

Write-Host "════════════════════════════════════════════" -ForegroundColor Green
Write-Host "QUOTA SYSTEM - FILE STORAGE TEST" -ForegroundColor Green
Write-Host "════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

# Step 1: Check directory
Write-Host "[1/5] Checking directory..." -ForegroundColor Cyan
$dir = Test-Path "$env:USERPROFILE\.interviewguru"
if ($dir) {
    Write-Host "✓ Directory exists" -ForegroundColor Green
} else {
    Write-Host "✗ Directory NOT found" -ForegroundColor Red
    Write-Host "Creating directory..." -ForegroundColor Yellow
    mkdir "$env:USERPROFILE\.interviewguru" -Force | Out-Null
    Write-Host "✓ Created" -ForegroundColor Green
}
Write-Host ""

# Step 2: Check file
Write-Host "[2/5] Checking users file..." -ForegroundColor Cyan
$fileExists = Test-Path $usersFile
if ($fileExists) {
    Write-Host "✓ File exists: $usersFile" -ForegroundColor Green
} else {
    Write-Host "✗ File NOT found" -ForegroundColor Red
    Write-Host "   File should be created after first API call" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Show file contents if exists
if ($fileExists) {
    Write-Host "[3/5] File Contents:" -ForegroundColor Cyan
    try {
        $content = Get-Content $usersFile | ConvertFrom-Json
        if ($content -is [array]) {
            Write-Host "   Users in file: $($content.Length)" -ForegroundColor Green
            Write-Host ""
            $content | ForEach-Object {
                Write-Host "   User: $($_.email)" -ForegroundColor Yellow
                Write-Host "     - Plan: $($_.plan)" -ForegroundColor White
                Write-Host "     - Chat Messages: $($_.chatMessagesUsed)" -ForegroundColor White
                Write-Host "     - Voice Minutes: $($_.voiceMinutesUsed)" -ForegroundColor White
                Write-Host "     - Created: $([datetime]::FromFileTimeUtc($_.createdAt).ToString())" -ForegroundColor White
                Write-Host ""
            }
        } else {
            Write-Host "   Invalid format (not array)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   Error reading file: $_" -ForegroundColor Red
    }
} else {
    Write-Host "[3/5] No file to show (create one by asking a question)" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Instructions
Write-Host "[4/5] Next Steps:" -ForegroundColor Cyan
Write-Host "   1. In the Electron app, ask a question" -ForegroundColor White
Write-Host "   2. Wait for the answer" -ForegroundColor White
Write-Host "   3. Check terminal for [Usage] logs" -ForegroundColor White
Write-Host "   4. Then run this script again to verify update" -ForegroundColor White
Write-Host ""

# Step 5: Monitor mode (optional)
Write-Host "[5/5] Instructions to continue:" -ForegroundColor Cyan
Write-Host "   Ask a question in the InterviewGuru app..." -ForegroundColor Yellow
Write-Host ""
Write-Host "════════════════════════════════════════════" -ForegroundColor Green
