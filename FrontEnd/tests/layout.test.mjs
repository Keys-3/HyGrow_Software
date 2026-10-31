import test from 'node:test';
import assert from 'node:assert/strict';
import { gridColumns } from '../src/utils/layout.ts';

test('cards only add a column when the cards and their gap fit', () => {
  for (const [width, columns] of [[0, 1], [288, 1], [415, 1], [416, 2], [632, 3], [848, 4], [1600, 4]]) {
    assert.equal(gridColumns(width), columns, `available width ${width}`);
    if (columns > 1) assert.ok((width - (columns - 1) * 16) / columns >= 200);
  }
});

test('larger text reserves more space for each card', () => {
  assert.equal(gridColumns(600, 200), 2);
  assert.equal(gridColumns(600, 400), 1);
});
