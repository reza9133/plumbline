import json

from conftest import *


def test_deploys_and_runs_the_happy_path(direct_vm, direct_deploy, ledger):
    c = deploy(direct_deploy, direct_vm)
    cid = live(c, direct_vm)
    assert inspect(c, direct_vm, P.watcher, cid, offset=10 + 700) == CLEAN
    row = crow(c, cid)
    assert row["state"] == "ACTIVE" and row["readings"] == 2 and row["clean"] == 2
    mature(c, direct_vm, cid, offset=10 + DAY)
    assert crow(c, cid)["state"] == "MATURED"
    assert credit(c, P.publisher) == BOND
    assert collect(c, direct_vm, P.publisher) == BOND
    assert ledger.to(P.publisher) == BOND
    assert books(c)["balanced"]
