"""Mutation check of the test suite.

Each mutation breaks one rule of the contract on purpose. The suite must then fail; a mutation that survives means a rule
that no test protects. Run:  python3 tests/mutate.py [name-substring ...]
The mutations are applied to a throw-away copy of the project, so the real contract is never touched.

The run is resumable: results are appended to a tab-separated file (MUT_RESULTS, default in the temp directory) and
mutations already in it are skipped. MUT_BUDGET (seconds) makes the script stop between two mutations once it is spent,
so a long check can be run in several short sessions. Delete the results file to start over."""

import os
import shutil
import subprocess
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(tempfile.gettempdir(), "plumbline-mutation")
RESULTS = os.environ.get("MUT_RESULTS", os.path.join(tempfile.gettempdir(), "plumbline-mutation-results.tsv"))
BUDGET = float(os.environ.get("MUT_BUDGET", "0")) or None
CONTRACT = os.path.join(WORK, "contracts", "plumbline.py")

M = []


def m(name, old, new):
    M.append((name, old, new))


# constants
m("min bond lowered", "MIN_BOND = 10**16", "MIN_BOND = 10**15")
m("finder share changed", "FINDER_BPS = 500", "FINDER_BPS = 400")
m("closer share changed", "CLOSER_BPS = 1_000", "CLOSER_BPS = 900")
m("three cures allowed", "MAX_CURES = 2", "MAX_CURES = 3")
m("dark limit lowered", "DARK_LIMIT = 3", "DARK_LIMIT = 2")
m("resolve grace shortened", "RESOLVE_GRACE = 14 * 86400", "RESOLVE_GRACE = 7 * 86400")
m("log size changed", "LOG_SIZE = 12", "LOG_SIZE = 10")
m("max open raised", "MAX_OPEN = 6", "MAX_OPEN = 7")
m("max tenets raised", "MAX_TENETS = 6", "MAX_TENETS = 7")
m("min quote lowered", "MIN_QUOTE = 12", "MIN_QUOTE = 4")
# classification
m("steering is soft", '''    if res["steer"]:
        hard.append("steering")''', '''    if res["steer"]:
        pass''')
m("unbound ignored", 'if not res["bound"]:', "if False:")
m("stale ignored", 'if res["stale"]:\n        hard.append("stale")', 'if False:\n        hard.append("stale")')
m("anchor ignored", "if not ok:\n            hard.append", "if False:\n            hard.append")
m("contradiction is soft", 'if t["status"] == CONTRADICTED:\n            hard.append(f"contradiction:{i + 1}")', 'if False:\n            hard.append(f"contradiction:{i + 1}")')
# validators
m("accepts a lenient leader", 'if status == HELD and b["status"] != HELD:\n            return False', "pass")
m("accepts a lone contradiction", "if (status == CONTRADICTED) != (b[\"status\"] == CONTRADICTED):\n            return False", "pass")
m("accepts unverified quotes", "if len(q) < MIN_QUOTE or q not in text:\n                return False", "pass")
m("accepts other anchors", 'anchors != mine["anchors"] or any', "False or any")
m("accepts other dates", 'or theirs["dated"] != mine["dated"]', "")
m("accepts other flags", "or theirs[key] != mine[key]", "")
m("accepts bad digest", 'if not isinstance(digest, str) or (digest and _HEX64.match(digest) is None):\n        return False', "pass")
m("accepts bad note", 'return _plain(theirs.get("note"), MAX_NOTE)', "return True")
m("accepts unreadable mismatch", 'or theirs.get("kind") != mine.get("kind"):', ":")
# reading
m("unverified quotes believed", "if len(q) < MIN_QUOTE or q not in norm:", "if False:")
m("steering page may earn held", "if steer and status == HELD:", "if False:")
m("missing date is fresh", "stale = max_age > 0 and (latest is None or now - latest > max_age)", "stale = max_age > 0 and (latest is not None and now - latest > max_age)")
m("future dates count", "usable = [t for t in found if t is not None and t <= now + FUTURE_SLACK]", "usable = [t for t in found if t is not None]")
m("stale boundary", "now - latest > max_age", "now - latest >= max_age")
m("bound check off", "bound = (not token) or token in norm", "bound = True")
m("anchor match is case sensitive", "anchors = [(not a) or _norm(a) in norm for _t, a in tenets]", "anchors = [(not a) or a in norm for _t, a in tenets]")
m("every tenet counted held", "if status not in ASKED:\n            status, quote = UNSURE, \"\"", "if False:\n            status, quote = UNSURE, \"\"")
# state machine
m("drift does not cure", "elif st == WARNED and kind in (CLEAN, DRIFT):", "elif st == WARNED and kind == CLEAN:")
m("break one second early", "elif st == WARNED and now >= int(c.cure_by):", "elif st == WARNED:")
m("break one second late", "elif st == WARNED and now >= int(c.cure_by):", "elif st == WARNED and now > int(c.cure_by):")
m("third breach waits", "if int(c.cures) >= MAX_CURES:", "if int(c.cures) > MAX_CURES:")
m("finder not remembered", "c.finder = by\n                    self.n_warned", "self.n_warned")
m("cure keeps the finder", "c.finder = _zero()\n            self.n_cured", "self.n_cured")
m("cure does not count", "c.cures = u32(int(c.cures) + 1)", "pass")
m("dark streak never resets", "else:\n                c.dark = u32(0)\n        is_hard", "else:\n                pass\n        is_hard")
m("dark promotion boundary", "now - int(c.dark_since) >= int(c.cure_secs)", "now - int(c.dark_since) > int(c.cure_secs)")
m("dark clock restarts", "if int(c.dark) == 0:\n                    c.dark_since = u64(now)", "if True:\n                    c.dark_since = u64(now)")
m("log ring overwrites the first slot", "c.log[slot % LOG_SIZE] = entry", "c.log[0] = entry")
m("log read order wrong", "[(total + k) % LOG_SIZE for k in range(LOG_SIZE)]", "[k for k in range(LOG_SIZE)]")
m("page change not counted", "c.changes = u32(int(c.changes) + 1)", "pass")
# time rules
m("gap boundary", "now < int(c.last_at) + int(c.min_gap)", "now <= int(c.last_at) + int(c.min_gap)")
m("gap ignored", "if int(c.n_readings) > 0 and now < int(c.last_at) + int(c.min_gap):", "if False:")
m("inspect after term end", "if st == ACTIVE and now >= int(c.ends_at):", "if st == ACTIVE and now > int(c.ends_at):")
m("mature boundary", "if now < int(c.ends_at):\n                raise gl.vm.UserError(\"The term has not ended.\")", "if now <= int(c.ends_at):\n                raise gl.vm.UserError(\"The term has not ended.\")")
m("mature ignores the cure time", "max(int(c.ends_at), int(c.cure_by)) + RESOLVE_GRACE", "int(c.ends_at) + RESOLVE_GRACE")
m("mature ignores a warning", "if now < max(int(c.ends_at), int(c.cure_by)) + RESOLVE_GRACE:", "if False:")
m("unconfirmed warning counts as kept", "if st == ACTIVE:  # a warning nobody confirmed does not count as a clean record", "if True:")
m("term starts at creation", "c.ends_at = u64(now + int(c.term))", "c.ends_at = u64(int(c.created) + int(c.term))")
# money
m("publisher bounty not redirected (finder)", "self._credit(finder if finder != c.publisher else ben, f_share)", "self._credit(finder, f_share)")
m("publisher bounty not redirected (closer)", "self._credit(closer if closer != c.publisher else ben, k_share)", "self._credit(closer, k_share)")
m("beneficiary loses the rest", "self._credit(ben, bond - f_share - k_share)", "self._credit(ben, bond - f_share)")
m("closer share lost", "self._credit(closer if closer != c.publisher else ben, k_share)", "pass")
m("collect does not clear", "self.credits[key] = u256(0)\n        self.owed", "self.owed")
m("collect keeps owed", "self.owed = u256(int(self.owed) - amount)\n        self.paid", "self.paid")
m("collect pays nothing", "_Wire(who).emit_transfer(value=u256(amount))", "pass")
m("collect pays double", "_Wire(who).emit_transfer(value=u256(amount))", "_Wire(who).emit_transfer(value=u256(amount * 2))")
m("slash leaves the bond", "c.bond = u256(0)\n        self.locked = u256(int(self.locked) - bond)\n        self._close(c, BROKEN", "self.locked = u256(int(self.locked) - bond)\n        self._close(c, BROKEN")
m("slash keeps locked", "c.bond = u256(0)\n        self.locked = u256(int(self.locked) - bond)\n        self._close(c, BROKEN", "c.bond = u256(0)\n        self._close(c, BROKEN")
m("return keeps locked", "c.bond = u256(0)\n        self.locked = u256(int(self.locked) - bond)\n\n    def _credit", "c.bond = u256(0)\n\n    def _credit")
m("top up not locked", "self.locked = u256(int(self.locked) + value)", "pass")
m("top up not deposited", "self.deposited = u256(int(self.deposited) + value)", "pass")
m("create not locked", "self.locked = u256(int(self.locked) + bond)\n        return cid", "return cid")
m("cancel keeps the bond", "self._return_bond(c)\n        self._close(c, CANCELLED", "self._close(c, CANCELLED")
m("mature keeps the bond", "self._return_bond(c)\n        self._close(c, MATURED", "self._close(c, MATURED")
# roles and validation
m("anyone adds tenets", "self._publisher_only(c)\n        if int(c.status) != NEW:\n            raise gl.vm.UserError(\"Tenets can only be added before activation.\")", "if int(c.status) != NEW:\n            raise gl.vm.UserError(\"Tenets can only be added before activation.\")")
m("anyone activates", "self._publisher_only(c)\n        if int(c.status) != NEW:\n            raise gl.vm.UserError(\"Only a draft can be activated.\")", "if int(c.status) != NEW:\n            raise gl.vm.UserError(\"Only a draft can be activated.\")")
m("anyone cancels", "self._publisher_only(c)\n        if int(c.status) != NEW:\n            raise gl.vm.UserError(\"Only a draft can be cancelled.\")", "if int(c.status) != NEW:\n            raise gl.vm.UserError(\"Only a draft can be cancelled.\")")
m("anyone tops up", "self._publisher_only(c)\n        if int(c.status) not in LIVE:", "if int(c.status) not in LIVE:")
m("beneficiary may be publisher", "dest == _zero() or dest == publisher or", "dest == _zero() or")
m("no page uniqueness", "if int(self.pages.get(pkey, 0)) != 0:", "if False:")
m("no open cap", "if int(self.open_n.get(key, 0)) >= MAX_OPEN:", "if False:")
m("page not freed", 'self.pages[f"{key}:{str(c.ukey)}"] = u32(0)', "pass")
m("open count not freed", "self.open_n[key] = u32(max(0, int(self.open_n.get(key, 0)) - 1))", "pass")
m("steering tenets allowed", "if _steers(text):\n            raise gl.vm.UserError(\"A tenet may not try to steer the inspector.\")", "pass")
m("duplicate tenets allowed", "if _norm(t.text) == _norm(text):", "if False:")
m("inspect drafts", "if st not in (ACTIVE, WARNED):", "if st not in (NEW, ACTIVE, WARNED):")
m("activate on drift", "if kind == CLEAN:\n            c.status = u8(ACTIVE)", "if kind != BREACH:\n            c.status = u8(ACTIVE)")
m("activation needs no tenet", "if len(c.tenets) < 1:", "if False:")
m("term limit lifted", "if term < MIN_TERM or term > MAX_TERM:", "if term < MIN_TERM:")
m("bond limit lifted", "if bond < MIN_BOND or bond > MAX_BOND:", "if bond < MIN_BOND:")
m("url key keeps www", 'if host.startswith("www."):\n        host = host[4:]', "pass")
m("ports allowed", 'if port not in ("80", "443"):\n            return False', "pass")
m("ip hosts allowed", "if all(x.isdigit() for x in labels[i:i + 4]):\n            return False", "pass")
m("tracking kept", "if p and not p.lower().startswith(_TRACKING)", "if p")
m("page size cap lifted", "limit = max(0, min(limit, MAX_PAGE))\n        out = []\n        i = len(self.covenants) - 1", "limit = max(0, limit)\n        out = []\n        i = len(self.covenants) - 1")
m("broken record not counted", "self.broken[key] = u32(int(self.broken.get(key, 0)) + 1)", "pass")
m("kept record not counted", "self.kept[key] = u32(int(self.kept.get(key, 0)) + 1)", "pass")


def run(timeout=600):
    p = subprocess.run(
        [sys.executable, "-m", "pytest", "-x", "-q", "--ff", "--ignore=tests/direct/test_fuzz.py", "tests/direct"],
        capture_output=True, text=True, timeout=timeout, cwd=WORK,
    )
    return p.returncode


def done():
    if not os.path.exists(RESULTS):
        return {}
    out = {}
    for line in open(RESULTS):
        name, _, verdict = line.rstrip("\n").partition("\t")
        if name:
            out[name] = verdict
    return out


def main(argv):
    started = time.time()
    if not os.path.isdir(WORK):
        shutil.copytree(ROOT, WORK, ignore=shutil.ignore_patterns(".git", "node_modules", "__pycache__", "artifacts", "reports"))
    original = os.path.join(WORK, "contracts", "plumbline.py")
    with open(os.path.join(ROOT, "contracts", "plumbline.py")) as f:
        src = f.read()
    with open(original, "w") as f:
        f.write(src)
    wanted = [a.lower() for a in argv]
    known = done()
    for name, old, new in M:
        if wanted and not any(w in name.lower() for w in wanted):
            continue
        if name in known:
            continue
        if BUDGET and time.time() - started > BUDGET:
            print("budget spent, run again to continue", flush=True)
            break
        if src.count(old) != 1:
            verdict = f"SKIPPED (pattern found {src.count(old)} times)"
        else:
            with open(CONTRACT, "w") as f:
                f.write(src.replace(old, new, 1))
            t = time.time()
            try:
                code = run()
            except subprocess.TimeoutExpired:
                code = 1
            verdict = "killed" if code else "SURVIVED"
            print(f"{verdict:9} {name}  ({time.time() - t:.0f}s)", flush=True)
            with open(CONTRACT, "w") as f:
                f.write(src)
        if verdict.startswith("SKIPPED"):
            print(f"{verdict}  {name}", flush=True)
        with open(RESULTS, "a") as f:
            f.write(f"{name}\t{verdict}\n")
    known = done()
    bad = {n: v for n, v in known.items() if v != "killed"}
    todo = [n for n, _o, _n in M if n not in known and (not wanted or any(w in n.lower() for w in wanted))]
    print(f"\n{sum(1 for v in known.values() if v == 'killed')} killed, {len(bad)} not killed, {len(todo)} still to run")
    for n, v in bad.items():
        print("  ", v, "-", n)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
