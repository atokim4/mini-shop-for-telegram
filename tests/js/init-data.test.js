import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { signInitData } from '../../dev/init-data.mjs';

describe('test signer', () => {
  it('matches the vector the PHP validator is tested against', () => {
    const query = signInitData('123456:TEST-token-for-unit-tests', { auth_date: '1760000000', query_id: 'AAQ', user: { id: 7, first_name: 'Test' } });
    const expected = readFileSync(new URL('../php/fixtures/node-vector.hash', import.meta.url), 'utf8').trim();
    expect(new URLSearchParams(query).get('hash')).toBe(expected);
  });
});
