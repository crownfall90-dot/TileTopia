const UPDATE_CHECK_TIMEOUT_MS = 1800;

export function startSplash({boot, finish, schedule = setTimeout}) {
  if (!boot.checked) {
    schedule(() => {
      if (boot.checked) return;
      boot.checked = true;
      finish();
    }, UPDATE_CHECK_TIMEOUT_MS);
  }
  boot.min = true;
  finish();
}
