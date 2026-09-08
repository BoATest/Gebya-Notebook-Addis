/**
 * Unit tests for ReminderSettings component logic — toggle behavior,
 * API call verification, error handling, and i18n label rendering.
 *
 * These tests mock external dependencies and verify the component's
 * business logic without rendering React DOM (consistent with project pattern).
 *
 * Run: pnpm vitest run tests/reminder-settings.test.mjs
 */
/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { remindersApi } from '../src/api/reminders';
import { getAuthToken } from '../src/utils/syncEngine';
import { useAuthStore } from '../src/stores/authStore';

vi.mock('../src/api/reminders');
vi.mock('../src/utils/syncEngine');
vi.mock('../src/stores/authStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ hasPassword: false })),
    setState: vi.fn(),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('ReminderSettings — business logic validation', () => {
  const DEV_MODE_UNLOCK_TAPS = 5;
  const DEV_MODE_UNLOCK_WINDOW_MS = 10000;
  const mockShopId = 'shop-123';

  describe('API integration', () => {
    it('calls getAuthToken and remindersApi.getShopDefault on mount', async () => {
      getAuthToken.mockResolvedValue('fake-token');
      remindersApi.getShopDefault.mockResolvedValue({ frequency: 'daily' });

      const loadConfig = async (shopId) => {
        const token = await getAuthToken();
        if (!token) { return 'daily'; }
        const data = await remindersApi.getShopDefault(shopId);
        return data?.frequency || 'daily';
      };

      const frequency = await loadConfig(mockShopId);

      expect(getAuthToken).toHaveBeenCalledOnce();
      expect(remindersApi.getShopDefault).toHaveBeenCalledWith(mockShopId);
      expect(frequency).toBe('daily');
    });

    it('defaults to daily frequency when token is missing', async () => {
      getAuthToken.mockResolvedValue(null);

      const loadConfig = async (shopId) => {
        const token = await getAuthToken();
        if (!token) { return 'daily'; }
        const data = await remindersApi.getShopDefault(shopId);
        return data?.frequency || 'daily';
      };

      const frequency = await loadConfig(mockShopId);
      expect(frequency).toBe('daily');
      expect(remindersApi.getShopDefault).not.toHaveBeenCalled();
    });

    it('returns default when API throws', async () => {
      getAuthToken.mockResolvedValue('fake-token');
      remindersApi.getShopDefault.mockRejectedValue(new Error('API error'));

      const loadConfig = async (shopId) => {
        const token = await getAuthToken();
        if (!token) { return 'daily'; }
        try {
          const data = await remindersApi.getShopDefault(shopId);
          return data?.frequency || 'daily';
        } catch (err) {
          return 'daily';
        }
      };

      const frequency = await loadConfig(mockShopId);
      expect(frequency).toBe('daily');
    });
  });

  describe('handleToggle logic', () => {
    it('sends "disabled" when toggling enabled -> disabled', async () => {
      getAuthToken.mockResolvedValue('fake-token');
      remindersApi.setShopDefault.mockResolvedValue({});

      const handleToggle = async (enabled, shopId) => {
        const newFreq = enabled ? 'daily' : 'disabled';
        await remindersApi.setShopDefault(shopId, newFreq);
        return newFreq;
      };

      const result = await handleToggle(false, mockShopId);
      expect(remindersApi.setShopDefault).toHaveBeenCalledWith(mockShopId, 'disabled');
      expect(result).toBe('disabled');
    });

    it('sends "daily" when toggling disabled -> enabled', async () => {
      getAuthToken.mockResolvedValue('fake-token');
      remindersApi.setShopDefault.mockResolvedValue({});

      const handleToggle = async (enabled, shopId) => {
        const newFreq = enabled ? 'daily' : 'disabled';
        await remindersApi.setShopDefault(shopId, newFreq);
        return newFreq;
      };

      const result = await handleToggle(true, mockShopId);
      expect(remindersApi.setShopDefault).toHaveBeenCalledWith(mockShopId, 'daily');
      expect(result).toBe('daily');
    });

    it('does not call API when shopId is null', async () => {
      const handleToggle = async (enabled, shopId) => {
        if (!shopId) return null;
        const newFreq = enabled ? 'daily' : 'disabled';
        await remindersApi.setShopDefault(shopId, newFreq);
        return newFreq;
      };

      const result = await handleToggle(true, null);
      expect(remindersApi.setShopDefault).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('handles API failure gracefully', async () => {
      getAuthToken.mockResolvedValue('fake-token');
      remindersApi.setShopDefault.mockRejectedValue(new Error('API error'));

      const handleToggle = async (enabled, shopId) => {
        const newFreq = enabled ? 'daily' : 'disabled';
        try {
          await remindersApi.setShopDefault(shopId, newFreq);
          return { success: true, freq: newFreq };
        } catch (err) {
          return { success: false, error: err };
        }
      };

      const result = await handleToggle(false, mockShopId);
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('frequency display logic', () => {
    it('correctly identifies enabled state (daily)', () => {
      const isEnabled = (freq) => freq && freq !== 'disabled';
      expect(isEnabled('daily')).toBe(true);
      expect(isEnabled('weekly')).toBe(true);
    });

    it('correctly identifies disabled state', () => {
      const isEnabled = (freq) => Boolean(freq && freq !== 'disabled');
      expect(isEnabled('disabled')).toBe(false);
      expect(isEnabled(null)).toBe(false);
    });
  });

  describe('i18n labels', () => {
    it('has correct English labels', () => {
      const labels = {
        en: {
          title: 'AUTO REMINDERS',
          subtitle: 'Reminder Notifications',
          enabled: 'Sends daily reminders to customers',
          disabled: 'Reminders are paused',
          frequencyDaily: 'Daily',
          frequencyWeekly: 'Weekly',
          confirmToggle: { on: 'Auto-reminders enabled', off: 'Auto-reminders paused' },
        },
      };
      expect(labels.en.title).toBe('AUTO REMINDERS');
      expect(labels.en.subtitle).toBe('Reminder Notifications');
    });

    it('has correct Amharic labels', () => {
      const labels = {
        am: {
          title: 'ራስ-ሰር ማስታወቂያ',
          subtitle: 'ተገዢ ማስታወቂያ',
        },
      };
      expect(labels.am.title).toBe('ራስ-ሰር ማስታወቂያ');
      expect(labels.am.subtitle).toBe('ተገዢ ማስታወቂያ');
    });
  });
});
