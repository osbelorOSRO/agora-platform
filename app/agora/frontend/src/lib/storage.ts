const KEYS = {
  AUTH_TOKEN:                  "token",
  OTP_URL:                     "otpauth_url",
  NOTIFICATIONS:               "agora.notificaciones",
  NOTIFICATIONS_READ_CUTOFF:   "agora.notificaciones.lastReadAt",
} as const;

export const storage = {
  getToken: () => localStorage.getItem(KEYS.AUTH_TOKEN),
  setToken: (token: string) => localStorage.setItem(KEYS.AUTH_TOKEN, token),
  removeToken: () => localStorage.removeItem(KEYS.AUTH_TOKEN),

  getOtpUrl: () => localStorage.getItem(KEYS.OTP_URL),
  setOtpUrl: (url: string) => localStorage.setItem(KEYS.OTP_URL, url),
  removeOtpUrl: () => localStorage.removeItem(KEYS.OTP_URL),

  getNotifications: () => localStorage.getItem(KEYS.NOTIFICATIONS),
  setNotifications: (value: string) => localStorage.setItem(KEYS.NOTIFICATIONS, value),

  getNotificationsReadCutoff: () => localStorage.getItem(KEYS.NOTIFICATIONS_READ_CUTOFF),
  setNotificationsReadCutoff: (value: string) => localStorage.setItem(KEYS.NOTIFICATIONS_READ_CUTOFF, value),
} as const;
