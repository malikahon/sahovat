'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ACTION_TYPES = [
  'verify_campaign',
  'reject_campaign',
  'freeze_campaign',
  'unfreeze_campaign',
  'set_campaign_paused',
  'set_campaign_active',
  'set_campaign_cancelled',
  'make_admin',
  'revoke_admin',
  'ban_user',
  'unban_user',
  'update_settings',
];

const TARGET_TYPES = ['campaign', 'user', 'withdrawal', 'settings'];

const ACTION_COLORS: Record<string, string> = {
  verify_campaign: 'bg-green-100 text-green-800',
  reject_campaign: 'bg-red-100 text-red-800',
  freeze_campaign: 'bg-blue-100 text-blue-800',
  ban_user: 'bg-red-100 text-red-800',
  unban_user: 'bg-green-100 text-green-800',
  make_admin: 'bg-purple-100 text-purple-800',
  revoke_admin: 'bg-orange-100 text-orange-800',
  update_settings: 'bg-yellow-100 text-yellow-800',
};

const PAGE_SIZE = 20;

function JsonDisplay({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return <span className="text-muted-foreground text-xs">—</span>;

  return (
    <div className="rounded-md bg-muted/40 p-2 font-mono text-xs space-y-0.5">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="text-muted-foreground">{k}:</span>
          <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminAuditPage() {
  const t = useTranslations('admin.audit');

  const [actionFilter, setActionFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-log', actionFilter, targetFilter, fromDate, toDate, page],
    queryFn: () =>
      adminApi.getAuditLog({
        action_type: actionFilter || undefined,
        target_type: targetFilter || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const actions = data?.actions ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.total_pages ?? 1;

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={actionFilter || '_all'}
          onValueChange={(v: string | null) => { setActionFilter(!v || v === '_all' ? '' : v); setPage(1); }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('filterAction')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">{t('allActions')}</SelectItem>
            {ACTION_TYPES.map((a) => {
              const label = a.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <SelectItem key={a} value={a} label={label}>
                  <span className="text-xs">{a.replace(/_/g, ' ')}</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Select
          value={targetFilter || '_all'}
          onValueChange={(v: string | null) => { setTargetFilter(!v || v === '_all' ? '' : v); setPage(1); }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t('filterTarget')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">{t('allTargets')}</SelectItem>
            {TARGET_TYPES.map((tgt) => (
              <SelectItem key={tgt} value={tgt} label={tgt.charAt(0).toUpperCase() + tgt.slice(1)} className="capitalize">{tgt}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">{t('fromDate')}</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="w-36 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">{t('toDate')}</label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="w-36 text-sm"
          />
        </div>

        {(actionFilter || targetFilter || fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActionFilter('');
              setTargetFilter('');
              setFromDate('');
              setToDate('');
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>{t('timestamp')}</TableHead>
              <TableHead>{t('admin')}</TableHead>
              <TableHead>{t('actionType')}</TableHead>
              <TableHead>{t('targetType')}</TableHead>
              <TableHead>{t('targetId')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : actions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {t('noActions')}
                </TableCell>
              </TableRow>
            ) : (
              actions.flatMap((action) => {
                const isExpanded = expandedRows.has(action.id);
                const hasDetails = Object.keys(action.details).length > 0;
                return [
                  <TableRow
                    key={action.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => hasDetails && toggleRow(action.id)}
                  >
                    <TableCell className="w-8 text-muted-foreground">
                      {hasDetails ? (
                        isExpanded
                          ? <ChevronDown className="size-4" />
                          : <ChevronRight className="size-4" />
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(action.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {action.admin_display_name || action.admin_phone}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[action.action_type] ?? 'bg-muted text-muted-foreground'}`}
                      >
                        {action.action_type.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">
                        {action.target_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {action.target_id.slice(0, 8)}…
                    </TableCell>
                  </TableRow>,
                  isExpanded && hasDetails ? (
                    <TableRow key={`${action.id}-details`} className="bg-muted/20">
                      <TableCell />
                      <TableCell colSpan={5} className="py-3 pb-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          {t('details')}
                        </p>
                        <JsonDisplay data={action.details} />
                      </TableCell>
                    </TableRow>
                  ) : null,
                ].filter(Boolean);
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
    </div>
  );
}
