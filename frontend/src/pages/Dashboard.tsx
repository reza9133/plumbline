import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Coins, Plug } from 'lucide-react';
import { useAllCovenants, useCovenantsOf, useCredit, useDemo, useRecord } from '../chain/hooks';
import { CovenantCard } from '../components/CovenantCard';
import { Address, EmptyState, GenAmount, Stat } from '../components/ui';
import { PlumbSpinner } from '../components/Spinners';
import { useTx } from '../tx/TxProvider';
import { planCollect } from '../tx/plans';
import { useWallet } from '../wallet/WalletProvider';
import { sameAddress } from '../lib/format';

export default function Dashboard() {
  const { account, status, openModal } = useWallet();
  const tx = useTx();
  const demo = useDemo();
  const credit = useCredit(account);
  const record = useRecord(account);
  const mine = useCovenantsOf(account);
  const all = useAllCovenants();

  const asBeneficiary = useMemo(
    () => (all.data ?? []).filter((c) => sameAddress(c.beneficiary, account)),
    [all.data, account],
  );
  const asFinder = useMemo(
    () => (all.data ?? []).filter((c) => sameAddress(c.finder, account) && c.state === 'WARNED'),
    [all.data, account],
  );

  if (status !== 'connected' || !account) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          title="Connect a wallet to see your account"
          action={
            <button className="btn-primary" onClick={openModal}>
              <Plug className="h-4 w-4" /> Connect wallet
            </button>
          }
        >
          Your covenants, your record and the credit waiting for you are read from the contract using your
          address.
        </EmptyState>
      </div>
    );
  }
  const owed = credit.data ?? 0n;
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <p className="eyebrow mb-2">My account</p>
      <h1 className="text-4xl font-semibold sm:text-5xl">Your covenants and credit</h1>
      <p className="mt-2">
        <Address value={account} full />
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="card-pad md:col-span-2">
          <p className="label mb-1">Credit you can collect</p>
          {credit.isLoading ? (
            <PlumbSpinner size={30} />
          ) : (
            <GenAmount wei={owed} className="text-4xl font-semibold text-brass" decimals={6} />
          )}
          <p className="mt-1 text-sm text-muted">
            Returned bonds, slashed bonds and bounties are credited here. They move to your wallet only when
            you collect.
          </p>
          <button
            className="btn-primary mt-4"
            disabled={owed === 0n || tx.busy || demo}
            onClick={() => void tx.run(planCollect())}
          >
            <Coins className="h-4 w-4" /> Collect
          </button>
        </div>
        <Stat label="Kept" value={record.data?.kept ?? '…'} hint="covenants matured" />
        <Stat
          label="Broken · live"
          value={record.data ? `${record.data.broken} · ${record.data.live}` : '…'}
          hint="slashed · live right now"
        />
      </div>

      <h2 className="mb-4 mt-12 text-2xl font-semibold">Covenants you published</h2>
      {mine.isLoading && <PlumbSpinner label="Loading" />}
      {mine.data && mine.data.length === 0 && (
        <EmptyState
          title="You have not published a covenant"
          action={
            <Link to="/create" className="btn-primary">
              Create one
            </Link>
          }
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mine.data?.map((c) => <CovenantCard key={c.id} c={c} />)}
      </div>

      {asBeneficiary.length > 0 && (
        <>
          <h2 className="mb-1 mt-12 text-2xl font-semibold">You are the beneficiary of</h2>
          <p className="mb-4 text-sm text-muted">
            If one of these breaks, most of the bond is credited to you.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {asBeneficiary.map((c) => (
              <CovenantCard key={c.id} c={c} />
            ))}
          </div>
        </>
      )}
      {asFinder.length > 0 && (
        <>
          <h2 className="mb-1 mt-12 text-2xl font-semibold">Warnings you opened</h2>
          <p className="mb-4 text-sm text-muted">If these end in a slash you earn 5% of the bond.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {asFinder.map((c) => (
              <CovenantCard key={c.id} c={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
