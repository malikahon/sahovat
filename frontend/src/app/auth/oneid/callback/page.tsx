'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function OneIDCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('OneID orqali tasdiqlash...');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const mock = searchParams.get('mock');

      // Handle error from OneID
      if (error) {
        setStatus('error');
        setMessage('OneID tasdiqlash muvaffaqiyatsiz yakunlandi');
        setErrorDetails(errorDescription || error);
        return;
      }

      // Validate required parameters
      if (!state) {
        setStatus('error');
        setMessage('Noto\'g\'ri so\'rov');
        setErrorDetails('State parametri topilmadi');
        return;
      }

      // For real OneID, code is required
      if (!mock && !code) {
        setStatus('error');
        setMessage('Noto\'g\'ri so\'rov');
        setErrorDetails('Avtorizatsiya kodi topilmadi');
        return;
      }

      try {
        // Call backend to handle the callback
        const response = await api.handleOneIDCallback({
          code: code || undefined,
          state: state,
          mock: mock === 'true',
        });

        if (response.success && response.data) {
          setStatus('success');
          setMessage('Muvaffaqiyatli tasdiqlandi!');
          
          // Update user context with new verification status
          if (response.data.user) {
            updateUser({
              id: response.data.user.id,
              phone_number: response.data.user.phone_number,
              display_name: response.data.user.display_name,
              is_verified: response.data.user.is_verified,
              is_admin: false, // Admin status preserved from existing context
              verification_status: response.data.user.verification_status,
              language_preference: 'uz',
            });
          }

          // Redirect to profile after short delay
          setTimeout(() => {
            router.push('/dashboard/profile?verified=true');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Tasdiqlash muvaffaqiyatsiz yakunlandi');
          setErrorDetails(response.error || 'Noma\'lum xatolik');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Server bilan bog\'lanishda xatolik');
        setErrorDetails(err instanceof Error ? err.message : 'Noma\'lum xatolik');
      }
    };

    handleCallback();
  }, [searchParams, router, updateUser]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="mx-auto w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">{message}</h1>
            <p className="text-gray-500">Iltimos, kuting...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-green-800 mb-2">{message}</h1>
            <p className="text-gray-500 mb-4">Sizning hisobingiz tasdiqlandi. Profilga yo&apos;naltirilmoqda...</p>
            <div className="animate-pulse text-green-600">
              <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-red-800 mb-2">{message}</h1>
            {errorDetails && (
              <p className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-lg">{errorDetails}</p>
            )}
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard/profile')}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Profilga qaytish
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Qayta urinish
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
