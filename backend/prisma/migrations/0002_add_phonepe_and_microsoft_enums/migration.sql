-- Add PHONEPE to PaymentMethod (Razorpay was replaced by PhonePe; RAZORPAY kept for legacy rows)
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'PHONEPE';

-- Add MICROSOFT to AuthProvider (Azure Entra ID SSO)
ALTER TYPE "AuthProvider" ADD VALUE IF NOT EXISTS 'MICROSOFT';
