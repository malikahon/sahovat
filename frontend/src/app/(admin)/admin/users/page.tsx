'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Search, MoreHorizontal, ShieldCheck, ShieldOff, Ban, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api';
import { formatUZS } from '@/lib/formatters';
import { useAuth } from '@/hooks/useAuth';
import { VerificationStatus } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ConfirmAction =
  | { type: 'admin'; userId: string; displayName: string; newValue: boolean }
  | { type: 'ban'; userId: string; displayName: string; newValue: boolean };

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const t = useTranslations('admin.users');
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [showAdmins, setShowAdmins] = useState(false);
  const [showBanned, setShowBanned] = useState(false);
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [banReason, setBanReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout((handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer);
    (handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', debouncedSearch, verificationFilter, showAdmins, showBanned, page],
    queryFn: () =>
      adminApi.listUsers({
        search: debouncedSearch || undefined,
        verification_status: verificationFilter || undefined,
        is_admin: showAdmins ? true : undefined,
        is_banned: showBanned ? true : undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const users = data?.users ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.total_pages ?? 1;

  async function handleConfirm() {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      let result;
      if (confirmAction.type === 'admin') {
        result = await adminApi.toggleAdmin(confirmAction.userId, confirmAction.newValue);
        if (result.success) {
          toast.success(confirmAction.newValue ? t('adminGranted') : t('adminRevoked'));
        }
      } else if (confirmAction.type === 'ban') {
        result = await adminApi.toggleBan(
          confirmAction.userId,
          confirmAction.newValue,
          confirmAction.newValue ? banReason : undefined,
        );
        if (result.success) {
          toast.success(confirmAction.newValue ? t('userBanned') : t('userUnbanned'));
        }
      }

      if (!result?.success) {
        toast.error(result?.error ?? 'Action failed');
      } else {
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
      setBanReason('');
    }
  }

  const isBanConfirm = confirmAction?.type === 'ban' && confirmAction.newValue;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={verificationFilter}
          onValueChange={(v: string | null) => { setVerificationFilter(!v || v === '_all' ? '' : v); setPage(1); }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t('filterVerification')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All verification</SelectItem>
            {Object.values(VerificationStatus).map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="show-admins"
            checked={showAdmins}
            onCheckedChange={(v) => { setShowAdmins(v); setPage(1); }}
          />
          <Label htmlFor="show-admins" className="text-sm cursor-pointer">{t('showAdmins')}</Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="show-banned"
            checked={showBanned}
            onCheckedChange={(v) => { setShowBanned(v); setPage(1); }}
          />
          <Label htmlFor="show-banned" className="text-sm cursor-pointer">{t('showBanned')}</Label>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('displayName')}</TableHead>
              <TableHead>{t('phone')}</TableHead>
              <TableHead>{t('verificationStatus')}</TableHead>
              <TableHead>{t('isAdmin')}</TableHead>
              <TableHead>{t('isBanned')}</TableHead>
              <TableHead>{t('campaignsCreated')}</TableHead>
              <TableHead>{t('totalDonated')}</TableHead>
              <TableHead>{t('joinedAt')}</TableHead>
              <TableHead className="w-12">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(9)].map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <TableRow
                    key={u.id}
                    className={u.is_banned ? 'opacity-60' : ''}
                  >
                    <TableCell className="font-medium">
                      {u.display_name || '—'}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {u.phone_number}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize text-xs ${
                          u.verification_status === 'approved'
                            ? 'border-green-500 text-green-600'
                            : u.verification_status === 'pending'
                            ? 'border-yellow-500 text-yellow-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {u.verification_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.is_admin ? (
                        <Badge className="bg-primary text-primary-foreground text-xs">Admin</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.is_banned ? (
                        <Badge variant="destructive" className="text-xs">Banned</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-center">{u.campaign_count}</TableCell>
                    <TableCell className="text-sm">{formatUZS(u.total_donated)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          disabled={isSelf}
                          className="inline-flex items-center justify-center rounded-md size-8 hover:bg-muted text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {u.is_admin ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setConfirmAction({
                                  type: 'admin',
                                  userId: u.id,
                                  displayName: u.display_name || u.phone_number,
                                  newValue: false,
                                })
                              }
                              className="text-orange-600"
                            >
                              <ShieldOff className="size-4 mr-2" />
                              {t('revokeAdmin')}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                setConfirmAction({
                                  type: 'admin',
                                  userId: u.id,
                                  displayName: u.display_name || u.phone_number,
                                  newValue: true,
                                })
                              }
                            >
                              <ShieldCheck className="size-4 mr-2" />
                              {t('makeAdmin')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {u.is_banned ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setConfirmAction({
                                  type: 'ban',
                                  userId: u.id,
                                  displayName: u.display_name || u.phone_number,
                                  newValue: false,
                                })
                              }
                            >
                              <UserCheck className="size-4 mr-2" />
                              {t('unbanUser')}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                setConfirmAction({
                                  type: 'ban',
                                  userId: u.id,
                                  displayName: u.display_name || u.phone_number,
                                  newValue: true,
                                })
                              }
                              className="text-destructive"
                            >
                              <Ban className="size-4 mr-2" />
                              {t('banUser')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({pagination?.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) { setConfirmAction(null); setBanReason(''); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'admin'
                ? t('adminToggleConfirm')
                : confirmAction?.newValue
                ? t('banConfirm')
                : t('unbanConfirm')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              User: <strong>{confirmAction?.displayName}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isBanConfirm && (
            <div className="space-y-2">
              <Label className="text-sm">{t('banReason')}</Label>
              <Textarea
                placeholder={t('banReason')}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={2}
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={actionLoading}
              className={
                confirmAction?.type === 'ban' && confirmAction.newValue
                  ? 'bg-destructive hover:bg-destructive/90'
                  : ''
              }
            >
              {actionLoading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
