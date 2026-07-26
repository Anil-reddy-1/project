/**
 * PhonePe Payment Gateway Service
 * Phase 3: Order Placement & Payments
 * 
 * Handles PhonePe payment initiation, verification, and status checks
 */

import axios, { AxiosError } from "axios";
import { phonePeConfig } from "../config/phonepe";
import { env } from "../config/env";
import {
  generateChecksum,
  generateMerchantTransactionId,
  rupeesToPaise,
  mapPhonePeStateToStatus,
} from "../utils/phonepe.utils";

/**
 * PhonePe Payment Request Payload
 */
interface PhonePePaymentRequest {
  merchantId: string;
  merchantTransactionId: string;
  merchantUserId: string;
  amount: number; // in paise
  redirectUrl: string;
  redirectMode: "POST" | "GET" | "REDIRECT";
  callbackUrl?: string;
  mobileNumber?: string;
  paymentInstrument: {
    type: "PAY_PAGE";
  };
}

/**
 * PhonePe Payment Response
 */
interface PhonePePaymentResponse {
  success: boolean;
  code: string;
  message: string;
  data: {
    merchantId: string;
    merchantTransactionId: string;
    instrumentResponse: {
      type: string;
      redirectInfo: {
        url: string;
        method: string;
      };
    };
  };
}

/**
 * PhonePe Status Check Response
 */
interface PhonePeStatusResponse {
  success: boolean;
  code: string;
  message: string;
  data: {
    merchantId: string;
    merchantTransactionId: string;
    transactionId: string;
    amount: number;
    state: "COMPLETED" | "FAILED" | "PENDING" | "EXPIRED";
    responseCode: string;
    paymentInstrument?: {
      type: string;
      [key: string]: any;
    };
  };
}

export class PhonePeService {
  // In-memory store for mock payment states (for testing)
  private mockPaymentStates: Map<
    string,
    {
      state: "COMPLETED" | "FAILED" | "PENDING";
      amount: number;
      transactionId: string;
      createdAt: Date;
    }
  > = new Map();

  /**
   * Initiate a payment with PhonePe
   */
  async initiatePayment(params: {
    amount: number; // in rupees
    retailerId: string;
    retailerPhone?: string;
    orderId?: string;
  }): Promise<{
    merchantTransactionId: string;
    paymentUrl: string;
    expiresAt: Date;
  }> {
    const { amount, retailerId, retailerPhone } = params;
    
    // Validate configuration
    if (!phonePeConfig.merchantId || !phonePeConfig.saltKey) {
      throw new Error("PhonePe configuration is incomplete");
    }
    
    // Generate unique transaction ID
    const merchantTransactionId = generateMerchantTransactionId();
    
    // Prepare payment request payload
    const payload: PhonePePaymentRequest = {
      merchantId: phonePeConfig.merchantId,
      merchantTransactionId,
      merchantUserId: retailerId,
      amount: rupeesToPaise(amount),
      redirectUrl: `${phonePeConfig.redirectUrl}?merchantTransactionId=${merchantTransactionId}`,
      redirectMode: phonePeConfig.paymentConfig.redirectMode as any,
      paymentInstrument: {
        type: phonePeConfig.paymentConfig.paymentInstrumentType,
      },
    };
    
    // Add optional fields
    if (phonePeConfig.webhookUrl) {
      payload.callbackUrl = phonePeConfig.webhookUrl;
    }
    if (retailerPhone) {
      payload.mobileNumber = retailerPhone;
    }
    
    // MOCK MODE FOR TESTING (configurable via environment variable)
    if (env.PHONEPE_MOCK_MODE) {
      console.warn('[PhonePe] MOCK MODE ENABLED - Using simulated payment flow');
      console.log('[PhonePe Mock] Transaction ID:', merchantTransactionId);
      console.log('[PhonePe Mock] Amount:', amount, 'INR');
      
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + phonePeConfig.paymentConfig.expiryMinutes);
      
      // Store mock payment state (default to PENDING, will be updated on "payment")
      // For testing different scenarios, you can modify the state:
      // - Use query param ?mockResult=success/failure/pending in the URL
      // - Or manipulate this.mockPaymentStates directly
      this.mockPaymentStates.set(merchantTransactionId, {
        state: "PENDING",
        amount: rupeesToPaise(amount),
        transactionId: `T${Date.now()}`,
        createdAt: new Date(),
      });
      
      // Return mock payment URL that simulates PhonePe redirect
      // The URL includes a mock payment page that will redirect back
      return {
        merchantTransactionId,
        paymentUrl: `http://localhost:3000/retailer/payment/callback?merchantTransactionId=${merchantTransactionId}&code=PAYMENT_SUCCESS&providerReferenceId=T${Date.now()}`,
        expiresAt,
      };
    }

    try {
      // Base64 encode the payload
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
      
      // Generate checksum
      const xVerify = generateChecksum(base64Payload, phonePeConfig.endpoints.pay);
      
      // Make API request
      const response = await axios.post<PhonePePaymentResponse>(
        `${phonePeConfig.apiBaseUrl}${phonePeConfig.endpoints.pay}`,
        {
          request: base64Payload,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": xVerify,
          },
        }
      );
      
      if (!response.data.success) {
        throw new Error(
          `PhonePe payment initiation failed: ${response.data.message}`
        );
      }
      
      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setMinutes(
        expiresAt.getMinutes() + phonePeConfig.paymentConfig.expiryMinutes
      );
      
      return {
        merchantTransactionId,
        paymentUrl: response.data.data.instrumentResponse.redirectInfo.url,
        expiresAt,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        console.error("[PhonePe] Payment initiation failed:", {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        });
        throw new Error(
          axiosError.response?.data?.message || "PhonePe payment initiation failed"
        );
      }
      throw error;
    }
  }
  
  /**
   * Check payment status with PhonePe
   */
  async checkPaymentStatus(merchantTransactionId: string): Promise<{
    success: boolean;
    status: string;
    transactionId?: string;
    amount?: number;
    paymentInstrument?: any;
    responseCode?: string;
    message: string;
  }> {
    // Validate configuration
    if (!phonePeConfig.merchantId || !phonePeConfig.saltKey) {
      throw new Error("PhonePe configuration is incomplete");
    }
    
    // MOCK MODE FOR TESTING
    if (env.PHONEPE_MOCK_MODE) {
      console.log('[PhonePe Mock] Checking status for:', merchantTransactionId);
      
      const mockState = this.mockPaymentStates.get(merchantTransactionId);
      
      if (!mockState) {
        console.log('[PhonePe Mock] Transaction not found');
        return {
          success: false,
          status: "pending",
          message: "Transaction not found",
        };
      }
      
      // Auto-complete PENDING transactions after 2 seconds (simulate processing)
      const ageInSeconds = (Date.now() - mockState.createdAt.getTime()) / 1000;
      if (mockState.state === "PENDING" && ageInSeconds > 2) {
        // Automatically mark as successful after 2 seconds
        mockState.state = "COMPLETED";
        this.mockPaymentStates.set(merchantTransactionId, mockState);
        console.log('[PhonePe Mock] Auto-completed transaction');
      }
      
      console.log('[PhonePe Mock] Current state:', mockState.state);
      
      return {
        success: mockState.state === "COMPLETED",
        status: mapPhonePeStateToStatus(mockState.state),
        transactionId: mockState.transactionId,
        amount: mockState.amount,
        responseCode: mockState.state === "COMPLETED" ? "SUCCESS" : mockState.state === "FAILED" ? "PAYMENT_ERROR" : "PAYMENT_PENDING",
        message: `Mock payment ${mockState.state}`,
      } as any;
    }
    
    try {
      // Generate endpoint
      const endpoint = phonePeConfig.endpoints.status(
        phonePeConfig.merchantId,
        merchantTransactionId
      );
      
      // Generate checksum for status check
      const checksumString = `${endpoint}${phonePeConfig.saltKey}`;
      const xVerify = generateChecksum("", endpoint);
      
      // Make API request
      const response = await axios.get<PhonePeStatusResponse>(
        `${phonePeConfig.apiBaseUrl}${endpoint}`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": xVerify,
          },
        }
      );
      
      const { data } = response.data;
      
      return {
        success: response.data.success,
        status: mapPhonePeStateToStatus(data.state),
        transactionId: data.transactionId,
        amount: data.amount,
        paymentInstrument: data.paymentInstrument,
        responseCode: data.responseCode,
        message: response.data.message,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        console.error("[PhonePe] Status check failed:", {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        });
        
        // If transaction not found, return pending
        if (axiosError.response?.data?.code === "TRANSACTION_NOT_FOUND") {
          return {
            success: false,
            status: "pending",
            message: "Transaction not found",
          };
        }
        
        throw new Error(
          axiosError.response?.data?.message || "PhonePe status check failed"
        );
      }
      throw error;
    }
  }

  /**
   * Manually set mock payment state (for testing different scenarios)
   * Only works in mock mode
   */
  setMockPaymentState(
    merchantTransactionId: string,
    state: "COMPLETED" | "FAILED" | "PENDING"
  ): void {
    if (!env.PHONEPE_MOCK_MODE) {
      console.warn('[PhonePe] setMockPaymentState called but mock mode is disabled');
      return;
    }
    
    const mockState = this.mockPaymentStates.get(merchantTransactionId);
    if (mockState) {
      mockState.state = state;
      this.mockPaymentStates.set(merchantTransactionId, mockState);
      console.log(`[PhonePe Mock] Set ${merchantTransactionId} to ${state}`);
    }
  }
}

// Export singleton instance
export const phonePeService = new PhonePeService();
