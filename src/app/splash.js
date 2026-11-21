const ENTRANCE_MS = 740;
const UPDATE_CHECK_TIMEOUT_MS = 1800;

export function startSplash({boot, element, reducedMotion, finish, schedule = setTimeout}) {
  const finishEntrance = () => {
    boot.min = true;
    finish();
  };

  if (reducedMotion || !element) finishEntrance();
  else schedule(finishEntrance, ENTRANCE_MS);

  if (!boot.checked) schedule(() => {
    if (boot.checked) return;
    boot.checked = true;
    finish();
  }, UPDATE_CHECK_TIMEOUT_MS);
}
