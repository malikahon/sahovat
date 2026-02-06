'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Format phone number as user types (XX XXX XX XX)
  const formatPhoneDisplay = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let formatted = '';
    
    if (digits.length > 0) formatted += digits.slice(0, 2);
    if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
    if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
    if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);
    
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digits = value.replace(/\D/g, '');
    
    // Limit to 9 digits
    if (digits.length <= 9) {
      setPhoneNumber(digits);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (phoneNumber.length !== 9) {
      setError('Telefon raqamini to\'liq kiriting');
      return;
    }

    setIsLoading(true);
    setError('');

    const fullPhoneNumber = `+998${phoneNumber}`;
    const response = await api.requestOTP(fullPhoneNumber);

    setIsLoading(false);

    if (response.success) {
      // Store phone number and redirect to OTP page
      sessionStorage.setItem('auth_phone', fullPhoneNumber);
      router.push('/auth/verify');
    } else {
      setError(response.error || 'Xatolik yuz berdi. Qayta urinib ko\'ring.');
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Kirish</h1>
        <p className="text-gray-600">
          Telefon raqamingizni kiriting
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            Telefon raqam
          </label>
          <div className="flex">
            <div className="flex items-center px-4 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-700 font-medium">
              +998
            </div>
            <input
              type="tel"
              id="phone"
              value={formatPhoneDisplay(phoneNumber)}
              onChange={handlePhoneChange}
              placeholder="90 123 45 67"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-lg"
              autoComplete="tel"
              autoFocus
            />
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || phoneNumber.length !== 9}
          className="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Yuborilmoqda...
            </span>
          ) : (
            'Davom etish'
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        <p>
          Davom etish orqali siz bizning{' '}
          <Link href="/terms" className="text-green-600 hover:underline">
            Foydalanish shartlari
          </Link>
          {' '}va{' '}
          <Link href="/privacy" className="text-green-600 hover:underline">
            Maxfiylik siyosati
          </Link>
          ga rozilik bildirasiz.
        </p>
      </div>
    </div>
  );
}
