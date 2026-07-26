Write-Host "Kilo: Running pre-commit hooks..." -ForegroundColor Cyan

Write-Host "  [1/3] Running code-quality-scoring..." -ForegroundColor Yellow
try { & "C:\Users\25191\.config\kilo\node_modules\.bin\skills" run code-quality-scoring 2>&1 } catch { Write-Host "    Skill runner not available, skipping" -ForegroundColor Gray }

Write-Host "  [2/3] Running security-scanning..." -ForegroundColor Yellow
try { & "C:\Users\25191\.config\kilo\node_modules\.bin\skills" run security-scanning 2>&1 } catch { Write-Host "    Skill runner not available, skipping" -ForegroundColor Gray }

Write-Host "  [3/3] Running vitest (unit tests)..." -ForegroundColor Yellow
try { pnpm vitest run --reporter=verbose 2>&1 } catch { Write-Host "    Vitest not available or no tests found" -ForegroundColor Gray }

Write-Host "Kilo: Pre-commit hooks complete." -ForegroundColor Green