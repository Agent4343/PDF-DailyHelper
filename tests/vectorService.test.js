const { chunkTextForTest } = require('../services/vectorService');

describe('chunkTextForTest', () => {
  test('breaks long text into overlapping chunks', () => {
    const sampleText = Array.from({ length: 2000 })
      .map((_, idx) => `word${idx}`)
      .join(' ');

    const chunks = chunkTextForTest(sampleText, 200, 40);

    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach((chunk, index) => {
      expect(chunk.content.length).toBeGreaterThan(0);
      if (chunks[index + 1]) {
        expect(chunk.content).not.toEqual(chunks[index + 1].content);
      }
    });
  });

  test('returns empty array when no text provided', () => {
    expect(chunkTextForTest('')).toEqual([]);
  });
});
