Write-Host "Kilo: Running CI pipeline hooks..." -ForegroundColor Cyan

Write-Host "  [1/6] Running api-review..." -ForegroundColor Yellow
try { & "C:\Users\25191\.config\kilo\node_modules\.bin\skills" run api-review 2>&1 } catch { Write-Host "    Skill runner not available, skipping" -ForegroundColor Gray }

Write-Host "  [2/6] Running vercel-networking-domains..." -ForegroundColor Yellow
try { & "C:\Users\25191\.config\kilo\node_modules\.bin\skills" run vercel-networking-domains 2>&1 } catch { Write-Host "    Skill runner not available, skipping" -ForegroundColor Gray }

Write-Host "  [3/6] Running web-performance-optimization..." -ForegroundColor Yellow
try { & "C:\Users\25191\.config\kilo\node_modules\.bin\skills" run web-performance-optimization 2>&1 } catch { Write-Host "    Skill runner not available, skipping" -ForegroundColor Gray }

Write-Host "  [4/6] Running cicd-pipeline-generator..." -ForegroundColor Yellow
try { & "C:\Users\25191\.config\kilo\node_modules\.bin\skills" run cicd-pipeline-generator 2>&1 } catch { Write-Host "    Skill runner not available, skipping" -ForegroundColor Gray }

Write-Host "  [5/6] Running deploy-check..." -ForegroundColor Yellow
try { & "C:\Users\25191\.config\kilo\node_modules\.bin\skills" run deploy-check 2>&1 } catch { Write-Host "    Skill runner not available, skipping" -ForegroundColor Gray }

Write-Host "  [6/6] Running typecheck..." -ForegroundColor Yellow
try { pnpm run typecheck 2>&1 } catch { Write-Host "    Typecheck failed or not available" -ForegroundColor Red }

Write-Host "Kilo: CI pipeline hooks complete." -ForegroundColor Green