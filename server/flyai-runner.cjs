// The official CLI forces process.exit while Undici is closing handles, which
// crashes Node 24 on Windows after writing valid JSON. Let handles drain instead.
class RequestedExit extends Error { constructor(code) { super('CLI exit'); this.code = code; } }
process.exit = (code = 0) => { throw new RequestedExit(code); };
process.on('unhandledRejection', (error) => {
  if (error instanceof RequestedExit) process.exitCode = error.code;
  else { process.exitCode = 1; process.stderr.write('FlyAI client failed\n'); }
});
try { require('../node_modules/@fly-ai/flyai-cli/dist/flyai-bundle.cjs'); }
catch (error) {
  process.exitCode = error instanceof RequestedExit ? error.code : 1;
}
