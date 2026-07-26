Write-Host "Kilo: Running pre-push hooks..." -ForegroundColor Cyan

Write-Host "  [1/4] Running playwright (E2E tests)..." -ForegroundColor Yellow
try { pnpm playwright test --reporter=list 2>&1 } catch { Write-Host "    Playwright not available or no tests found" -ForegroundColor Gray }

Write-Host "  [2/4] Running accessibility-testing..." -ForegroundColor Yellow
try { & "C:\Users\25191\.config\kilo\node_modules\.bin\skills" run accessibility-testing 2>&1 } catch { Write-Host "    Skill runner not available, skipping" -ForegroundColor Gray }

Write-Host "  [3/4] Running test-driven-development checks..." -ForegroundColor Yellow
try { & "C:\Users\25191\.config\kilo\node_modules\.bin\skills" run test-driven-development 2>&1 } catch { Write-Host "    Skill runner not available, skipping" -ForegroundColor Gray }

Write-Host "  [4/4] Final quality check..." -ForegroundColor Yellow
try { & "C:\Users\25191\.config\kilo\node_modules\.bin\skills" run code-quality-scoring 2>&1 } catch { Write-Host "    Skill runner not available, skipping" -ForegroundColor Gray }

Write-Host "Kilo: Pre-push hooks complete." -ForegroundColor Green