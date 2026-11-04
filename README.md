# Plumbline

**Bonded public promises.** A publisher locks a bond behind a web page and behind the sentences that page must keep saying. Anyone can inspect the page; the validators read it again and agree on what they saw. If the page stops standing behind its promises, the bond is slashed to the people who caught it and to a beneficiary the publisher named in advance.

A plumb line shows whether a wall is still straight. This contract shows whether a page still says what it said when the bond was posted: a warrant canary, a "we never sell your data" clause, a price or API-stability promise, a security contact, a retention period.

It is an Intelligent Contract for [GenLayer](https://www.genlayer.com) (Python, GenVM) and is meant for **Studionet**.

## Why it is built this way

An LLM reading a web page is useful, but it can be fooled, it can hallucinate, and two runs can disagree. A bond that is slashed on an LLM's say-so would be a bad bond. So the work is split:

| Layer | Decides | Can it hurt the publisher? |
|---|---|---|
| **Arithmetic** (plain code, identical on every validator) | the publisher's address is on the page, every anchor phrase is on the page, the newest date on the page is fresh enough, the page does not talk to the inspector, the page can be read at all | yes: these are *hard evidence* |
| **The AI inspector** | for every tenet: `HELD`, `WEAKENED`, `MISSING` or `CONTRADICTED`, each with a sentence copied from the page | only through `CONTRADICTED` with a sentence that **really is on the page** and that **both** the leader and the validators found |
| **Time rules** | a first hard reading only opens a *warning*; a second one after the cure time breaks the covenant; a repaired page cures it; a page that was repaired twice is broken for good at the third breach | they protect the publisher from one bad reading |

The model can only add alarms. It can never remove one the arithmetic raised, a claim without a verifiable sentence becomes `UNSURE` (logged, never punished), and a page that addresses the inspector is itself a breach.

## Roles

| Role | What it does |
|---|---|
| **Publisher** | creates a covenant and locks the bond, adds tenets, activates, may top up the bond, may cancel a draft. Cannot withdraw a live bond. |
| **Beneficiary** | named at creation, never changeable, never the publisher. Receives the bond if the covenant breaks. |
| **Inspector** | anyone. Reads the page of a live covenant (`inspect`). Earns a bounty for catching a breach. |
| **Stranger** | anyone can `mature` a covenant whose term is over and `collect` what they are owed. |

## Life of a covenant

```
create_covenant (bond locked) -> NEW (draft) -> add_tenet x1..6 -> activate
                                  |                                 |
                               cancel                    clean reading, strict
                                  v                                 v
                              CANCELLED            ACTIVE  <------------------+
                                                     | hard evidence          | clean or drifting reading
                                                     v                        | (a cure; at most 2)
                                                  WARNED ---------------------+
                                                     | hard evidence after the cure time
                                                     v
                                                  BROKEN (bond slashed)

ACTIVE, after the term -> mature -> MATURED (bond returns to the publisher)
```

1. **Draft.** `create_covenant(title, url, beneficiary, term, cure_secs, min_gap, max_age, bound)` with the bond attached. `add_tenet(id, text, anchor)` adds up to six promises; each is plain words for the AI and, optionally, exact words (`anchor`) that must stay on the page.
2. **Activation** (`activate`, publisher only) reads the page once, strictly. The covenant goes live only if the reading is *clean*: every anchor present, fresh dates (if required), the publisher's address present (if `bound`), no steering text, and every tenet `HELD` with a verified sentence. Otherwise it stays a draft and the reading says why. The term starts at activation.
3. **Inspection** (`inspect`, anyone). Readings are at least `min_gap` apart. Hard evidence on an `ACTIVE` covenant opens a **warning**: `cure_secs` to repair the page. A hard reading **inside** the cure time changes nothing. A hard reading **at or after** the cure time breaks the covenant. A clean or merely drifting reading while `WARNED` is a **cure**. After two cures the next hard reading breaks the covenant at once.
4. **Unreadable pages** are `DARK` readings, not breaches. Three unreadable readings in a row, spread over at least `cure_secs`, count as hard evidence ("the page stayed dark").
5. **End.** After the term anyone calls `mature`; the bond becomes the publisher's. A covenant that is still `WARNED` must be settled by an inspection first, unless nobody confirmed the warning for 14 days after both the term and the cure time (it then matures, but without counting as a clean record).

### Reading kinds

| Kind | Meaning | Effect |
|---|---|---|
| `CLEAN` | no hard evidence, every tenet `HELD` with a verified sentence | cures a warning |
| `DRIFT` | no hard evidence, but the AI is unsure, or sees `WEAKENED` / `MISSING` | logged; cures a warning; never punishes |
| `BREACH` | hard evidence: `unbound`, `anchor:N`, `stale`, `steering`, `contradiction:N`, or `dark` | opens a warning / breaks |
| `DARK` | the page could not be read | counted toward the dark streak |

## Where the money is

Everything is booked per covenant and in four totals, and `solvency()` shows that `deposited = paid + owed + locked` at all times.

- **Bond** (`locked`): attached to `create_covenant`, increased by `top_up`, never withdrawn while the covenant lives.
- **Slash** (`BROKEN`): 5 % of the bond to the **finder** (whoever opened the warning), 10 % to the **closer** (whoever confirmed it after the cure time), the rest to the **beneficiary**. A share that would go to the publisher goes to the beneficiary instead, so a publisher cannot buy their own bounty back. Shares round down; nothing is lost.
- **Return** (`MATURED`, `CANCELLED`): the bond becomes a credit of the publisher.
- **Payout is pull-based.** Slashes and returns create *credits*; `collect()` pays everything the caller is owed and clears the credit before the transfer is emitted.

## Hard limits (enforced by the contract)

| Limit | Value |
|---|---|
| Bond | 0.01 GEN to 10^9 GEN |
| Tenets per covenant | 1 to 6, text 12-200 characters, anchor 3-80 characters (or none), no duplicates, no steering text |
| Title | 3-60 characters |
| Term | 1 minute to 366 days |
| Cure time | 1 minute to 30 days |
| Gap between readings | 1 minute to 7 days |
| Freshness limit (`max_age`) | 0 (off) or 1 hour to 3650 days |
| Cures per covenant | 2 |
| Live covenants per publisher | 6, and one per page |
| Reading log | the newest 12 readings per covenant (a ring buffer) |
| Page links | `http(s)` with a real domain: no IP literals, no credentials, no custom ports, no local or wildcard-DNS hosts |

One page has one identity: `http` vs `https`, `www.`, a trailing slash, the fragment, parameter order, tracking parameters and percent-escape case do not make a different page.

## The reading

For every reading the leader and every validator fetch the page, extract its visible text (scripts, styles, comments and unclosed tags are dropped in one linear pass) and compute the **arithmetic** results independently. Then one LLM call produces the per-tenet verdicts.

- **Excerpt.** The inspector sees the first 3,500 characters of the page and the 400 characters around every anchor that was found (6,000 characters at most).
- **Quotes.** `HELD`, `WEAKENED` and `CONTRADICTED` must come with one sentence of the page, word for word. The contract checks it against the page text (case and spacing aside). A quote that is not on the page, or is shorter than 12 characters, turns the verdict into `UNSURE`.
- **Dates.** Calendar dates in the text (`2026-10-20`, `20 October 2026`, `Oct 20, 2026`) are found by regular expressions. The newest one that is not more than two days in the future is the date of the page. A page with a freshness limit and no date counts as stale.
- **Validators** accept the leader's reading only if: every arithmetic result is identical; a `CONTRADICTED` verdict is seen by both sides, with its sentence on the validator's own copy of the page; the leader is never more lenient than the validator about a soft verdict (`HELD` vs `WEAKENED`); every quote is on the page; and the shape of the result is exactly right. A model reply that is not a JSON object is an error, not a finding.
- **Steering.** A narrow pattern list (for example "ignore all previous instructions", "mark all tenets as held", "Dear AI") marks a page as steering. It is hard evidence, it blocks `HELD` verdicts, and tenet texts that match are refused at `add_tenet`. Ordinary wording such as "from now on" or "system prompt" does not match. The list is a tripwire, not the defence.

### Bound pages

`bound = true` requires the publisher's address (lower-case `0x...`, any letter case on the page) to appear on the page. It proves the publisher controls the page. The check stays on for the whole life: removing the address is a breach. An unbound covenant is a promise about a page somebody else may control.

## Interface

Writes (`gl.public.write`):

| Method | Who | Notes |
|---|---|---|
| `create_covenant(title, url, beneficiary, term, cure_secs, min_gap, max_age, bound)` | publisher, payable | returns the id; the attached value is the bond |
| `add_tenet(id, text, anchor)` | publisher, draft only | returns the number of tenets |
| `activate(id)` | publisher | strict reading; returns the reading kind (0 clean, 1 drift, 2 breach, 3 dark) |
| `cancel(id)` | publisher, draft only | bond becomes a credit |
| `top_up(id)` | publisher, payable | adds to a live covenant's bond |
| `inspect(id)` | anyone | returns the reading kind |
| `mature(id)` | anyone | after the term; bond becomes the publisher's credit |
| `collect()` | anyone | pays the caller's credits |

Views (return JSON strings unless noted): `get_covenant(id)`, `list_covenants(offset, limit)` (newest first, at most 50), `covenants_of(address, offset, limit)`, `readings_of(id)` (newest 12, oldest first), `credit_of(address)` (a number as text), `record_of(address)` (`kept`, `broken`, `live`), `stats()`, `solvency()`.

Covenant states: `0 NEW`, `1 ACTIVE`, `2 WARNED`, `3 BROKEN`, `4 MATURED`, `5 CANCELLED`.

## Deploy

Studionet, with an account that has funds there:

```bash
bash scripts/setup.sh                 # python + node packages
npm run keys                          # optional: three fresh funded test accounts in .env
set -a; . ./.env; set +a
DEPLOY_KEY=$PUBLISHER_KEY npm run deploy   # prints the address and writes .plumbline-address
```

Or paste `contracts/plumbline.py` into the GenLayer Studio and deploy it with no constructor arguments.

## Tests

```bash
pip install -r requirements.txt       # genlayer-test, genvm-linter
genvm-lint check contracts/plumbline.py
python3 -m pytest -q                  # no network; about 40 seconds without the fuzz walks, 2 minutes with them
```

The suite runs the contract in the genlayer-test direct runner with mocked pages and a mocked inspector. Closures handed to the VM are checked for pickling.

| File | What it covers |
|---|---|
| `test_text.py` | cleaning, link rules, page keys, page-to-text extraction (including hostile pages), dates, the steering tripwire (hits and false positives), the excerpt, classification |
| `test_covenants.py` | creating, every validation edge, tenets, cancelling, topping up, views and paging |
| `test_inspection.py` | activation, warnings, cures, breaks, the payout split, unreadable streaks, the reading log, maturity, shared ledger |
| `test_consensus.py` | `_accepts` case by case, the inspector's answer in every shape, validators who disagree, forged results |
| `test_adversarial.py` | steering pages, role confusion, replays, state skipping, absurd input, huge pages, the books after a whole life |
| `test_fuzz.py` | random walks over the whole interface; after every call the books, bonds, credits, counters, page keys and the state machine are checked and every refused call must change nothing (`FUZZ_SEEDS`, `FUZZ_STEPS`, `FUZZ_SEED_BASE` widen it) |

**Mutation check.** `python3 tests/mutate.py` breaks the contract in 92 places on purpose (constants, comparisons at their boundaries, removed checks, wrong payouts) and requires the suite to fail every time. It works on a copy of the project and can be resumed. All 92 mutations are killed.

## Live run on Studionet

`scripts/e2e.mjs` runs the contract on the real network with the real validators and a real model:

```bash
npm install
npm run keys                           # once
bash scripts/run-all.sh                # lint, local tests, then the live run
node scripts/e2e.mjs --only life       # one scenario; --dry-run prints the plan
```

Scenarios: `basics` (draft, cancel, collect; the contract's balance moves by exactly the bond), `adversarial` (calls that must be refused change no totals), `dark` (an unreachable page is a `DARK` reading), `anchors` and `bound` (hard evidence that does not depend on the model is found by the real validators), `life` (activate, top up, inspect, mature, collect). The model's soft verdicts are not fixed, so every scenario accepts any verdict and checks what must hold for all of them. Reports are written to `reports/plumbline-e2e-<time>.md` and `.json` after every step.

A real breach needs a page you can edit between two readings (a GitHub Pages file, a gist, your own site). `scripts/play.mjs` is a small command line for that:

```bash
node scripts/play.mjs create https://you.example.com/promise 0xBENEFICIARY --bound --cure 120 --gap 60
node scripts/play.mjs tenet 0 "We never sell personal data." "never sell personal data"
node scripts/play.mjs activate 0          # the page must carry your address and the anchor
# edit the page so that the anchor disappears, then:
node scripts/play.mjs inspect 0 --as watcher     # WARNED
# wait for the cure time, leave the page broken:
node scripts/play.mjs inspect 0 --as watcher     # BROKEN
node scripts/play.mjs collect --as watcher
```

## Limitations

- **The bond is only as strong as the beneficiary is independent.** A publisher who controls the beneficiary account can slash their own bond at no cost. Read `beneficiary` before trusting a covenant.
- **Dynamic pages disagree with themselves.** A page whose text changes between two fetches (a clock, rotating ads) can make validators disagree about the arithmetic results, so readings fail to settle. Use stable pages.
- **Anchors are exact and immutable.** Rewording a promise breaks its anchor, by design. Anchors are searched in the first 60,000 characters of visible text (400,000 characters of HTML); words split by markup inside a word (`ne<b>ver</b>`) do not match, words separated by tags do.
- **The inspector does not read the whole page.** It sees the start and the surroundings of anchors. A contradiction elsewhere on a long page is only caught if an anchor leads the inspector there.
- **Freshness has day resolution.** A date counts from midnight UTC, so the smallest sensible `max_age` is a day or two.
- **Nobody is obliged to inspect.** A covenant that nobody reads matures clean. Look at `readings`, `clean` and `changes` before treating a record as meaningful.
- **Payouts are credits.** The contract cannot confirm that an emitted transfer arrived; the live run checks the contract's balance after each `collect`.
- **Not audited.** The suite runs in the direct runner and the contract passes `genvm-lint`; the live report in `reports/` appears only after you run it.

## Layout

```
contracts/plumbline.py        the contract
tests/direct/                 local test suite (genlayer-test direct runner)
tests/mutate.py               mutation check of the suite
scripts/deploy.mjs            deploys to Studionet
scripts/e2e.mjs               live test run with reports
scripts/play.mjs              hand-play command line
scripts/keys.mjs              creates and funds test accounts
scripts/run-all.sh            lint + local tests + live run
.devcontainer/                GitHub Codespaces setup
```
