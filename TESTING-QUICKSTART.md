# Quick Testing Setup Guide

## Initial Setup (5 minutes)

### 1. Install Dependencies

```bash
cd loans-service-func
npm install
```

This installs:

- `jest` - Test framework
- `ts-jest` - TypeScript support for Jest
- `@types/jest` - TypeScript definitions
- `supertest` - HTTP testing library

### 2. Verify Installation

```bash
npm test
```

Expected output:

```
PASS  tests/unit/loan.domain.test.ts
PASS  tests/integration/loan-endpoints.integration.test.ts
PASS  tests/concurrency/concurrency.test.ts

Test Suites: 3 passed, 3 total
Tests:       XX passed, XX total
Coverage:    XX%
```

### 3. Troubleshooting

**Error: Cannot find module**

```bash
npm install
npm run build
```

**TypeScript errors**

```bash
npx tsc --noEmit
```

**Tests not running**

```bash
# Clear cache and retry
npm test -- --clearCache
npm test
```

## Test Commands Reference

| Command                    | Purpose                          |
| -------------------------- | -------------------------------- |
| `npm test`                 | Run all tests with coverage      |
| `npm run test:watch`       | Watch mode for development       |
| `npm run test:unit`        | Run only unit tests              |
| `npm run test:integration` | Run only integration tests       |
| `npm run test:ci`          | CI mode (used in GitHub Actions) |

## Quick Verification Checklist

- [ ] `npm install` completed successfully
- [ ] `npm test` runs without errors
- [ ] Coverage report generated in `coverage/` directory
- [ ] All test suites pass
- [ ] CI workflow file exists at `.github/workflows/test.yml`

## Next Steps

1. **Review test files** to understand patterns
2. **Add more tests** for other services (catalogue, inventory, notifications)
3. **Push to GitHub** to trigger CI/CD pipeline
4. **Monitor GitHub Actions** tab for automated test results

## Assessment Evidence

When submitting your project, include:

1. Screenshot of `npm test` output showing all tests passing
2. Screenshot of GitHub Actions showing automated test runs
3. Link to this TESTING.md file in your documentation
4. Coverage report from `coverage/lcov-report/index.html`

## Support

- Test framework docs: https://jestjs.io/
- Assertion reference: https://jestjs.io/docs/expect
- Mocking guide: https://jestjs.io/docs/mock-functions

---

**Time to complete**: ~5 minutes
**Difficulty**: Easy
**Grade impact**: Critical (15% of total grade)
