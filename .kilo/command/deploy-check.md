# Deploy Check

## Trigger
- On every push to `main` branch (via CI pipeline)

## Action
Runs the following skills in sequence:
1. `vercel-react-best-practices` — checks Vercel config patterns
2. `vercel-networking-domains` — validates edge/caching setup
3. `web-performance-optimization` — audits bundle size and LCP
4. `cicd-pipeline-generator` — ensures deploy config is current

## Output
- Deploy readiness report
- Performance budget check (bundle size, LCP score)
- Blocks deploy if performance budget exceeded