import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import { z } from 'zod';

// The provider is the network boundary, so only its factory is mocked.
// generateText stays real: it is what validates and shapes the prompt.
const provider = vi.hoisted((): { model: unknown; modelId: string } => ({ model: undefined, modelId: '' }));

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: (modelId: string) => {
    provider.modelId = modelId;
    return provider.model;
  },
}));

function mockModel(text: string) {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: 'text', text }],
      finishReason: { unified: 'stop', raw: 'stop' },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 1, text: 1, reasoning: undefined },
      },
      warnings: [],
    },
  });
}

describe('generateWithAI', () => {
  let current: MockLanguageModelV4;

  beforeEach(() => {
    // ai.ts builds defaultModel at import time, so each test re-imports it to bind a fresh mock.
    vi.resetModules();
    current = mockModel('hello back');
    provider.model = current;
    provider.modelId = '';
  });

  it('sends the system message as a system prompt ahead of the user turn', async () => {
    const { generateWithAI } = await import('./ai');

    const text = await generateWithAI('hello', 'be brief');

    expect(text).toBe('hello back');
    expect(current.doGenerateCalls).toHaveLength(1);
    expect(current.doGenerateCalls[0]?.prompt).toEqual([
      { role: 'system', content: 'be brief' },
      { role: 'user', content: [{ type: 'text', text: 'hello' }] },
    ]);
  });

  it('sends only the user turn when no system message is given', async () => {
    const { generateWithAI } = await import('./ai');

    await generateWithAI('hello');

    expect(current.doGenerateCalls[0]?.prompt).toEqual([
      { role: 'user', content: [{ type: 'text', text: 'hello' }] },
    ]);
  });

  it('calls the configured Claude model at temperature 0.8', async () => {
    const { generateWithAI } = await import('./ai');

    await generateWithAI('hello');

    expect(provider.modelId).toBe('claude-sonnet-4-20250514');
    expect(current.doGenerateCalls[0]?.temperature).toBe(0.8);
  });
});

describe('generateTypedObject', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns the schema-parsed object and folds the system text into the prompt', async () => {
    const current = mockModel('{"name":"x"}');
    provider.model = current;
    const { generateTypedObject } = await import('./ai');

    const result = await generateTypedObject(z.object({ name: z.string() }), 'hi', 'sys');

    expect(result).toEqual({ name: 'x' });
    expect(current.doGenerateCalls[0]?.prompt).toEqual([
      { role: 'user', content: [{ type: 'text', text: 'sys\n\nhi' }] },
    ]);
    expect(current.doGenerateCalls[0]?.responseFormat).toMatchObject({ type: 'json' });
  });

  it('rejects model output that fails the schema', async () => {
    provider.model = mockModel('{"name":1}');
    const { generateTypedObject } = await import('./ai');

    await expect(generateTypedObject(z.object({ name: z.string() }), 'hi')).rejects.toThrow();
  });
});
