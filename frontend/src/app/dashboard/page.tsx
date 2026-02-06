'use client';

import { Header } from '@/components/Header';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

function DashboardContent() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Xush kelibsiz{user?.display_name ? `, ${user.display_name}` : ''}!
          </h1>

          {/* Verification Status Card */}
          {!user?.is_verified && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-800 mb-1">Hisobingiz tasdiqlanmagan</h3>
                  <p className="text-orange-700 text-sm mb-3">
                    Yig&apos;im ochish uchun hisobingizni tasdiqlashingiz kerak. 
                    Pasport yoki ID kartangiz rasmini yuklang.
                  </p>
                  <Link
                    href="/verification"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                  >
                    Tasdiqlash
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Link
              href="/fundraisers/new"
              className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-green-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Yig&apos;im boshlash</h3>
                  <p className="text-gray-500 text-sm">Yangi xayriya yig&apos;imi oching</p>
                </div>
              </div>
            </Link>

            <Link
              href="/fundraisers"
              className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Yig&apos;imlarni ko&apos;rish</h3>
                  <p className="text-gray-500 text-sm">Yordam kerak bo&apos;lganlarga ko&apos;mak bering</p>
                </div>
              </div>
            </Link>
          </div>

          {/* User Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-500 text-sm mb-1">Mening yig&apos;imlarim</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-500 text-sm mb-1">Xayriyalarim</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-500 text-sm mb-1">Jami yordam</p>
              <p className="text-3xl font-bold text-gray-900">0 so&apos;m</p>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Hisob ma&apos;lumotlari</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm text-gray-500 mb-1">Telefon raqam</dt>
                  <dd className="font-medium text-gray-900">{user?.phone_number}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 mb-1">Ism</dt>
                  <dd className="font-medium text-gray-900">
                    {user?.display_name || (
                      <span className="text-gray-400">Ko&apos;rsatilmagan</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 mb-1">Holat</dt>
                  <dd>
                    {user?.is_verified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Tasdiqlangan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                        Tasdiqlanmagan
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 mb-1">Til</dt>
                  <dd className="font-medium text-gray-900">
                    {user?.language_preference === 'uz' ? "O'zbek" : 
                     user?.language_preference === 'ru' ? 'Русский' : 'English'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
