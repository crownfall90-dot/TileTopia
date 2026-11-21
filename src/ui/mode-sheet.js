const labels = {online: 'Онлайн', lobby: 'С друзьями', bots: 'С ботами', local: 'На одном устройстве'};

export function bindModeSheet({backdrop, opener, closeButton, playButton, initial, onSelect, onPlay, reducedMotion}) {
  const choices = [...backdrop.querySelectorAll('[data-mode-action]')];
  let active = Object.prototype.hasOwnProperty.call(labels, initial) ? initial : 'bots';
  let closeTimer = 0;

  function renderMode() {
    for (const button of choices) {
      const selected = button.dataset.modeAction === active;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    opener.setAttribute('aria-label', `Режим: ${labels[active]}`);
    opener.querySelector('.t-title').textContent = labels[active];
  }

  function close() {
    if (backdrop.hidden) return;
    clearTimeout(closeTimer);
    backdrop.classList.remove('open');
    opener.setAttribute('aria-expanded', 'false');
    opener.focus({preventScroll: true});
    if (reducedMotion) backdrop.hidden = true;
    else closeTimer = setTimeout(() => { backdrop.hidden = true; }, 320);
  }

  opener.setAttribute('aria-expanded', 'false');
  opener.onclick = () => {
    clearTimeout(closeTimer);
    backdrop.hidden = false;
    opener.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      if (opener.getAttribute('aria-expanded') !== 'true') return;
      backdrop.classList.add('open');
      (choices.find(button => button.dataset.modeAction === active) || closeButton).focus({preventScroll: true});
    });
  };
  closeButton.onclick = close;
  backdrop.onclick = event => { if (event.target === backdrop) close(); };
  backdrop.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      const first = closeButton;
      const last = choices[choices.length - 1];
      const wrap = event.shiftKey && event.target === first ? last : !event.shiftKey && event.target === last ? first : null;
      if (wrap) {
        event.preventDefault();
        wrap.focus();
      }
    }
  });
  playButton.onclick = () => onPlay(active);
  for (const button of choices) {
    button.onclick = () => {
      active = button.dataset.modeAction;
      renderMode();
      onSelect(active);
      close();
      onPlay(active);
    };
  }
  renderMode();
}
