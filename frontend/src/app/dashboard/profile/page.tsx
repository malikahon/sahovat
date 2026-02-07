'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

const LANGUAGES = [
  { code: 'uz', name: "O'zbek", flag: '🇺🇿' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const searchParams = useSearchParams();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [selectedLanguage, setSelectedLanguage] = useState(user?.language_preference || 'uz');
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Show success message if redirected from OneID callback
  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setSaveMessage({ type: 'success', text: 'Hisobingiz OneID orqali muvaffaqiyatli tasdiqlandi!' });
    }
  }, [searchParams]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // Note: The backend endpoint for profile update would be implemented later
      // For now, we'll simulate the update locally
      if (user) {
        updateUser({
          ...user,
          display_name: displayName || null,
          language_preference: selectedLanguage,
        });
      }
      setSaveMessage({ type: 'success', text: 'Profil muvaffaqiyatli saqlandi' });
    } catch {
      setSaveMessage({ type: 'error', text: 'Xatolik yuz berdi. Qayta urinib ko\'ring.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOneIDVerification = async () => {
    setIsVerifying(true);
    setSaveMessage(null);
    
    try {
      const response = await api.initiateOneID();
      
      if (response.success && response.data) {
        // Redirect to OneID authorization URL
        window.location.href = response.data.authorization_url;
      } else {
        setSaveMessage({ 
          type: 'error', 
          text: response.error || 'OneID bilan bog\'lanishda xatolik yuz berdi' 
        });
        setIsVerifying(false);
      }
    } catch {
      setSaveMessage({ 
        type: 'error', 
        text: 'Server bilan bog\'lanishda xatolik yuz berdi' 
      });
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profil</h1>

      {/* OneID Verification Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">OneID tasdiqlash</h2>
        </div>
        <div className="p-6">
          {user?.is_verified ? (
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-green-800">Hisobingiz tasdiqlangan</h3>
                <p className="text-green-600 text-sm">
                  Siz yig&apos;im ochishingiz mumkin
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-800">Hisobingiz tasdiqlanmagan</h3>
                  <p className="text-orange-600 text-sm mb-4">
                    Yig&apos;im ochish uchun OneID orqali shaxsingizni tasdiqlashingiz kerak.
                    Bu firibgarlikni oldini olish va xavfsizlikni ta&apos;minlash uchun zarur.
                  </p>
                  <button
                    onClick={handleOneIDVerification}
                    disabled={isVerifying}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isVerifying ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        OneID ga yo&apos;naltirilmoqda...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                        OneID orqali tasdiqlash
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">OneID nima?</h4>
                <p className="text-blue-700 text-sm">
                  OneID - O&apos;zbekiston Respublikasining yagona identifikatsiya tizimi. 
                  Bu tizim orqali shaxsingizni xavfsiz tasdiqlashingiz mumkin.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Shaxsiy ma&apos;lumotlar</h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Phone Number (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefon raqam
            </label>
            <input
              type="text"
              value={user?.phone_number || ''}
              disabled
              className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">Telefon raqamni o&apos;zgartirish mumkin emas</p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ism (ommaviy ko&apos;rinadigan)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ismingizni kiriting"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
            <p className="mt-1 text-xs text-gray-500">
              Bu ism yig&apos;imlar va xayriyalarda ko&apos;rinadi
            </p>
          </div>
        </div>
      </div>

      {/* Language Preference */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Til sozlamalari</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  selectedLanguage === lang.code
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="font-medium">{lang.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            saveMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSaveProfile}
        disabled={isSaving}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>
    </div>
  );
}
