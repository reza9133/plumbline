import { currentSource } from '../chain/client';
import { canonicalPage, cleanText, type CovenantDraft, type TenetDraft } from '../lib/rules';
import type { Covenant } from '../chain/types';
import type { StepResult, TxPlan } from './TxProvider';

const READ_NOTE =
  'The validators fetch the page and an AI inspector reads it. This is the slow part: a minute or two is normal, sometimes more.';

export const planActivate = (id: number): TxPlan => ({
  title: `Activate covenant #${id}`,
  steps: [
    {
      id: 'activate',
      label: 'Read the page strictly and go live',
      build: () => ({ fn: 'activate', args: [id] }),
    },
  ],
  slowNote: READ_NOTE,
});

export const planInspect = (id: number): TxPlan => ({
  title: `Inspect covenant #${id}`,
  steps: [
    {
      id: 'inspect',
      label: 'Read the page and record the reading',
      build: () => ({ fn: 'inspect', args: [id] }),
    },
  ],
  slowNote: READ_NOTE,
});

export const planMature = (id: number): TxPlan => ({
  title: `Mature covenant #${id}`,
  steps: [
    {
      id: 'mature',
      label: 'Close the covenant and credit the bond back',
      build: () => ({ fn: 'mature', args: [id] }),
    },
  ],
});

export const planCancel = (id: number): TxPlan => ({
  title: `Cancel draft #${id}`,
  steps: [
    {
      id: 'cancel',
      label: 'Withdraw the draft; the bond becomes collectable',
      build: () => ({ fn: 'cancel', args: [id] }),
    },
  ],
});

export const planTopUp = (id: number, wei: bigint): TxPlan => ({
  title: `Top up covenant #${id}`,
  steps: [
    {
      id: 'top_up',
      label: 'Add to the locked bond',
      build: () => ({ fn: 'top_up', args: [id], value: wei }),
    },
  ],
});

export const planCollect = (): TxPlan => ({
  title: 'Collect your credit',
  steps: [
    { id: 'collect', label: 'Pay out everything you are owed', build: () => ({ fn: 'collect', args: [] }) },
  ],
});

export const planAddTenet = (id: number, t: TenetDraft): TxPlan => ({
  title: `Add a tenet to #${id}`,
  steps: [
    {
      id: 'add_tenet',
      label: 'Store the tenet',
      build: () => ({ fn: 'add_tenet', args: [id, cleanText(t.text), cleanText(t.anchor)] }),
    },
  ],
});

/** The id of the covenant just created: the return value when readable, otherwise the newest matching draft. */
export async function resolveCreatedId(previous: StepResult[], who: string, url: string): Promise<number> {
  const returned = previous[0]?.returned;
  if (typeof returned === 'number' && Number.isInteger(returned) && returned >= 0) return returned;
  if (typeof returned === 'string' && /^\d+$/.test(returned)) return Number(returned);
  const mine = await currentSource().covenantsOf(who, 0, 5);
  const key = canonicalPage(url);
  const found = mine.find((c: Covenant) => c.state === 'NEW' && canonicalPage(c.url) === key);
  if (!found)
    throw new Error(
      'The covenant was created, but its number could not be read. Open "My account" to continue.',
    );
  return found.id;
}

export function planCreate(
  draft: CovenantDraft & { bound: boolean },
  tenets: TenetDraft[],
  account: string,
  activate: boolean,
): TxPlan {
  const steps: TxPlan['steps'] = [
    {
      id: 'create',
      label: `Create the draft and lock ${draft.bond === null ? '' : 'the bond'}`,
      build: () => ({
        fn: 'create_covenant',
        args: [
          cleanText(draft.title),
          draft.url.trim(),
          draft.beneficiary.trim(),
          draft.term,
          draft.cure,
          draft.gap,
          draft.maxAge,
          draft.bound,
        ],
        value: draft.bond ?? 0n,
      }),
    },
    ...tenets.map((t, i) => ({
      id: `tenet-${i}`,
      label: `Add tenet ${i + 1} of ${tenets.length}`,
      build: async (prev: StepResult[]) => ({
        fn: 'add_tenet' as const,
        args: [await resolveCreatedId(prev, account, draft.url), cleanText(t.text), cleanText(t.anchor)],
      }),
    })),
  ];
  if (activate) {
    steps.push({
      id: 'activate',
      label: 'Read the page strictly and go live',
      build: async (prev) => ({
        fn: 'activate' as const,
        args: [await resolveCreatedId(prev, account, draft.url)],
      }),
    });
  }
  return { title: 'Create covenant', steps, slowNote: READ_NOTE };
}
