import { explainError, failureMessage, outcomeOf } from './tx';

describe('outcomeOf', () => {
  it('reads a success from the execution result name', () => {
    expect(
      outcomeOf({ statusName: 'ACCEPTED', txExecutionResultName: 'FINISHED_WITH_RETURN' }),
    ).toMatchObject({ ok: true, known: true });
  });
  it('reads a refusal from the execution result name', () => {
    expect(outcomeOf({ statusName: 'ACCEPTED', txExecutionResultName: 'FINISHED_WITH_ERROR' })).toMatchObject(
      { ok: false, known: true },
    );
  });
  it('reads the leader receipt', () => {
    const r = { consensus_data: { leader_receipt: [{ execution_result: 'SUCCESS' }] } };
    expect(outcomeOf(r).ok).toBe(true);
    const bad = { consensus_data: { leader_receipt: [{ execution_result: 'ERROR' }] } };
    expect(outcomeOf(bad)).toMatchObject({ ok: false, known: true });
  });
  it('never counts an unreadable receipt as a success', () => {
    expect(outcomeOf({})).toMatchObject({ ok: false, known: false });
    expect(outcomeOf(null)).toMatchObject({ ok: false, known: false });
  });
  it('finds a result deep in the receipt', () => {
    expect(outcomeOf({ x: { y: 'FINISHED_WITH_ERROR' } }).ok).toBe(false);
    expect(outcomeOf({ x: { execution_result: 'SUCCESS' } }).ok).toBe(true);
  });
});

describe('failureMessage', () => {
  it('extracts the contract message from a payload', () => {
    const r = {
      consensus_data: {
        leader_receipt: [
          {
            execution_result: 'ERROR',
            result: { status: 'rollback', payload: 'Only the publisher can do that.' },
          },
        ],
      },
    };
    expect(failureMessage(r)).toBe('Only the publisher can do that.');
  });
  it('extracts a UserError from stderr', () => {
    const r = {
      consensus_data: {
        leader_receipt: [
          {
            genvm_result: {
              stderr: "Traceback…\ngenlayer.UserError('The bond has to be between 0.01 GEN and 10^9 GEN.')",
            },
          },
        ],
      },
    };
    expect(failureMessage(r)).toBe('The bond has to be between 0.01 GEN and 10^9 GEN.');
  });
  it('returns undefined when there is nothing', () => {
    expect(failureMessage({})).toBeUndefined();
  });
});

describe('explainError', () => {
  it('translates wallet and network errors', () => {
    expect(explainError({ code: 4001, message: 'x' })).toMatch(/rejected/);
    expect(explainError({ code: -32002, message: 'x' })).toMatch(/pending request/);
    expect(explainError(new Error('insufficient funds for gas'))).toMatch(/enough GEN/);
    expect(explainError(new Error('Failed to fetch'))).toMatch(/network/i);
    expect(explainError(new Error('boom'))).toBe('boom');
  });
});
