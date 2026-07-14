/**
 * Payment TypeScript types
 * Phase 3: Payment Processing
 */

import type { PaymentStatus, PaymentMethod } from "./order";

export interface Payment {
  paymentId: string;
  orderId: string;
  gateway: "PHONEPE" | "COD";
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  phonepeTransactionId?: string;
  phonepeMerchantTransactionId?: string;
  phonepePaymentInstrument?: {
    type: string;
    cardNetwork?: string;
    cardType?: string;
    upiId?: string;
  };
  retryCount: number;
  createdAt: string | Date;
  paidAt?: string | Date;
  failedAt?: string | Date;
  errorMessage?: string;
}

export interface PaymentInitiationResponse {
  success: boolean;
  message: string;
  data: {
    paymentId: string;
    redirectUrl: string;
  };
}

export interface PaymentVerificationResponse {
  success: boolean;
  message: string;
  data?: {
    orderId: string;
    orderNumber: string;
    status: PaymentStatus;
    transactionId?: string;
  };
}

export interface PaymentStatusResponse {
  success: boolean;
  data: {
    paymentId: string;
    status: PaymentStatus;
    amount: number;
    method: PaymentMethod;
    gateway: string;
    createdAt: string | Date;
    paidAt?: string | Date;
    failedAt?: string | Date;
    errorMessage?: string;
    retryCount: number;
  };
}
