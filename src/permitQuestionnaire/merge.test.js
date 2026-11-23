import { mergeQuestions } from './merge';

describe('mergeQuestions', () => {
  it('merges site extras after insert_after anchor', () => {
    const base = [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ];
    const extras = [
      {
        question: { id: 'c', text: 'C' },
        insert_after_question_id: 'a',
      },
    ];
    const merged = mergeQuestions(base, extras);
    expect(merged.map((q) => q.id)).toEqual(['a', 'c', 'b']);
  });
});