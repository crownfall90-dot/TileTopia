with open('tests/ui-shop-progress.test.cjs', 'r', encoding='utf-8') as f:
    text = f.read()

target = """  const itemsLocsHtml = renderItemsLocsHtml(locs);
  assert.ok(itemsLocsHtml.includes('locgrid'));
});"""

replacement = """  const itemsLocsHtml = renderItemsLocsHtml(locs);
  assert.ok(itemsLocsHtml.includes('locgrid'));

  // Emotes tab markup
  const {renderItemsEmotesHtml, ALL_EMOTES, ALL_PHRASES, DEFAULT_EMOTES, DEFAULT_PHRASES} = await import('../src/ui/shop.js');
  assert.equal(DEFAULT_EMOTES.length, 5);
  assert.equal(DEFAULT_PHRASES.length, 5);
  assert.ok(ALL_EMOTES.length >= 20);
  assert.ok(ALL_PHRASES.length >= 20);

  const emotesHtml = renderItemsEmotesHtml({
    allEmotes: ALL_EMOTES,
    allPhrases: ALL_PHRASES,
    selectedEmotes: ['👑', '🧩'],
    selectedPhrases: ['Отличный ход!'],
    maxEmotes: 5,
    maxPhrases: 5
  });
  assert.ok(emotesHtml.includes('deck-summary-card'));
  assert.ok(emotesHtml.includes('data-toggle-emote="👑"'));
  assert.ok(emotesHtml.includes('data-toggle-phrase="Отличный ход!"'));
  assert.ok(emotesHtml.includes('data-reset-deck'));
});"""

# normalize line endings
text_norm = text.replace('\r\n', '\n')
target_norm = target.replace('\r\n', '\n')
replacement_norm = replacement.replace('\r\n', '\n')

assert target_norm in text_norm, "Target not found in text"
new_text = text_norm.replace(target_norm, replacement_norm)
with open('tests/ui-shop-progress.test.cjs', 'w', encoding='utf-8') as f:
    f.write(new_text)
print("Successfully patched tests/ui-shop-progress.test.cjs")
