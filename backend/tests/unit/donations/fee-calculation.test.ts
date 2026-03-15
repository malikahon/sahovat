import { describe, it, expect } from 'vitest';

/**
 * Tests the platform fee calculation formula used in donations.service.ts.
 * The formula is: platform_fee = Math.round(amount * feePercentage / 100)
 * This is tested here as pure arithmetic without hitting the database.
 */

function calculateFee(amount: number, feePercentage: number): { fee: number; net: number } {
  const fee = Math.round(amount * feePercentage / 100);
  const net = amount - fee;
  return { fee, net };
}

describe('Platform fee calculation (1%)', () => {
  it('calculates 1% fee on 100,000 UZS', () => {
    const { fee, net } = calculateFee(100_000, 1);
    expect(fee).toBe(1_000);
    expect(net).toBe(99_000);
  });

  it('calculates 1% fee on 50,000 UZS', () => {
    const { fee, net } = calculateFee(50_000, 1);
    expect(fee).toBe(500);
    expect(net).toBe(49_500);
  });

  it('calculates 1% fee on 10,000 UZS', () => {
    const { fee, net } = calculateFee(10_000, 1);
    expect(fee).toBe(100);
    expect(net).toBe(9_900);
  });

  it('calculates 1% fee on 1,000 UZS (minimum amount)', () => {
    const { fee, net } = calculateFee(1_000, 1);
    expect(fee).toBe(10);
    expect(net).toBe(990);
  });

  it('rounds fee correctly for odd amounts', () => {
    // 33,333 * 0.01 = 333.33 → rounds to 333
    const { fee, net } = calculateFee(33_333, 1);
    expect(fee).toBe(333);
    expect(net).toBe(33_000);
  });

  it('fee + net always equals original amount', () => {
    const amounts = [10_000, 50_000, 99_999, 100_000, 500_000, 1_000_000, 5_000_000];
    for (const amount of amounts) {
      const { fee, net } = calculateFee(amount, 1);
      expect(fee + net).toBe(amount);
    }
  });
});

describe('Platform fee calculation (3% max)', () => {
  it('calculates 3% fee on 1,000,000 UZS', () => {
    const { fee, net } = calculateFee(1_000_000, 3);
    expect(fee).toBe(30_000);
    expect(net).toBe(970_000);
  });

  it('calculates 2% fee on 500,000 UZS', () => {
    const { fee, net } = calculateFee(500_000, 2);
    expect(fee).toBe(10_000);
    expect(net).toBe(490_000);
  });
});
