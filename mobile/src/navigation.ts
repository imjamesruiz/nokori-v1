import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/**
 * Modals are usually pushed from a tab, but they can also be opened cold from a deep link
 * (or, later, a push notification) with nothing behind them. Falling back to Home keeps
 * "Cancel" and post-save dismissal from stranding the user on the modal.
 */
export function dismissModal(router: Router): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)');
}
