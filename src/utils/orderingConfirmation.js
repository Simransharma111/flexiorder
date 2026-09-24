export const PAUSE_ORDERING_WARNING = "Turn off customer ordering? Customers will still be able to view the menu, but cannot place new orders through the app. Existing orders will continue. You can turn ordering back on at any time.";

export const confirmOrderingPause = () => window.confirm(PAUSE_ORDERING_WARNING);
