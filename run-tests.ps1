# Test Setup and Execution Script
# Run this in PowerShell from the repository root

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Campus Device Loan System - Test Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to loans service
Write-Host "Setting up Loans Service tests..." -ForegroundColor Yellow
cd loans-service-func

# Install dependencies
Write-Host "Installing test dependencies..." -ForegroundColor Yellow
npm install

# Run tests
Write-Host ""
Write-Host "Running tests..." -ForegroundColor Green
npm test

# Check if tests passed
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Coverage report generated in: coverage/lcov-report/index.html" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Review test results above" -ForegroundColor White
    Write-Host "2. Open coverage report in browser" -ForegroundColor White
    Write-Host "3. Push to GitHub to trigger CI/CD" -ForegroundColor White
    Write-Host "4. Check GitHub Actions tab for automated results" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ TESTS FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please review errors above and fix before submitting." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "For more information, see:" -ForegroundColor Cyan
Write-Host "- TESTING.md - Comprehensive testing documentation" -ForegroundColor White
Write-Host "- TESTING-QUICKSTART.md - Quick setup guide" -ForegroundColor White
Write-Host "- TESTING-SUMMARY.md - Implementation summary" -ForegroundColor White

# Return to root
cd ..
