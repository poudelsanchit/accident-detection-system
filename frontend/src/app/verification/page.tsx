"use client";

import { useState, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Clock, LogOut, Shield, RefreshCw } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
import { Input } from "@/core/components/ui/input";

export default function VerificationPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const phoneNumber = session?.user?.phone;
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Handle OTP input change
  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split("").forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);

    // Focus last filled input or next empty one
    const lastFilledIndex = Math.min(pastedData.length, 5);
    inputRefs.current[lastFilledIndex]?.focus();
  };

  // Verify OTP
  const handleVerify = async () => {
    const otpValue = otp.join("");
    
    if (otpValue.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      // Add your verification API call here
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber, verificationCode: otpValue }),
      });

      if (!response.ok) {
        throw new Error("Invalid OTP. Please try again.");
      }

      // Update JWT so isVerified is true (used by middleware to allow /dashboard)
      await update({ isVerified: true });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (!canResend) return;

    try {
      // Add your resend OTP API call here
      await fetch("/api/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      setCountdown(60);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
      setError("");
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError("Failed to resend OTP. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <CardTitle>Verify Your Account</CardTitle>
          <CardDescription>
            Please verify your account by entering the OTP sent to your number{" "}
            <span className="font-semibold">98*******2</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* OTP Input */}
          <div className="space-y-4">
            <label className="text-sm font-medium block text-center">
              Enter 6-digit OTP
            </label>
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg"
                  disabled={isVerifying}
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            disabled={isVerifying || otp.some((d) => !d)}
            className="w-full"
            size="lg"
          >
            {isVerifying ? "Verifying..." : "Verify OTP"}
          </Button>

          {/* Resend OTP */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              {canResend ? (
                <span>You can now resend the OTP</span>
              ) : (
                <span>Resend OTP in {countdown}s</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={!canResend}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Resend OTP
            </Button>
          </div>

          {/* Sign Out Button */}
          <Button
            variant="outline"
            onClick={() => signOut()}
            className="w-full"
            size="lg"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}