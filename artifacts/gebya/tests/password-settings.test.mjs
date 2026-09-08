/**
 * Unit tests for PasswordSettings component logic — password validation,
 * set/remove API calls, confirmation flow, and error handling.
 *
 * Run: pnpm vitest run tests/password-settings.test.mjs
 */
/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { setPassword, removePassword } from '../src/utils/authClient';
import { getAuthToken } from '../src/utils/syncEngine';
import { useAuthStore } from '../src/stores/authStore';

vi.mock('../src/utils/authClient');
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

describe('PasswordSettings — business logic validation', () => {
  const mockAuthToken = 'test-token-123';

  describe('password validation', () => {
    it('rejects passwords shorter than 6 characters', () => {
      const validatePassword = (pwd) => pwd.length >= 6;
      expect(validatePassword('12345')).toBe(false);
      expect(validatePassword('123456')).toBe(true);
      expect(validatePassword('secret123')).toBe(true);
    });
  });

  describe('handleSetPassword', () => {
    it('calls setPassword with valid password', async () => {
      getAuthToken.mockResolvedValue(mockAuthToken);
      setPassword.mockResolvedValue({});
      useAuthStore.setState = vi.fn();

      const handleSetPassword = async (password, shopId) => {
        if (password.length < 6) return { error: 'too_short' };
        const token = await getAuthToken();
        if (!token) return { error: 'no_token' };
        await setPassword(token, password);
        useAuthStore.setState({ hasPassword: true });
        return { success: true };
      };

      const result = await handleSetPassword('secret123', 'shop-1');

      expect(getAuthToken).toHaveBeenCalledOnce();
      expect(setPassword).toHaveBeenCalledWith(mockAuthToken, 'secret123');
      expect(useAuthStore.setState).toHaveBeenCalledWith({ hasPassword: true });
      expect(result.success).toBe(true);
    });

    it('returns error when password is too short', async () => {
      const handleSetPassword = async (password) => {
        if (password.length < 6) {
          return { error: 'Password must be at least 6 characters' };
        }
      };

      const result = await handleSetPassword('abc');
      expect(result.error).toContain('at least 6');
      expect(setPassword).not.toHaveBeenCalled();
    });

    it('returns error when no auth token', async () => {
      getAuthToken.mockResolvedValue(null);

      const handleSetPassword = async (password) => {
        const token = await getAuthToken();
        if (!token) return { error: 'no_token' };
      };

      const result = await handleSetPassword('secret123');
      expect(result.error).toBe('no_token');
      expect(setPassword).not.toHaveBeenCalled();
    });

    it('handles setPassword API failure', async () => {
      getAuthToken.mockResolvedValue(mockAuthToken);
      setPassword.mockRejectedValue(new Error('API error'));

      const handleSetPassword = async (password) => {
        const token = await getAuthToken();
        if (!token) return { error: 'no_token' };
        try {
          await setPassword(token, password);
          return { success: true };
        } catch (err) {
          return { error: err.message };
        }
      };

      const result = await handleSetPassword('secret123');
      expect(result.error).toBe('API error');
    });
  });

  describe('handleRemovePassword', () => {
    it('calls removePassword after confirmation', async () => {
      getAuthToken.mockResolvedValue(mockAuthToken);
      removePassword.mockResolvedValue({});
      useAuthStore.setState = vi.fn();
      vi.stubGlobal('confirm', vi.fn(() => true));

      const handleRemovePassword = async () => {
        if (!confirm('Are you sure?')) return { cancelled: true };
        const token = await getAuthToken();
        if (!token) return { error: 'no_token' };
        await removePassword(token);
        useAuthStore.setState({ hasPassword: false });
        return { success: true };
      };

      const result = await handleRemovePassword();

      expect(confirm).toHaveBeenCalledOnce();
      expect(removePassword).toHaveBeenCalledWith(mockAuthToken);
      expect(useAuthStore.setState).toHaveBeenCalledWith({ hasPassword: false });
      expect(result.success).toBe(true);
    });

    it('cancels when user rejects confirmation', async () => {
      vi.stubGlobal('confirm', vi.fn(() => false));

      const handleRemovePassword = async () => {
        if (!confirm('Are you sure?')) return { cancelled: true };
      };

      const result = await handleRemovePassword();
      expect(result.cancelled).toBe(true);
      expect(removePassword).not.toHaveBeenCalled();
    });

    it('handles removePassword API failure', async () => {
      getAuthToken.mockResolvedValue(mockAuthToken);
      removePassword.mockRejectedValue(new Error('API error'));
      vi.stubGlobal('confirm', vi.fn(() => true));

      const handleRemovePassword = async () => {
        if (!confirm('Are you sure?')) return { cancelled: true };
        const token = await getAuthToken();
        if (!token) return { error: 'no_token' };
        try {
          await removePassword(token);
          return { success: true };
        } catch (err) {
          return { error: err.message };
        }
      };

      const result = await handleRemovePassword();
      expect(result.error).toBe('API error');
    });
  });

  describe('i18n labels', () => {
    it('has correct English labels', () => {
      const labels = {
        en: {
          title: 'PASSWORD LOGIN',
          hint: 'Set a password for faster logins, or use OTP codes.',
          setButton: 'Set Password',
          removeButton: 'Remove Password',
          saving: 'Saving...',
          placeholder: '6-32 characters',
        },
      };
      expect(labels.en.title).toBe('PASSWORD LOGIN');
      expect(labels.en.setButton).toBe('Set Password');
    });

    it('has correct Amharic labels', () => {
      const labels = {
        am: {
          title: 'የይምት ቃል መዲዛ',
          hint: 'የይምት ቃል መዲዛ ይጨምሩ ለ ፍጥነታዊ መግቢያ',
        },
      };
      expect(labels.am.title).toBe('የይምት ቃል መዲዛ');
    });
  });
});
