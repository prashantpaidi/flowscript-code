import { describe, it, expect } from 'vitest';
import { isValidAction } from './utils.js';

describe('isValidAction', () => {
  it('should return true for a valid click action', () => {
    const action = { type: 'click', selector: '#submit-btn' };
    expect(isValidAction(action)).toBe(true);
  });

  it('should return true for a valid type action with a value', () => {
    const action = { type: 'type', selector: '#username', value: 'john_doe' };
    expect(isValidAction(action)).toBe(true);
  });

  it('should return true for a valid nativeClick action', () => {
    const action = { type: 'nativeClick', selector: '.btn' };
    expect(isValidAction(action)).toBe(true);
  });

  it('should return true for a valid nativeType action with a value', () => {
    const action = { type: 'nativeType', selector: '#search', value: 'query' };
    expect(isValidAction(action)).toBe(true);
  });

  it('should return false for a type action without a value', () => {
    const action = { type: 'type', selector: '#username' };
    expect(isValidAction(action)).toBe(false);
  });

  it('should return false for a nativeType action without a value', () => {
    const action = { type: 'nativeType', selector: '#search' };
    expect(isValidAction(action)).toBe(false);
  });

  it('should return false for an invalid action type', () => {
    const action = { type: 'invalid_action', selector: '.menu' };
    expect(isValidAction(action)).toBe(false);
  });

  it('should return false for an empty selector', () => {
    const action = { type: 'click', selector: '   ' };
    expect(isValidAction(action)).toBe(false);
  });

  it('should return false for non-object values', () => {
    expect(isValidAction(null)).toBe(false);
    expect(isValidAction(undefined)).toBe(false);
    expect(isValidAction('click')).toBe(false);
    expect(isValidAction(123)).toBe(false);
  });
});
