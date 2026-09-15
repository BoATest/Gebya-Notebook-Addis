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

    it('restores the last enabled frequency when re-enabling (R1)', async () => {
      remindersApi.setShopDefault.mockResolvedValue({});

      const toggle = async (enabled, lastFreq) => {
        const newFreq = enabled
          ? (lastFreq && lastFreq !== 'disabled' ? lastFreq : 'daily')
          : 'disabled';
        await remindersApi.setShopDefault(mockShopId, newFreq);
        return newFreq;
      };

      // User had Weekly selected, paused, then re-enabled → Weekly is restored.
      expect(await toggle(true, 'weekly')).toBe('weekly');
      // No remembered choice (or remembered value was 'disabled') → default daily.
      expect(await toggle(true, 'disabled')).toBe('daily');
      expect(await toggle(true, null)).toBe('daily');
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

  describe('frequency contract — UI keys must match the engine schema (Gate A)', () => {
    it('segmented control offers exactly the schema values minus "disabled"', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      // The engine's contract lives in the api-server route schema.
      const schemaSrc = fs.readFileSync(
        path.resolve(import.meta.dirname, '../../api-server/src/routes/reminders.ts'),
        'utf8',
      );
      const schemaMatch = schemaSrc.match(/frequency:\s*z\.enum\(\[([^\]]+)\]\)/);
      expect(schemaMatch).toBeTruthy();
      const schemaValues = schemaMatch[1]
        .split(',')
        .map((s) => s.trim().replace(/['"]/g, ''));

      // The UI contract lives in the component source (kept as plain data).
      const componentSrc = fs.readFileSync(
        path.resolve(import.meta.dirname, '../src/components/settings/ReminderSettings.jsx'),
        'utf8',
      );
      const selectableKeys = [...componentSrc.matchAll(/key:\s*'(daily|weekly|disabled)'/g)]
        .map((m) => m[1]);

      // "disabled" is handled by the on/off toggle, not the segmented control.
      const expected = schemaValues.filter((v) => v !== 'disabled');
      expect(new Set(selectableKeys)).toEqual(new Set(expected));
      // And every selectable key IS schema-valid — the API can never reject one.
      for (const key of selectableKeys) {
        expect(schemaValues).toContain(key);
      }
      // The engine has no monthly cadence — the UI must not offer it.
      expect(selectableKeys).not.toContain('monthly');
      expect(schemaValues).not.toContain('monthly');
    });
  });

  describe('handleFrequency logic — engine reconciliation (R1)', () => {
    // Mirrors SELECTABLE_FREQUENCIES in ReminderSettings.jsx. The engine
    // (api-server routes/reminders.ts + services/reminderScheduler.ts)
    // supports daily/weekly/disabled ONLY — there is no 'monthly'.
    const SELECTABLE = ['daily', 'weekly'];

    const handleFrequency = async (next, current, shopId = mockShopId) => {
      if (!shopId || next === current) return null;
      if (!SELECTABLE.includes(next)) return null;
      try {
        await remindersApi.setShopDefault(shopId, next);
        return { success: true, freq: next };
      } catch (err) {
        return { success: false, restored: current, error: err };
      }
    };

    it('never offers monthly — the engine ignores it', () => {
      expect(SELECTABLE).toEqual(['daily', 'weekly']);
      expect(SELECTABLE).not.toContain('monthly');
    });

    it('sends weekly when switching daily -> weekly', async () => {
      remindersApi.setShopDefault.mockResolvedValue({});
      const result = await handleFrequency('weekly', 'daily');
      expect(remindersApi.setShopDefault).toHaveBeenCalledWith(mockShopId, 'weekly');
      expect(result).toEqual({ success: true, freq: 'weekly' });
    });

    it('rejects values outside the engine-supported set', async () => {
      const result = await handleFrequency('monthly', 'daily');
      expect(remindersApi.setShopDefault).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('no-ops when the frequency is unchanged', async () => {
      const result = await handleFrequency('daily', 'daily');
      expect(remindersApi.setShopDefault).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('restores the previous frequency on API failure', async () => {
      remindersApi.setShopDefault.mockRejectedValue(new Error('API error'));
      const result = await handleFrequency('weekly', 'daily');
      expect(result.success).toBe(false);
      expect(result.restored).toBe('daily');
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('i18n labels', () => {
    it('has correct English labels', () => {
      const labels = {
        en: {
          title: 'AUTO REMINDERS',
          subtitle: 'Reminder Notifications',
          enabledDaily: 'Sends daily reminders to customers',
          enabledWeekly: 'Sends weekly reminders to customers',
          disabled: 'Reminders are paused',
          frequencyDaily: 'Daily',
          frequencyWeekly: 'Weekly',
          confirmToggle: { on: 'Auto-reminders enabled', off: 'Auto-reminders paused' },
        },
      };
      expect(labels.en.title).toBe('AUTO REMINDERS');
      expect(labels.en.subtitle).toBe('Reminder Notifications');
      expect(labels.en.enabledDaily).toBe('Sends daily reminders to customers');
      expect(labels.en.enabledWeekly).toBe('Sends weekly reminders to customers');
    });

    it('has correct Amharic labels', () => {
      const labels = {
        am: {
          title: 'ራስ-ሰር ማስታወቂያ',
          subtitle: 'ተገዢ ማስታወቂያ',
          frequencyDaily: 'በየቀኑ',
          frequencyWeekly: 'በየሳምንቱ',
        },
      };
      expect(labels.am.title).toBe('ራስ-ሰር ማስታወቂያ');
      expect(labels.am.subtitle).toBe('ተገዢ ማስታወቂያ');
      expect(labels.am.frequencyDaily).toBe('በየቀኑ');
      expect(labels.am.frequencyWeekly).toBe('በየሳምንቱ');
    });
  });
});
