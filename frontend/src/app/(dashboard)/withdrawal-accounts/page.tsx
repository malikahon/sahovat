'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Plus,
  Trash2,
  Star,
  Pencil,
  Loader2,
  X,
} from 'lucide-react';
import { withdrawalAccountsApi } from '@/lib/api';
import { WithdrawalProvider } from '@/lib/types';
import type { SafeWithdrawalAccount } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// ============================================================
// Schemas
// ============================================================

const createAccountSchema = z.object({
  provider: z.nativeEnum(WithdrawalProvider),
  account_number: z
    .string()
    .regex(/^\d{16}$/, 'Card number must be 16 digits'),
  account_holder_name: z.string().min(1, 'Holder name is required').max(100),
});

type CreateAccountFormData = z.infer<typeof createAccountSchema>;

const editAccountSchema = z.object({
  account_holder_name: z.string().min(1, 'Holder name is required').max(100),
});

type EditAccountFormData = z.infer<typeof editAccountSchema>;

// ============================================================
// Provider display helpers
// ============================================================

const PROVIDER_LABELS: Record<WithdrawalProvider, string> = {
  [WithdrawalProvider.PAYME]: 'PayMe',
  [WithdrawalProvider.UZCARD]: 'Uzcard',
  [WithdrawalProvider.HUMO]: 'Humo',
};

const PROVIDER_COLORS: Record<WithdrawalProvider, string> = {
  [WithdrawalProvider.PAYME]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  [WithdrawalProvider.UZCARD]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [WithdrawalProvider.HUMO]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
};

// ============================================================
// Format card number for display during input
// ============================================================

function formatCardInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

// ============================================================
// Account Card Component
// ============================================================

function AccountCard({
  account,
  onEdit,
  onDelete,
  onSetPrimary,
}: {
  account: SafeWithdrawalAccount;
  onEdit: (account: SafeWithdrawalAccount) => void;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
}) {
  const t = useTranslations('withdrawalAccounts');
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className={PROVIDER_COLORS[account.provider]}>
                {PROVIDER_LABELS[account.provider]}
              </Badge>
              {account.is_primary && (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  <Star className="size-3" />
                  {t('primary')}
                </Badge>
              )}
            </div>
            <p className="font-mono text-lg tracking-wider text-foreground">
              {account.account_number_masked}
            </p>
            <p className="text-sm text-muted-foreground">
              {account.account_holder_name}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(account)}
              title={t('edit')}
            >
              <Pencil className="size-4" />
            </Button>
            {!account.is_primary && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onSetPrimary(account.id)}
                title={t('setPrimary')}
              >
                <Star className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setConfirmDelete(true)}
              title={t('delete')}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="flex-1 text-sm text-destructive">
              {t('deleteConfirm')}
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete(account.id);
                setConfirmDelete(false);
              }}
            >
              {t('delete')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(false)}
            >
              {t('cancel')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Edit Inline Form
// ============================================================

function EditAccountForm({
  account,
  onSave,
  onCancel,
  isSaving,
}: {
  account: SafeWithdrawalAccount;
  onSave: (id: string, data: EditAccountFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const t = useTranslations('withdrawalAccounts');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditAccountFormData>({
    resolver: zodResolver(editAccountSchema),
    defaultValues: {
      account_holder_name: account.account_holder_name,
    },
  });

  return (
    <Card>
      <CardContent className="pt-4">
        <form
          onSubmit={handleSubmit((data) => onSave(account.id, data))}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Badge className={PROVIDER_COLORS[account.provider]}>
              {PROVIDER_LABELS[account.provider]}
            </Badge>
            <span className="font-mono text-sm text-muted-foreground">
              {account.account_number_masked}
            </span>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`edit-holder-${account.id}`}>
              {t('holderName')}
            </Label>
            <Input
              id={`edit-holder-${account.id}`}
              {...register('account_holder_name')}
              aria-invalid={!!errors.account_holder_name}
            />
            {errors.account_holder_name && (
              <p className="text-xs text-destructive">
                {errors.account_holder_name.message}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving && <Loader2 className="size-3 animate-spin" />}
              {t('save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              {t('cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main Page Component
// ============================================================

export default function WithdrawalAccountsPage() {
  const t = useTranslations('withdrawalAccounts');
  const queryClient = useQueryClient();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] =
    useState<SafeWithdrawalAccount | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // ---- Queries / Mutations ----

  const {
    data: accountsData,
    isLoading,
  } = useQuery({
    queryKey: ['withdrawal-accounts'],
    queryFn: async () => {
      const result = await withdrawalAccountsApi.list();
      if (!result.success) throw new Error(result.error);
      return result.data!.accounts;
    },
  });

  const accounts = accountsData || [];

  const createMutation = useMutation({
    mutationFn: (data: CreateAccountFormData) =>
      withdrawalAccountsApi.create(data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['withdrawal-accounts'] });
        setShowAddForm(false);
        setMessage({ type: 'success', text: t('addSuccess') });
      } else {
        setMessage({ type: 'error', text: result.error || t('error') });
      }
    },
    onError: () => {
      setMessage({ type: 'error', text: t('error') });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditAccountFormData }) =>
      withdrawalAccountsApi.update(id, data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['withdrawal-accounts'] });
        setEditingAccount(null);
        setMessage({ type: 'success', text: t('updateSuccess') });
      } else {
        setMessage({ type: 'error', text: result.error || t('error') });
      }
    },
    onError: () => {
      setMessage({ type: 'error', text: t('error') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => withdrawalAccountsApi.delete(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['withdrawal-accounts'] });
        setMessage({ type: 'success', text: t('deleteSuccess') });
      } else {
        setMessage({ type: 'error', text: result.error || t('error') });
      }
    },
    onError: () => {
      setMessage({ type: 'error', text: t('error') });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (id: string) => withdrawalAccountsApi.setPrimary(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['withdrawal-accounts'] });
        setMessage({ type: 'success', text: t('primarySuccess') });
      } else {
        setMessage({ type: 'error', text: result.error || t('error') });
      }
    },
    onError: () => {
      setMessage({ type: 'error', text: t('error') });
    },
  });

  // ---- Create Account Form ----

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    setValue: setCreateValue,
    watch: watchCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<CreateAccountFormData>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      provider: WithdrawalProvider.UZCARD,
      account_number: '',
      account_holder_name: '',
    },
  });

  const cardNumberValue = watchCreate('account_number');

  const onCreateSubmit = (data: CreateAccountFormData) => {
    setMessage(null);
    createMutation.mutate(data);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    setCreateValue('account_number', raw, { shouldValidate: true });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        {!showAddForm && (
          <Button
            onClick={() => {
              setShowAddForm(true);
              setMessage(null);
              resetCreate();
            }}
            size="sm"
          >
            <Plus className="size-4" />
            {t('addAccount')}
          </Button>
        )}
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Add Account Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-5" />
                {t('addAccount')}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowAddForm(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmitCreate(onCreateSubmit)}
              className="space-y-4"
            >
              {/* Provider */}
              <div className="space-y-2">
                <Label htmlFor="provider">{t('provider')}</Label>
                <select
                  id="provider"
                  {...registerCreate('provider')}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {Object.values(WithdrawalProvider).map((p) => (
                    <option key={p} value={p}>
                      {PROVIDER_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Card Number */}
              <div className="space-y-2">
                <Label htmlFor="account_number">{t('cardNumber')}</Label>
                <Input
                  id="account_number"
                  placeholder="0000 0000 0000 0000"
                  value={formatCardInput(cardNumberValue)}
                  onChange={handleCardNumberChange}
                  aria-invalid={!!createErrors.account_number}
                  maxLength={19}
                />
                {createErrors.account_number && (
                  <p className="text-xs text-destructive">
                    {createErrors.account_number.message}
                  </p>
                )}
              </div>

              {/* Holder Name */}
              <div className="space-y-2">
                <Label htmlFor="account_holder_name">{t('holderName')}</Label>
                <Input
                  id="account_holder_name"
                  {...registerCreate('account_holder_name')}
                  aria-invalid={!!createErrors.account_holder_name}
                />
                {createErrors.account_holder_name && (
                  <p className="text-xs text-destructive">
                    {createErrors.account_holder_name.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  {t('addAccount')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  {t('cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && accounts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="mb-3 size-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          </CardContent>
        </Card>
      )}

      {/* Account list */}
      <div className="space-y-3">
        {accounts.map((account) =>
          editingAccount?.id === account.id ? (
            <EditAccountForm
              key={account.id}
              account={account}
              onSave={(id, data) =>
                updateMutation.mutate({ id, data })
              }
              onCancel={() => setEditingAccount(null)}
              isSaving={updateMutation.isPending}
            />
          ) : (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={setEditingAccount}
              onDelete={(id) => deleteMutation.mutate(id)}
              onSetPrimary={(id) => setPrimaryMutation.mutate(id)}
            />
          ),
        )}
      </div>
    </div>
  );
}
