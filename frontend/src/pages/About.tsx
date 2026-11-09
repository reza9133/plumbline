import { Link } from 'react-router-dom';
import { Github } from 'lucide-react';
import { CHAIN, CONTRACT_ADDRESS, LINKS, explorerAddress } from '../config';
import { BuiltOnGenLayer, GenLayerLogo, PlumbMark } from '../components/Logo';
import { MochiFull } from '../components/Mochi';
import { RetryImg } from '../components/RetryImg';
import { Address } from '../components/ui';
import { XIcon } from '../components/Layout';

export default function About() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="grid items-center gap-10 md:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="eyebrow mb-2">About</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Plumbline</h1>
          <div className="prose-doc mt-4">
            <p>
              A plumb line shows whether a wall is still straight. This contract shows whether a page still
              says what it said when the bond was posted: a warrant canary, a "we never sell your data"
              clause, a price or API-stability promise, a security contact, a retention period.
            </p>
            <p>
              It is an Intelligent Contract for{' '}
              <a href={LINKS.genlayer} target="_blank" rel="noreferrer">
                GenLayer
              </a>
              , written in Python for GenVM and deployed on Studionet. Validators fetch the page themselves,
              plain code computes the hard evidence, and an AI inspector may only add alarms, never remove
              one.
            </p>
            <p>
              This web app reads the contract directly from the network and sends transactions through
              whichever wallet you connect, discovered with EIP-6963. There is no server and no database:
              everything you see is on chain.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className="btn" href={LINKS.github} target="_blank" rel="noreferrer">
              <Github className="h-4 w-4" /> Source on GitHub
            </a>
            <a className="btn" href={LINKS.x} target="_blank" rel="noreferrer">
              <XIcon /> @amirhp771
            </a>
            <BuiltOnGenLayer />
          </div>
        </div>
        <div className="mx-auto w-48 md:w-full md:max-w-[260px]">
          <MochiFull />
        </div>
      </div>

      <section className="card-pad mt-12">
        <h2 className="mb-4 text-2xl font-semibold">Deployment</h2>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-[180px_1fr]">
          <dt className="text-muted">Network</dt>
          <dd className="font-semibold">
            {CHAIN.name} (chain {CHAIN.id})
          </dd>
          <dt className="text-muted">Contract</dt>
          <dd>
            <Address value={CONTRACT_ADDRESS} full />
          </dd>
          <dt className="text-muted">Explorer</dt>
          <dd>
            <a className="link" href={explorerAddress(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer">
              {explorerAddress(CONTRACT_ADDRESS)}
            </a>
          </dd>
          <dt className="text-muted">RPC</dt>
          <dd className="break-all font-mono text-xs">{CHAIN.rpc}</dd>
        </dl>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          [
            <PlumbMark key="a" size={44} swing />,
            'The mark',
            'A brass plumb bob on a line, circled by the bond ring.',
          ],
          [
            <GenLayerLogo key="b" className="h-10 w-10" />,
            'GenLayer',
            'Shown to credit the network the contract runs on.',
          ],
          [
            <RetryImg key="c" src="/mochi/mochi-head-sm.webp" alt="" className="h-11 w-11" />,
            'Mochi',
            'The mascot: cat helmet, red hoodie, a screen where the face should be.',
          ],
        ].map(([icon, t, d], i) => (
          <div key={i} className="card-pad">
            <div className="mb-3">{icon}</div>
            <h3 className="text-lg font-semibold">{t as string}</h3>
            <p className="mt-1 text-sm text-muted">{d as string}</p>
          </div>
        ))}
      </section>

      <p className="mt-10 text-sm text-muted">
        Studionet is a test network. GEN on it has no monetary value, and the contract has not been audited.
        Read the limitations in the{' '}
        <Link className="link" to="/docs/limitations">
          documentation
        </Link>{' '}
        before relying on any covenant.
      </p>
    </div>
  );
}
