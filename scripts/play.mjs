// A small command line for trying Plumbline by hand on Studionet (for example a real breach with a page you control).
//
//   node scripts/play.mjs create <page-url> <beneficiary> [--bond 0.02] [--term 600] [--cure 120] [--gap 60] [--age 0] [--bound]
//   node scripts/play.mjs tenet <id> "<promise in plain words>" ["<exact anchor words>"]
//   node scripts/play.mjs activate <id>            (publisher)
//   node scripts/play.mjs inspect <id> [--as watcher]
//   node scripts/play.mjs mature <id> | cancel <id> | topup <id> <gen> | collect [--as watcher|beneficiary]
//   node scripts/play.mjs show <id> | list | stats | credit <address>
//
// Keys come from .env (PUBLISHER_KEY, WATCHER_KEY, BENEFICIARY_KEY); the contract address from .plumbline-address or
// PLUMBLINE_ADDRESS. Writes use the publisher unless --as says otherwise.
import { existsSync, readFileSync } from "node:fs";
import { outcome } from "./receipt.mjs";

const env = { ...process.env };
const envFile = new URL("../.env", import.meta.url);
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && m[2] && env[m[1]] === undefined) env[m[1]] = m[2];
  }
}
const addrFile = new URL("../.plumbline-address", import.meta.url);
const ADDRESS = env.PLUMBLINE_ADDRESS || (existsSync(addrFile) ? readFileSync(addrFile, "utf8").trim() : "");
const argv = process.argv.slice(2);
const cmd = argv.shift();
const flags = {};
const pos = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) {
    const k = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) flags[k] = true;
    else flags[k] = argv[++i];
  } else pos.push(argv[i]);
}
const gen = (s) => BigInt(Math.round(Number(s) * 1e6)) * 10n ** 12n;
const fmt = (w) => `${Number(BigInt(w)) / 1e18} GEN`;
const die = (m) => {
  console.error(m);
  process.exit(1);
};
if (!cmd) die("Usage: node scripts/play.mjs <create|tenet|activate|inspect|mature|cancel|topup|collect|show|list|stats|credit> ...");
if (!/^0x[0-9a-fA-F]{40}$/.test(ADDRESS)) die("No contract address. Run `npm run deploy` first, or set PLUMBLINE_ADDRESS.");

const sdk = await import("genlayer-js");
const { studionet } = await import("genlayer-js/chains");
const who = String(flags.as ?? "publisher").toUpperCase() + "_KEY";
const reader = sdk.createClient({ chain: studionet });
const read = async (fn, args = []) => String(await reader.readContract({ address: ADDRESS, functionName: fn, args }));
const showRow = async (id) => {
  const r = JSON.parse(await read("get_covenant", [Number(id)]));
  console.log(`#${r.id} ${r.title}  ${r.state}  bond ${fmt(r.bond)}  readings ${r.readings} (clean ${r.clean}, drift ${r.drift}, breach ${r.breach}, unreadable ${r.unreadable})`);
  console.log(`  page ${r.url}${r.bound ? "  (bound to the publisher's address)" : ""}`);
  console.log(`  warnings ${r.warnings}, cures ${r.cures}${r.state === "WARNED" ? `, cure by ${new Date(r.cure_by * 1000).toISOString()}` : ""}${r.ends_at ? `, term ends ${new Date(r.ends_at * 1000).toISOString()}` : ""}`);
  if (r.next_reading_at) console.log(`  next reading allowed ${new Date(r.next_reading_at * 1000).toISOString()}`);
  r.tenets.forEach((t, i) => console.log(`  tenet ${i + 1}: ${t.text}${t.anchor ? `   [anchor: ${t.anchor}]` : ""}`));
  if (r.last) console.log(`  last reading: ${r.last.kind} ${r.last.detail || ""} - ${r.last.note}`);
  if (r.ended_note) console.log(`  ended: ${r.ended_note}`);
};

async function write(fn, args, value = 0n) {
  const key = env[who];
  if (!/^0x[0-9a-fA-F]{64}$/.test(key ?? "")) die(`${who} is not set (.env or environment).`);
  const account = sdk.createAccount(key);
  const client = sdk.createClient({ chain: studionet, account });
  console.log(`${fn} as ${account.address} ...`);
  const hash = await client.writeContract({ address: ADDRESS, functionName: fn, args, ...(value ? { value } : {}) });
  const opts = { hash, retries: 400, interval: 3000 };
  const receipt = typeof client.waitForDecision === "function" ? await client.waitForDecision(opts) : await client.waitForTransactionReceipt({ ...opts, status: "ACCEPTED" });
  const out = outcome(receipt);
  console.log(`${out.ok ? "decided" : "REFUSED / failed"}: ${out.status}   ${hash}`);
  if (!out.ok && out.detail) console.log(out.detail.slice(0, 400));
  return out.ok;
}

if (cmd === "create") {
  const [url, ben] = pos;
  if (!url || !ben) die("create needs <page-url> <beneficiary>");
  const title = String(flags.title ?? "Hand-made promise");
  const ok = await write("create_covenant", [title, url, ben, Number(flags.term ?? 600), Number(flags.cure ?? 120), Number(flags.gap ?? 60), Number(flags.age ?? 0), Boolean(flags.bound)], gen(flags.bond ?? 0.02));
  if (ok) {
    const me = sdk.createAccount(env[who]).address;
    const mine = JSON.parse(await read("covenants_of", [me, 0, 1]));
    console.log(mine.length ? `new covenant id ${mine[0].id}` : "Created. Use `node scripts/play.mjs list` to see its id.");
  }
} else if (cmd === "tenet") await write("add_tenet", [Number(pos[0]), pos[1], pos[2] ?? ""]);
else if (cmd === "activate") (await write("activate", [Number(pos[0])])) && (await showRow(pos[0]));
else if (cmd === "inspect") (await write("inspect", [Number(pos[0])])) && (await showRow(pos[0]));
else if (cmd === "mature") (await write("mature", [Number(pos[0])])) && (await showRow(pos[0]));
else if (cmd === "cancel") (await write("cancel", [Number(pos[0])])) && (await showRow(pos[0]));
else if (cmd === "topup") (await write("top_up", [Number(pos[0])], gen(pos[1]))) && (await showRow(pos[0]));
else if (cmd === "collect") await write("collect", []);
else if (cmd === "show") await showRow(pos[0]);
else if (cmd === "list") {
  for (const r of JSON.parse(await read("list_covenants", [0, 20]))) console.log(`#${r.id}  ${r.state.padEnd(9)} ${fmt(r.bond).padEnd(12)} ${r.title}  ${r.url}`);
} else if (cmd === "stats") console.log(JSON.stringify(JSON.parse(await read("stats")), null, 2));
else if (cmd === "credit") console.log(fmt(await read("credit_of", [pos[0]])));
else die(`Unknown command "${cmd}".`);
