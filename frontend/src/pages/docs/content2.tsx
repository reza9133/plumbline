import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Callout, Code, Method, Table } from './parts';
import { LIMITS, splitBond } from '../../lib/rules';
import { gen, parseGen } from '../../lib/format';
import { MochiSays } from '../../components/Mochi';

export function Money() {
  const [v, setV] = useState('1');
  const wei = parseGen(v);
  const s = wei && wei > 0n ? splitBond(wei) : null;
  return (
    <>
      <p>
        Everything is booked per covenant and in four totals, and <code>solvency()</code> shows that{' '}
        <code>deposited = paid + owed + locked</code> at all times. The <Link to="/ledger">Ledger</Link> page
        shows it live.
      </p>
      <h2 id="bond">The bond</h2>
      <p>
        Attached to <code>create_covenant</code>, increased by <code>top_up</code>, never withdrawn while the
        covenant lives. Between 0.01 GEN and 10<sup>9</sup> GEN.
      </p>
      <h2 id="slash">Slash</h2>
      <p>
        When a covenant is BROKEN: <b>5%</b> of the bond to the <b>finder</b> (whoever opened the warning),{' '}
        <b>10%</b> to the <b>closer</b> (whoever confirmed it after the cure time), the rest to the{' '}
        <b>beneficiary</b>. A share that would go to the publisher goes to the beneficiary instead, so a
        publisher cannot buy their own bounty back. Shares round down; nothing is lost. When a covenant is
        broken for good after two cures, the same person is both finder and closer.
      </p>
      <div className="card-pad my-6">
        <label className="label" htmlFor="calc">
          Bond (GEN)
        </label>
        <input
          id="calc"
          className="input max-w-xs font-mono"
          value={v}
          onChange={(e) => setV(e.target.value)}
          inputMode="decimal"
        />
        {s ? (
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">Finder 5%</dt>
              <dd className="font-mono font-semibold">{gen(s.finder, 6)}</dd>
            </div>
            <div>
              <dt className="text-muted">Closer 10%</dt>
              <dd className="font-mono font-semibold">{gen(s.closer, 6)}</dd>
            </div>
            <div>
              <dt className="text-muted">Beneficiary</dt>
              <dd className="font-mono font-semibold">{gen(s.beneficiary, 6)}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted">Enter an amount.</p>
        )}
      </div>
      <h2 id="return">Return</h2>
      <p>When a covenant is MATURED or CANCELLED the bond becomes a credit of the publisher.</p>
      <h2 id="pull">Pull payments</h2>
      <p>
        Slashes and returns create <i>credits</i>; <code>collect()</code> pays everything the caller is owed
        and clears the credit <i>before</i> the transfer is emitted. The contract cannot confirm that an
        emitted transfer arrived; the live test run checks the contract's balance after each collect.
      </p>
      <Callout kind="tip">
        Incentives are honest: a clean inspection earns nothing. Inspectors are paid only for catching a
        breach, so a covenant nobody has reason to doubt may never be read.
      </Callout>
    </>
  );
}

export function Roles() {
  return (
    <>
      <Table
        head={['Role', 'What it does']}
        rows={[
          [
            'Publisher',
            'Creates a covenant and locks the bond, adds tenets, activates, may top up the bond, may cancel a draft. Cannot withdraw a live bond.',
          ],
          [
            'Beneficiary',
            'Named at creation, never changeable, never the publisher. Receives the bond if the covenant breaks.',
          ],
          [
            'Inspector',
            'Anyone. Reads the page of a live covenant (inspect). Earns a bounty for catching a breach.',
          ],
          ['Stranger', 'Anyone can mature a covenant whose term is over and collect what they are owed.'],
        ]}
      />
      <h2 id="matrix">Who can call what</h2>
      <Table
        head={['Method', 'Publisher', 'Anyone else', 'State required']}
        rows={[
          ['create_covenant', 'yes (payable)', 'yes, becoming the publisher', '—'],
          ['add_tenet', 'yes', 'no', 'NEW'],
          ['activate', 'yes', 'no', 'NEW with at least one tenet'],
          ['cancel', 'yes', 'no', 'NEW'],
          ['top_up', 'yes (payable)', 'no', 'NEW, ACTIVE or WARNED'],
          ['inspect', 'yes', 'yes', 'ACTIVE (before the term ends) or WARNED'],
          ['mature', 'yes', 'yes', 'ACTIVE after the term, or WARNED long after'],
          ['collect', 'yes', 'yes (your own credit)', '—'],
        ]}
      />
    </>
  );
}

export function Limits() {
  const L = LIMITS;
  return (
    <>
      <p>Enforced by the contract. The forms in this app check the same numbers before you sign anything.</p>
      <Table
        head={['Limit', 'Value']}
        rows={[
          ['Bond', '0.01 GEN to 10^9 GEN'],
          [
            'Tenets per covenant',
            `1 to ${L.maxTenets}; text ${L.minTenet}-${L.maxTenet} characters; anchor ${L.minAnchor}-${L.maxAnchor} characters (or none); no duplicates; no steering text`,
          ],
          ['Title', `${L.minTitle}-${L.maxTitle} characters`],
          ['Term', '1 minute to 366 days'],
          ['Cure time', '1 minute to 30 days'],
          ['Gap between readings', '1 minute to 7 days'],
          ['Freshness limit (max_age)', '0 (off) or 1 hour to 3650 days'],
          ['Cures per covenant', `${L.maxCures}`],
          [
            'Unreadable readings that count as a breach',
            `${L.darkLimit} in a row, spread over at least the cure time`,
          ],
          ['Live covenants per publisher', `${L.maxOpen}, and one per page`],
          ['Reading log', `the newest ${L.logSize} readings per covenant (a ring buffer)`],
          [
            'Page links',
            `http(s) with a real domain, at most ${L.maxUrl} ASCII characters; no IP literals, no credentials, no custom ports, no local or wildcard-DNS hosts`,
          ],
          ['Grace for an unconfirmed warning', '14 days after both the term and the cure time'],
          [
            'Page size read',
            '60,000 characters of visible text (400,000 of HTML); excerpt for the AI at most 6,000',
          ],
          ['Page size of lists', 'list_covenants and covenants_of return at most 50 at a time'],
        ]}
      />
    </>
  );
}

export function ContractRef() {
  return (
    <>
      <p>
        Writes use <code>gl.public.write</code>; views return JSON strings unless noted. Addresses are passed
        as plain 0x… strings, amounts as wei attached to the transaction, durations in seconds.
      </p>
      <Callout>
        The deployed contract is on Studionet. Its address is shown in the footer of every page and on the{' '}
        <Link to="/about">About</Link> page.
      </Callout>
      <h2 id="writes">Writes</h2>
      <Method
        name="create_covenant"
        payable
        who="anyone → publisher"
        sig="create_covenant(title: str, url: str, beneficiary: str, term: int, cure_secs: int, min_gap: int, max_age: int, bound: bool) -> int"
        returns="the new covenant id."
      >
        <p>
          Drafts a covenant and locks the attached value as its bond. <code>term</code> is how long it is
          watched once active; <code>cure_secs</code> the time to repair the page after a warning;{' '}
          <code>min_gap</code> the smallest distance between two readings; <code>max_age</code> (0 for off)
          requires the newest date on the page to be no older than that many seconds; <code>bound</code>{' '}
          requires the publisher's address on the page.
        </p>
      </Method>
      <Method
        name="add_tenet"
        who="publisher, draft only"
        sig="add_tenet(covenant_id: int, text: str, anchor: str) -> int"
        returns="the number of tenets."
      >
        <p>Adds one promise (and an optional anchor; pass an empty string for none). At most six.</p>
      </Method>
      <Method
        name="activate"
        who="publisher"
        sig="activate(covenant_id: int) -> int"
        returns="the reading kind (0 clean, 1 drift, 2 breach, 3 dark)."
      >
        <p>Strict reading. The covenant goes live only if the reading is clean. The term starts now.</p>
      </Method>
      <Method name="cancel" who="publisher, draft only" sig="cancel(covenant_id: int) -> None">
        <p>The bond becomes a credit of the publisher.</p>
      </Method>
      <Method name="top_up" payable who="publisher" sig="top_up(covenant_id: int) -> None">
        <p>Adds to a live covenant's bond.</p>
      </Method>
      <Method name="inspect" who="anyone" sig="inspect(covenant_id: int) -> int" returns="the reading kind.">
        <p>
          Reads the page of a covenant under watch. Readings are at least <code>min_gap</code> apart.
        </p>
      </Method>
      <Method name="mature" who="anyone" sig="mature(covenant_id: int) -> None">
        <p>After the term, the bond becomes the publisher's credit.</p>
      </Method>
      <Method name="collect" who="anyone" sig="collect() -> int" returns="the amount paid, in wei.">
        <p>Pays the caller's credits.</p>
      </Method>

      <h2 id="views">Views</h2>
      <Table
        head={['View', 'Returns']}
        rows={[
          [<code key="a">get_covenant(id)</code>, 'one covenant as JSON (all fields below)'],
          [<code key="b">list_covenants(offset, limit)</code>, 'newest first, at most 50'],
          [
            <code key="c">covenants_of(address, offset, limit)</code>,
            "one publisher's covenants, newest first",
          ],
          [<code key="d">readings_of(id)</code>, 'the newest 12 readings, oldest first'],
          [<code key="e">credit_of(address)</code>, 'a number as text (wei)'],
          [<code key="f">record_of(address)</code>, '{ kept, broken, live }'],
          [
            <code key="g">stats()</code>,
            'totals: covenants, readings, warned, cured, broken, matured, cancelled, deposited, paid, owed, locked',
          ],
          [<code key="h">solvency()</code>, '{ deposited, paid, owed, locked, live_bonds, balanced }'],
        ]}
      />
      <h3 id="shape">Covenant JSON</h3>
      <Code lang="json">{`{
  "id": 0, "publisher": "0x…", "beneficiary": "0x…", "title": "…", "url": "https://…",
  "bound": true, "status": 1, "state": "ACTIVE",
  "created": 0, "term": 0, "active_since": 0, "ends_at": 0,
  "cure_secs": 0, "min_gap": 0, "max_age": 0,
  "bond": "wei", "topped": "wei", "slashed": "wei", "bounty": "wei",
  "warnings": 0, "cures": 0, "warned_at": 0, "cure_by": 0, "finder": "0x…",
  "dark": 0, "readings": 0, "clean": 0, "drift": 0, "breach": 0, "unreadable": 0,
  "changes": 0, "last_at": 0, "next_reading_at": 0, "closed_at": 0, "ended_note": "",
  "tenets": [{ "text": "…", "anchor": "…" }],
  "last": { "at": 0, "by": "0x…", "kind": "CLEAN", "hard": false, "detail": "", "note": "", "digest": "" }
}`}</Code>
      <p>
        Amounts are decimal strings of wei; timestamps are Unix seconds; the app parses amounts as{' '}
        <code>BigInt</code> and never as floating-point numbers.
      </p>

      <h2 id="errors">Errors the contract can raise</h2>
      <Table
        head={['Message', 'When']}
        rows={[
          ['The title needs 3 to 60 characters.', 'create_covenant'],
          ['The page must be a single public http(s) link.', 'create_covenant'],
          ['That is not a valid address.', 'create_covenant, covenants_of, credit_of, record_of'],
          [
            'The beneficiary must be another real account.',
            'zero address, the publisher, or the contract itself',
          ],
          ['The term / cure time / gap … has to be between …', 'out-of-range timing'],
          ['The freshness limit is 0 (off) or between 1 hour and 3650 days.', 'max_age'],
          ['The bond has to be between 0.01 GEN and 10^9 GEN.', 'attached value'],
          ['Too many live covenants for this publisher.', 'six live covenants already'],
          ['This publisher already has a live covenant on that page.', 'same page identity'],
          ['Only the publisher can do that.', 'add_tenet, activate, cancel, top_up'],
          ['Tenets can only be added before activation.', 'add_tenet'],
          [
            'A covenant holds at most six tenets. / A tenet needs 12 to 200 characters. / An anchor needs 3 to 80 characters (or none).',
            'add_tenet',
          ],
          [
            'A tenet may not try to steer the inspector. / That tenet is already in the covenant.',
            'add_tenet',
          ],
          ['Only a draft can be activated. / Add at least one tenet first.', 'activate'],
          ['The last reading is too recent. Wait for the gap between readings to pass.', 'activate, inspect'],
          ['The covenant is not under watch (drafts are read by `activate`).', 'inspect'],
          ['The term has ended. Call mature.', 'inspect'],
          ['The term has not ended. / An open warning has to be settled by an inspection first.', 'mature'],
          ['Only a covenant under watch can mature.', 'mature'],
          ['Only a draft can be cancelled.', 'cancel'],
          ['The covenant is over. / Attach the amount to add. / The bond would be too large.', 'top_up'],
          ['Nothing to collect.', 'collect'],
          ['No such covenant.', 'any call with an unknown id'],
        ]}
      />
      <MochiSays>
        <p>
          A refused call is not a failed network transaction: the validators accept it, the contract raises
          the message above, and nothing changes. The app shows the message so you do not have to dig in the
          receipt.
        </p>
      </MochiSays>
    </>
  );
}
