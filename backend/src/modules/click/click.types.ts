// ============================================================
// CLICK INTEGRATION TYPES
// ============================================================

export enum ClickAction {
  PREPARE = 0,
  COMPLETE = 1,
}

export enum ClickErrorCode {
  SUCCESS = 0,
  SIGN_CHECK_FAILED = -1,
  INVALID_AMOUNT = -2,
  ALREADY_PAID = -4,
  TRANSACTION_NOT_FOUND = -6,
  INVALID_PARAMETER = -7,
  SYSTEM_ERROR = -8,
  TRANSACTION_CANCELLED = -9,
}

export interface ClickWebhookPayload {
  click_trans_id: number;
  service_id: string;
  click_paydoc_id?: string;
  merchant_trans_id: string;
  amount: number;
  action: ClickAction;
  error?: number;
  error_note?: string;
  sign_time: string;
  sign_string: string;
  merchant_prepare_id?: number;
}

export interface ClickTransactionRow {
  id: string;
  click_trans_id: string;
  donation_id: string;
  merchant_prepare_id: string;
  state: number;
  amount: number;
  error: number | null;
  error_note: string | null;
  create_time: string;
  perform_time: string | null;
  created_at: string;
}