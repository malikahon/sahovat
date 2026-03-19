// ============================================================
// PayMe Merchant API — JSON-RPC Types
// ============================================================

/** Methods that PayMe calls on our server. */
export enum PaymeMethod {
  CheckPerformTransaction = 'CheckPerformTransaction',
  CreateTransaction = 'CreateTransaction',
  PerformTransaction = 'PerformTransaction',
  CancelTransaction = 'CancelTransaction',
  CheckTransaction = 'CheckTransaction',
  GetStatement = 'GetStatement',
}

/** PayMe Merchant API transaction states. */
export enum PaymeTxState {
  PENDING = 1,
  COMPLETED = 2,
  CANCELLED_PENDING = -1,   // cancelled before PerformTransaction
  CANCELLED_COMPLETED = -2, // cancelled after PerformTransaction (refund)
}

/** Error codes returned to PayMe. */
export enum PaymeErrorCode {
  INVALID_JSON_RPC = -32600,
  METHOD_NOT_FOUND = -32601,
  INSUFFICIENT_PRIVILEGES = -32504,
  INTERNAL_ERROR = -32400,
  INVALID_AMOUNT = -31001,
  TRANSACTION_NOT_FOUND = -31003,
  CANNOT_PERFORM = -31008,
  ORDER_NOT_FOUND = -31050,
  ALREADY_PAID = -31060,
}

// ============================================================
// REQUEST PARAMS
// ============================================================

export interface PaymeAccount {
  order_id: string;
}

export interface CheckPerformParams {
  amount: number;
  account: PaymeAccount;
}

export interface CreateTransactionParams {
  id: string;                // PayMe-generated transaction ID
  time: number;              // Unix ms
  amount: number;
  account: PaymeAccount;
}

export interface PerformTransactionParams {
  id: string;
}

export interface CancelTransactionParams {
  id: string;
  reason: number;
}

export interface CheckTransactionParams {
  id: string;
}

export interface GetStatementParams {
  from: number;              // Unix ms
  to: number;                // Unix ms
}

// ============================================================
// JSON-RPC ENVELOPE
// ============================================================

export interface PaymeJsonRpcRequest {
  jsonrpc: string;
  id: number;
  method: PaymeMethod;
  params: unknown;
}

export interface PaymeJsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: { uz: string; ru: string; en: string };
    data?: string;
  };
}

// ============================================================
// DB ROW TYPE
// ============================================================

export interface PaymeTransactionRow {
  id: string;
  payme_id: string;
  donation_id: string;
  state: number;
  amount: number;   // bigint → number
  reason: number | null;
  create_time: string;   // bigint returned as string from pg
  perform_time: string;
  cancel_time: string;
  created_at: string;
}
