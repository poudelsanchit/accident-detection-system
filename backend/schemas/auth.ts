import { z } from "zod";

export const registerSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .regex(
      /^[0-9+\-\s()]+$/,
      "Phone number must contain only numbers and valid characters",
    ),
  phoneNumberPrefix: z
    .string()
    .min(1, "Phone number prefix is required")
    .regex(/^\+?[0-9]+$/, "Phone number prefix must be a valid country code"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const verifyCodeSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 characters"),
  verificationCode: z
    .string()
    .length(6, "Verification code must be 6 digits")
    .regex(/^[0-9]+$/, "Verification code must contain only numbers"),
});

export const resendCodeSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .regex(
      /^[0-9+\-\s()]+$/,
      "Phone number must contain only numbers and valid characters",
    ),
  phoneNumberPrefix: z
    .string()
    .min(1, "Phone number prefix is required")
    .regex(/^\+?[0-9]+$/, "Phone number prefix must be a valid country code"),
});

export const loginSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .regex(
      /^[0-9+\-\s()]+$/,
      "Phone number must contain only numbers and valid characters",
    ),
  password: z.string().min(1, "Password is required"),
});
