'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function VerifyOTPPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Get phone number from session storage
    const storedPhone = sessionStorage.getItem('auth_phone');
    if (!storedPhone) {
      router.push('/auth/login');
      return;
    }
    setPhoneNumber(storedPhone);
    
    // Focus first input
    inputRefs.current[0]?.focus();
  }, [router]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === 5 && newOtp.every(digit => digit !== '')) {
      handleSubmit(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    
    if (code.length !== 6) {
      setError('6 xonali kodni to\'liq kiriting');
      return;
    }

    setIsLoading(true);
    setError('');

    const response = await api.verifyOTP(phoneNumber, code);

    setIsLoading(false);

    if (response.success && response.data) {
      const { user, tokens } = response.data;
      login(user, tokens.access_token, tokens.refresh_token);
      
      // Clear session storage
      sessionStorage.removeItem('auth_phone');
      
      // Redirect to dashboard or home
      router.push('/');
    } else {
      setError(response.error || 'Noto\'g\'ri kod. Qayta urinib ko\'ring.');
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setCanResend(false);
    setResendTimer(60);
    setError('');

    const response = await api.requestOTP(phoneNumber);
    
    if (!response.success) {
      setError(response.error || 'Kodni qayta yuborishda xatolik.');
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Format +998901234567 to +998 90 123 45 67
    if (!phone) return '';
    return phone.replace(/(\+998)(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tasdiqlash kodi</h1>
        <p className="text-gray-600">
          <span className="font-medium">{formatPhoneNumber(phoneNumber)}</span> raqamiga 
          yuborilgan 6 xonali kodni kiriting
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div className="mb-6">
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors"
                disabled={isLoading}
              />
            ))}
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || otp.some(digit => digit === '')}
          className="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Tekshirilmoqda...
            </span>
          ) : (
            'Tasdiqlash'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        {canResend ? (
          <button
            onClick={handleResend}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            Kodni qayta yuborish
          </button>
        ) : (
          <p className="text-gray-500">
            Kodni qayta yuborish: <span className="font-medium">{resendTimer}s</span>
          </p>
        )}
      </div>

      <div className="mt-4 text-center">
        <button
          onClick={() => router.push('/auth/login')}
          className="text-gray-600 hover:text-gray-800"
        >
          ← Telefon raqamni o&apos;zgartirish
        </button>
      </div>
    </div>
  );
}
