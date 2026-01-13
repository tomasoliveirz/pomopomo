# Known Issues

## Anti-Abuse Hardening (ITER-003)
- **Verification Script Connection**: `scripts/test-rate-limits.ts` fails with `ECONNREFUSED` if the development server (`npm run dev`) and WebSocket server (`npm run ws:dev`) are not running. Ensure services are up before running the script.
- **Socket Token Spam**: The verification script currently skips the socket spam test because automating token retrieval requires a complex flow (or a seeded token). Manual verification via UI is recommended.
- **Strict IP Handling**: `getClientIp` falls back to `127.0.0.1` if headers are missing. In production behind a proxy (e.g., Vercel, Nginx), ensure `x-forwarded-for` or `x-real-ip` is correctly set.
