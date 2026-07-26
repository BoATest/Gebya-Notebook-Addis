Write-Host "Kilo: Running post-merge hooks..." -ForegroundColor Cyan

Write-Host "  [1/2] Running database-migration..." -ForegroundColor Yellow
try { & "C:\Users\25191\.config\kilo\node_modules\.bin\skills" run database-migration 2>&1 } catch { Write-Host "    Skill runner not available, skipping" -ForegroundColor Gray }

Write-Host "  [2/2] Running drizzle sync..." -ForegroundColor Yellow
try { pnpm drizzle-kit push 2>&1 } catch { Write-Host "    Drizzle CLI not available or not needed" -ForegroundColor Gray }

Write-Host "Kilo: Post-merge hooks complete." -ForegroundColor Green