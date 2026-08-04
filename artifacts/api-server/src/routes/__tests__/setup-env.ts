// Set env vars required by business-legacy.ts at module load time
process.env.JWT_SECRET = "test-secret-for-unit-tests";
process.env.APP_BASE_URL = "http://localhost:3000";
