import { lazy } from 'react';
import { CUSTOMER_TRANSACTION_TYPES } from './customerTransactionTypes';
import { SUPPLIER_TRANSACTION_TYPES } from './supplierLedger';

export function isLikelyStaleChunkError(err) {
  const message = String(err?.message || err || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed|ChunkLoadError/i.test(message);
}

export function lazyWithRetry(importer, name) {
  return lazy(async () => {
    const flag = `gebya_chunk_reload_${name}`;
    const getFlag = () => { try { return sessionStorage.getItem(flag); } catch { return null; } };
    const setFlag = (on) => { try { on ? sessionStorage.setItem(flag, '1') : sessionStorage.removeItem(flag); } catch { /* storage blocked */ } };
    try {
      const mod = await importer();
      setFlag(false);
      return mod;
    } catch (err) {
      if (isLikelyStaleChunkError(err) && !getFlag()) {
        setFlag(true);
        window.location.reload();
        return new Promise(() => {});
      }
      throw err;
    }
  });
}

export function isBrowserOnline() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

export function runAfterFirstPaint(callback) {
  if (typeof window === 'undefined') return () => {};
  let cancelled = false;
  let timeoutId = null;
  let idleId = null;

  const run = () => {
    if (cancelled) return;
    callback();
  };

  if ('requestIdleCallback' in window) {
    idleId = window.requestIdleCallback(run, { timeout: 2500 });
  } else {
    timeoutId = window.setTimeout(run, 1200);
  }

  return () => {
    cancelled = true;
    if (idleId != null && 'cancelIdleCallback' in window) {
      window.cancelIdleCallback(idleId);
    }
    if (timeoutId != null) window.clearTimeout(timeoutId);
  };
}

export function buildSavedOnDeviceMessage(message, isOnline) {
  const baseMessage = String(message || 'Saved').trim() || 'Saved';
  return isOnline ? baseMessage : (baseMessage + ' - saved on this phone');
}

export function getTransactionCloudProofRecordType(transaction) {
  if (transaction?.type === 'sale') return 'sale';
  if (transaction?.type === 'expense') return 'expense';
  return null;
}

export function getCustomerCloudProofRecordType(transaction) {
  if (transaction?.type === CUSTOMER_TRANSACTION_TYPES.PAYMENT) return 'customer_payment';
  if (transaction?.type === CUSTOMER_TRANSACTION_TYPES.CREDIT_ADD) return 'customer_credit';
  return null;
}

export function getSupplierCloudProofRecordType(transaction) {
  if (transaction?.type === SUPPLIER_TRANSACTION_TYPES.PAYMENT) return 'supplier_payment';
  if (transaction?.type === SUPPLIER_TRANSACTION_TYPES.PURCHASE_ADD) return 'supplier_purchase';
  return null;
}
