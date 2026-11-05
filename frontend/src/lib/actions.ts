import type { Covenant } from '../chain/types';
import { sameAddress } from './format';
import { LIMITS } from './rules';

export interface ActionInfo {
  /** shown at all for this viewer and state */
  visible: boolean;
  enabled: boolean;
  /** why it is disabled, in plain words */
  reason?: string;
  /** unix time when it becomes available, when the reason is a wait */
  availableAt?: number;
}

export interface Actions {
  isPublisher: boolean;
  isBeneficiary: boolean;
  activate: ActionInfo;
  cancel: ActionInfo;
  addTenet: ActionInfo;
  topUp: ActionInfo;
  inspect: ActionInfo;
  mature: ActionInfo;
}

const off = (reason: string, availableAt?: number): ActionInfo => ({
  visible: true,
  enabled: false,
  reason,
  availableAt,
});
const on = (): ActionInfo => ({ visible: true, enabled: true });
const hidden = (): ActionInfo => ({ visible: false, enabled: false });

/** Mirrors the contract's preconditions so buttons explain themselves; the contract still decides. */
export function actionsFor(c: Covenant, me: string | null, now: number): Actions {
  const isPublisher = sameAddress(me, c.publisher);
  const isBeneficiary = sameAddress(me, c.beneficiary);
  const gapUntil = c.readings > 0 ? c.nextReadingAt : 0;
  const waitForGap = gapUntil > now;
  const live = c.state === 'NEW' || c.state === 'ACTIVE' || c.state === 'WARNED';

  const publisherOnly = (info: ActionInfo): ActionInfo =>
    info.visible && !isPublisher ? off('Only the publisher can do this.') : info;

  const activate =
    c.state !== 'NEW'
      ? hidden()
      : c.tenets.length < 1
        ? off('Add at least one tenet first.')
        : waitForGap
          ? off('The last reading is too recent.', gapUntil)
          : on();
  const cancel = c.state === 'NEW' ? on() : hidden();
  const addTenet =
    c.state !== 'NEW'
      ? hidden()
      : c.tenets.length >= LIMITS.maxTenets
        ? off('A covenant holds at most six tenets.')
        : on();
  const topUp = live ? on() : hidden();

  let inspect: ActionInfo = hidden();
  if (c.state === 'ACTIVE' || c.state === 'WARNED') {
    if (c.state === 'ACTIVE' && now >= c.endsAt)
      inspect = off('The term has ended. The covenant can be matured.');
    else if (waitForGap) inspect = off('The last reading is too recent.', gapUntil);
    else inspect = on();
  }

  let mature: ActionInfo = hidden();
  if (c.state === 'ACTIVE') mature = now >= c.endsAt ? on() : off('The term has not ended.', c.endsAt);
  else if (c.state === 'WARNED') {
    const at = Math.max(c.endsAt, c.cureBy) + LIMITS.resolveGrace;
    mature = now >= at ? on() : off('An open warning has to be settled by an inspection first.', at);
  }

  return {
    isPublisher,
    isBeneficiary,
    activate: publisherOnly(activate),
    cancel: publisherOnly(cancel),
    addTenet: publisherOnly(addTenet),
    topUp: publisherOnly(topUp),
    inspect,
    mature,
  };
}

/** What an inspection of this covenant could pay the caller (the bond share of a slash), for the inspector desk. */
export function inspectorStake(
  c: Covenant,
  now: number,
): { kind: 'finder' | 'closer' | 'none'; bps: bigint; note: string } {
  if (c.state === 'ACTIVE')
    return {
      kind: 'finder',
      bps: LIMITS.finderBps,
      note: 'Catching a breach opens a warning and earns 5% of the bond if it ends in a slash.',
    };
  if (c.state === 'WARNED') {
    if (now >= c.cureBy)
      return {
        kind: 'closer',
        bps: LIMITS.closerBps,
        note: 'The cure time is over. Confirming a still-broken page breaks the covenant and earns 10% of the bond.',
      };
    return { kind: 'none', bps: 0n, note: 'Still inside the cure time: a hard reading now changes nothing.' };
  }
  return { kind: 'none', bps: 0n, note: '' };
}
