"""Shared helpers for the direct-mode suite (genlayer-test fixtures)."""

import json
import sys
from datetime import datetime, timezone

import pytest

CONTRACT = "contracts/plumbline.py"
MODULE = "_contract_plumbline"
GEN = 10**18
BOND = GEN // 10  # 0.1 GEN

# covenant states and reading kinds (the numbers the contract reports)
NEW, ACTIVE, WARNED, BROKEN, MATURED, CANCELLED = range(6)
CLEAN, DRIFT, BREACH, DARK = range(4)
LIVE = (NEW, ACTIVE, WARNED)
FINAL = (BROKEN, MATURED, CANCELLED)

T0 = int(datetime(2026, 10, 20, 12, 0, 0, tzinfo=timezone.utc).timestamp())
DAY = 86400

URL = "https://policy.example.org/privacy"
URL_2 = "https://policy.example.org/security"
TITLE = "Privacy promise"
TENET_1 = "The service never sells personal data to third parties."
ANCHOR_1 = "never sell personal data"
TENET_2 = "Accounts are deleted within 30 days of a request."
ANCHOR_2 = "within 30 days"
SENT_1 = "We never sell personal data to third parties."
SENT_2 = "We delete every account within 30 days of a request."
BAD_SENT = "We may sell aggregated personal data to selected partners."
# real pages have more than a few lines of text; a very short page makes the contract try the rendered text as well
FILLER = (
    "This page is kept by the publisher of the service and describes in plain language how personal data is treated, "
    "who may see it and what every visitor can ask for at any time."
)


def hx(a) -> str:
    """Lower-case 0x form of an address object, raw bytes or a hex string."""
    if isinstance(a, str):
        return a.lower()
    if hasattr(a, "as_hex"):
        return str(a.as_hex).lower()
    return "0x" + bytes(a).hex()


def at(vm, offset: int) -> None:
    """Move the chain clock to T0 + offset seconds."""
    vm.warp(datetime.fromtimestamp(T0 + offset, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))


def act(vm, who, value: int = 0):
    """The next call is made by `who` and carries `value`."""
    try:
        vm.deal(who, 1000 * GEN)
    except Exception:
        pass
    vm.sender = who
    vm.value = value


class Wire:
    """Stands in for the chain-level transfer so that payouts can be inspected."""

    sent = []

    def __init__(self, who):
        self.who = who

    def emit_transfer(self, **kw):
        Wire.sent.append((hx(self.who), int(kw["value"])))


class Ledger:
    def __init__(self):
        Wire.sent = []

    @property
    def sent(self):
        return Wire.sent

    def to(self, who) -> int:
        key = hx(who)
        return sum(v for a, v in Wire.sent if a == key)

    def total(self) -> int:
        return sum(v for _, v in Wire.sent)

    def count(self) -> int:
        return len(Wire.sent)


@pytest.fixture
def ledger():
    return Ledger()


def _forget_contract_class() -> None:
    """The SDK keeps one contract class per process; drop it so every test can deploy afresh."""
    for name in ("genlayer.gl.genvm_contracts", "genlayer.genvm_contracts"):
        registry = sys.modules.get(name)
        if registry is not None and hasattr(registry, "__known_contract__"):
            registry.__known_contract__ = None


def deploy(direct_deploy, direct_vm):
    at(direct_vm, 0)
    direct_vm.check_pickling = True  # the closures handed to the VM must be serializable
    _forget_contract_class()
    c = direct_deploy(CONTRACT)
    mod = sys.modules[MODULE]
    mod._Wire = Wire
    Wire.sent = []
    return c


def stats(c) -> dict:
    return json.loads(c.stats())


def books(c) -> dict:
    return json.loads(c.solvency())


def _lowered(row):
    """The contract reports checksummed addresses; the tests compare lower-case ones."""
    if isinstance(row, dict):
        for k, v in row.items():
            if k in ("publisher", "beneficiary", "finder", "by") and isinstance(v, str):
                row[k] = v.lower()
            elif k == "last" and isinstance(v, dict):
                _lowered(v)
    return row


def crow(c, cid: int) -> dict:
    return _lowered(json.loads(c.get_covenant(cid)))


def readings(c, cid: int) -> list:
    return [_lowered(r) for r in json.loads(c.readings_of(cid))]


def credit(c, who) -> int:
    return int(c.credit_of(hx(who)))


def _actor(n: int) -> bytes:
    return bytes([0xB0, n]) + bytes(18)


class P:
    """Fixed actors, as raw 20-byte addresses."""

    publisher = _actor(1)
    publisher2 = _actor(2)
    beneficiary = _actor(3)
    watcher = _actor(4)
    watcher2 = _actor(5)
    stranger = _actor(6)
    extra = [_actor(20 + i) for i in range(30)]


ZERO_ADDRESS = "0x" + "0" * 40


# ---- the world: a page and an inspector -----------------------------------------------------------------------------


def page_html(sentences=(SENT_1, SENT_2), stamp="Last updated 2026-10-20.", token="", extra=""):
    body = "".join(f"<p>{s}</p>" for s in sentences)
    sig = f"<p>Published by {token}</p>" if token else ""
    return f"<html><body><h1>Privacy promise</h1><p>{stamp}</p>{body}{sig}{extra}<p>{FILLER}</p></body></html>"


def mock_page(vm, body=None, status=200, pattern=r"policy\.example\.org"):
    vm.mock_web(pattern, {"status": status, "body": body if body is not None else page_html()})


def inspector_reply(statuses=("HELD", "HELD"), quotes=(SENT_1, SENT_2), note="The page still says it."):
    rows = []
    for i, st in enumerate(statuses):
        q = quotes[i] if i < len(quotes) else ""
        rows.append({"n": i + 1, "status": st, "quote": q})
    return {"tenets": rows, "note": note}


def mock_inspector(vm, statuses=("HELD", "HELD"), quotes=(SENT_1, SENT_2), note="The page still says it.", raw=None):
    vm.mock_llm(r"plumbline inspector", raw if raw is not None else json.dumps(inspector_reply(statuses, quotes, note)))


def world(vm, statuses=("HELD", "HELD"), quotes=(SENT_1, SENT_2), page=None, status=200, **kw):
    """Fresh mocks: the page and the inspector's answer."""
    vm.clear_mocks()
    mock_page(vm, body=page, status=status)
    mock_inspector(vm, statuses, quotes, **kw)


# ---- actions ----------------------------------------------------------------------------------------------------------


def create(
    c, vm, publisher=P.publisher, bond=BOND, title=TITLE, url=URL, beneficiary=P.beneficiary, term=DAY, cure=3600,
    gap=600, max_age=0, bound=False,
) -> int:
    act(vm, publisher, bond)
    cid = c.create_covenant(title, url, hx(beneficiary), term, cure, gap, max_age, bound)
    vm.value = 0
    return cid


def tenet(c, vm, cid, text=TENET_1, anchor=ANCHOR_1, who=P.publisher):
    act(vm, who)
    return c.add_tenet(cid, text, anchor)


def draft(c, vm, publisher=P.publisher, anchors=True, **kw) -> int:
    """A draft with the two standard tenets."""
    cid = create(c, vm, publisher, **kw)
    tenet(c, vm, cid, TENET_1, ANCHOR_1 if anchors else "", publisher)
    tenet(c, vm, cid, TENET_2, ANCHOR_2 if anchors else "", publisher)
    return cid


def activate(c, vm, cid, who=None, offset=None, **kw):
    """Activate with a clean world (or the given page / statuses) at `offset` (or now)."""
    world(vm, **kw)
    if offset is not None:
        at(vm, offset)
    act(vm, who if who is not None else bytes.fromhex(crow(c, cid)["publisher"][2:]))
    return c.activate(cid)


def live(c, vm, publisher=P.publisher, offset=10, **kw) -> int:
    """An active covenant (two tenets, clean page), activated at `offset`."""
    bound = kw.get("bound", False)
    cid = draft(c, vm, publisher, **kw)
    page = page_html(token=hx(publisher) if bound else "")
    kind = activate(c, vm, cid, publisher, offset, page=page)
    assert kind == CLEAN and crow(c, cid)["status"] == ACTIVE
    return cid


def inspect(c, vm, who, cid, offset=None, statuses=("HELD", "HELD"), quotes=(SENT_1, SENT_2), page=None, status=200, **kw):
    world(vm, statuses, quotes, page=page, status=status, **kw)
    if offset is not None:
        at(vm, offset)
    act(vm, who)
    return c.inspect(cid)


def breach_page(token=""):
    """The first anchor is gone: a hard breach on its own."""
    return page_html(sentences=("We value your privacy.", SENT_2), token=token)


def contradicted_page(token=""):
    """The anchor text is still there, but another sentence says the opposite."""
    return page_html(sentences=(SENT_1, SENT_2, BAD_SENT), token=token)


ACT = 10  # `live` activates at this offset; the term is one day, the cure time one hour, the gap ten minutes
ENDS = ACT + DAY


def warned(c, vm, cid, who=P.watcher, offset=ACT + 700):
    inspect(c, vm, who, cid, offset=offset, page=breach_page())
    assert crow(c, cid)["state"] == "WARNED"
    return offset


def broken(c, vm, cid, finder=P.watcher, closer=P.watcher2):
    t = warned(c, vm, cid, finder)
    inspect(c, vm, closer, cid, offset=t + 3600, page=breach_page())
    assert crow(c, cid)["state"] == "BROKEN"
    return t + 3600


def mature(c, vm, cid, who=P.stranger, offset=None):
    if offset is not None:
        at(vm, offset)
    act(vm, who)
    return c.mature(cid)


def collect(c, vm, who):
    act(vm, who)
    return c.collect()


def fingerprint(c) -> str:
    """Everything observable about the contract, so that a refused call can be shown to change nothing."""
    s = stats(c)
    return json.dumps(
        [s, books(c), [crow(c, i) for i in range(s["covenants"])], [readings(c, i) for i in range(s["covenants"])], list(Wire.sent)],
        sort_keys=True,
    )


def refuse(c, vm, msg, fn, *args, who=None, value=0):
    """The call must be refused with `msg` in the error, and it must leave the contract exactly as it was."""
    if who is not None:
        act(vm, who, value)
    before = fingerprint(c)
    with vm.expect_revert(msg):
        fn(*args)
    vm.value = 0
    assert fingerprint(c) == before, "a refused call changed the contract"


def fresh(direct_deploy, direct_vm):
    """A deployed contract."""
    return deploy(direct_deploy, direct_vm)


# ---- fixtures shared by the test files ------------------------------------------------------------------------------


@pytest.fixture
def c(direct_vm, direct_deploy):
    return deploy(direct_deploy, direct_vm)


@pytest.fixture
def vm(direct_vm):
    return direct_vm


@pytest.fixture
def mod(c):
    return sys.modules[MODULE]
