import { describe, it, expect, beforeEach } from 'vitest';
import {
  generatePrimarySelector,
  generateFallbackSelector,
  escapeCssSelector
} from './selector-generator';

describe('Selector Generator Utilities', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  describe('escapeCssSelector', () => {
    it('should escape special characters in CSS selectors', () => {
      expect(escapeCssSelector('foo:bar')).toBe('foo\\:bar');
      expect(escapeCssSelector('my.class')).toBe('my\\.class');
    });
  });

  describe('generatePrimarySelector', () => {
    it('should use a unique ID if present', () => {
      const button = document.createElement('button');
      button.id = 'submit-btn';
      container.appendChild(button);

      const selector = generatePrimarySelector(button);
      expect(selector).toBe('#submit-btn');
    });

    it('should ignore numeric-starting or too long IDs', () => {
      const button = document.createElement('button');
      button.id = '123button'; // Starts with number
      container.appendChild(button);

      const selector = generatePrimarySelector(button);
      expect(selector).not.toBe('#123button');
    });

    it('should prioritize data-testid attributes', () => {
      const div = document.createElement('div');
      div.setAttribute('data-testid', 'hero-section');
      container.appendChild(div);

      const selector = generatePrimarySelector(div);
      expect(selector).toBe('[data-testid="hero-section"]');
    });

    it('should use form element names if unique', () => {
      const input = document.createElement('input');
      input.setAttribute('name', 'user-email');
      container.appendChild(input);

      const selector = generatePrimarySelector(input);
      expect(selector).toBe('input[name="user-email"]');
    });

    it('should generate a tag path if no unique attributes', () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'wrapper-class';
      const paragraph = document.createElement('p');
      paragraph.className = 'text-para';
      const span = document.createElement('span');

      wrapper.appendChild(paragraph);
      paragraph.appendChild(span);
      container.appendChild(wrapper);

      const selector = generatePrimarySelector(span);
      expect(selector).toBe('#test-container > div.wrapper-class > p.text-para > span');
    });

    it('should handle nth-of-type siblings correctly', () => {
      const ul = document.createElement('ul');
      const li1 = document.createElement('li');
      const li2 = document.createElement('li');
      const li3 = document.createElement('li');

      ul.appendChild(li1);
      ul.appendChild(li2);
      ul.appendChild(li3);
      container.appendChild(ul);

      const selector = generatePrimarySelector(li2);
      expect(selector).toBe('#test-container > ul > li:nth-of-type(2)');
    });
  });

  describe('generateFallbackSelector', () => {
    it('should generate strict nth-child path from body', () => {
      const outer = document.createElement('div');
      const inner = document.createElement('span');
      
      outer.appendChild(inner);
      document.body.appendChild(outer);

      // Structure:
      // body
      //   container (first child)
      //   outer (second child)
      //     inner (first child of outer)

      const selector = generateFallbackSelector(inner);
      expect(selector).toBe('body > div:nth-child(2) > span:nth-child(1)');
    });
  });
});
