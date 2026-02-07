'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, type WithdrawalAccount } from '@/lib/api';

export default function WithdrawalAccountsPage() {
  const [accounts, setAccounts] = useState<WithdrawalAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<WithdrawalAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    provider: 'payme' as const,
    account_holder_name: '',
    phone_number: '+998',
  });

  const loadAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.getWithdrawalAccounts();
      if (response.success && response.data) {
        setAccounts(response.data.accounts);
      } else {
        setError(response.error || 'Hisoblarni yuklashda xatolik yuz berdi');
      }
    } catch {
      setError('Hisoblarni yuklashda xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const resetForm = () => {
    setFormData({
      provider: 'payme',
      account_holder_name: '',
      phone_number: '+998',
    });
    setShowAddForm(false);
    setEditingAccount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (editingAccount) {
        await api.updateWithdrawalAccount(editingAccount.id, {
          account_holder_name: formData.account_holder_name,
          account_number: formData.phone_number,
        });
      } else {
        await api.addWithdrawalAccount({
          provider: formData.provider,
          account_holder_name: formData.account_holder_name,
          account_number: formData.phone_number,
        });
      }
      await loadAccounts();
      resetForm();
    } catch {
      setError(editingAccount ? 'Hisobni yangilashda xatolik' : 'Hisob qo\'shishda xatolik');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (account: WithdrawalAccount) => {
    setEditingAccount(account);
    setFormData({
      provider: 'payme',
      account_holder_name: account.account_holder_name,
      phone_number: account.account_number_masked || '+998',
    });
    setShowAddForm(true);
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Haqiqatan ham bu hisobni o\'chirmoqchimisiz?')) return;
    
    try {
      await api.deleteWithdrawalAccount(accountId);
      await loadAccounts();
    } catch {
      setError('Hisobni o\'chirishda xatolik');
    }
  };

  const handleSetPrimary = async (accountId: string) => {
    try {
      await api.setPrimaryWithdrawalAccount(accountId);
      await loadAccounts();
    } catch {
      setError('Asosiy hisob qilishda xatolik');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Pul chiqarish hisoblar</h1>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Hisob qo&apos;shish
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
            ✕
          </button>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingAccount ? 'Hisobni tahrirlash' : 'Yangi hisob qo\'shish'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* PayMe Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-blue-800">PayMe hisobi</h4>
                <p className="text-blue-700 text-sm">
                  Mablag&apos;lar PayMe ilovasidagi telefon raqamingizga o&apos;tkaziladi.
                  PayMe ilovasini oldindan o&apos;rnating va telefon raqamingizni ulang.
                </p>
              </div>
            </div>

            {/* Account Holder Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hisob egasining ismi
              </label>
              <input
                type="text"
                value={formData.account_holder_name}
                onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                placeholder="To'liq ismingiz"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PayMe telefon raqami
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => {
                  let value = e.target.value;
                  if (!value.startsWith('+998')) {
                    value = '+998';
                  }
                  // Only allow digits after +998
                  const digits = value.slice(4).replace(/\D/g, '');
                  if (digits.length <= 9) {
                    setFormData({ ...formData, phone_number: '+998' + digits });
                  }
                }}
                placeholder="+998901234567"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                PayMe ilovasiga ulangan telefon raqamingiz
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Saqlanmoqda...' : editingAccount ? 'Yangilash' : 'Qo\'shish'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Hisoblar yo&apos;q</h3>
          <p className="text-gray-500 mb-6">
            Yig&apos;ilgan mablag&apos;larni olish uchun PayMe hisobingizni qo&apos;shing
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Hisob qo&apos;shish
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                account.is_primary ? 'border-green-500 ring-2 ring-green-100' : 'border-gray-200'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${account.is_primary ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <svg className={`w-6 h-6 ${account.is_primary ? 'text-green-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{account.account_holder_name}</h3>
                        {account.is_primary && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                            Asosiy
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600">PayMe • {account.account_number_masked}</p>
                      {account.is_verified && (
                        <div className="flex items-center gap-1 mt-1 text-green-600 text-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Tasdiqlangan
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!account.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(account.id)}
                        className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        Asosiy qilish
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(account)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="font-medium text-yellow-800">Muhim ma&apos;lumot</h4>
            <p className="text-yellow-700 text-sm">
              Mablag&apos;larni olish uchun asosiy hisob belgilangan bo&apos;lishi kerak. 
              Pul chiqarish so&apos;rovi berilganda, mablag&apos;lar asosiy hisobga o&apos;tkaziladi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
