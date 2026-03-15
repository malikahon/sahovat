import { query, getClient } from '../../config/database.js';
import { storageService } from '../../services/storage.service.js';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../lib/errors.js';
import { CampaignStatus } from '../../types/entities.js';
import type { DocumentType } from '../../types/entities.js';
import type {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignListQuery,
  CampaignWithStats,
} from '../../types/api.js';
import type {
  CampaignRow,
  CampaignDocumentRow,
  CampaignWithStatsRow,
} from './campaigns.types.js';

// ============================================================
// HELPERS
// ============================================================

/** Document types that should be stored in private storage. */
const PRIVATE_DOC_TYPES = new Set<string>([
  'medical_report',
  'id_document',
  'financial_statement',
  'proof_of_residence',
]);

function toCampaignWithStats(row: CampaignWithStatsRow): CampaignWithStats {
  const progress = row.goal_amount > 0
    ? Math.min(100, Math.round((Number(row.current_amount) / Number(row.goal_amount)) * 100))
    : 0;

  return {
    id: row.id,
    creator_id: row.creator_id,
    title: row.title,
    description: row.description,
    category: row.category,
    goal_amount: Number(row.goal_amount),
    current_amount: Number(row.current_amount),
    status: row.status,
    region: row.region,
    is_verified: row.is_verified,
    end_date: row.end_date,
    cover_image_url: row.cover_image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    donor_count: Number(row.donor_count),
    creator_display_name: row.creator_display_name,
    progress_percentage: progress,
  };
}

function toCampaign(row: CampaignRow) {
  return {
    ...row,
    goal_amount: Number(row.goal_amount),
    current_amount: Number(row.current_amount),
  };
}

function toDocument(row: CampaignDocumentRow) {
  return {
    ...row,
    file_size: Number(row.file_size),
  };
}

// ============================================================
// 4.1 — CREATE CAMPAIGN
// ============================================================

export async function createCampaign(
  creatorId: string,
  data: CreateCampaignDto,
): Promise<CampaignRow> {
  // 4.2 — Verify user has at least one withdrawal account
  const accountResult = await query(
    'SELECT COUNT(*)::int AS count FROM withdrawal_accounts WHERE user_id = $1',
    [creatorId],
  );
  const accountCount = (accountResult.rows[0] as { count: number }).count;
  if (accountCount === 0) {
    throw new ValidationError('You must add a withdrawal account before creating a campaign', 'WITHDRAWAL_ACCOUNT_REQUIRED');
  }

  const result = await query(
    `INSERT INTO campaigns (creator_id, title, description, category, goal_amount, region, end_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
     RETURNING *`,
    [
      creatorId,
      data.title,
      data.description,
      data.category,
      data.goal_amount,
      data.region ?? null,
      data.end_date ?? null,
    ],
  );

  return toCampaign(result.rows[0] as CampaignRow);
}

// ============================================================
// 4.1 — GET CAMPAIGN BY ID
// ============================================================

export async function getCampaignById(
  campaignId: string,
  requesterId?: string,
  isAdmin?: boolean,
): Promise<CampaignWithStats> {
  const result = await query(
    `SELECT c.*,
            COALESCE(d.donor_count, 0) AS donor_count,
            u.display_name AS creator_display_name
     FROM campaigns c
     LEFT JOIN (
       SELECT campaign_id,
              COUNT(DISTINCT donor_id)::int AS donor_count
       FROM donations
       WHERE status = 'completed'
       GROUP BY campaign_id
     ) d ON d.campaign_id = c.id
     LEFT JOIN users u ON u.id = c.creator_id
     WHERE c.id = $1`,
    [campaignId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Campaign not found');
  }

  const campaign = result.rows[0] as CampaignWithStatsRow;

  // Draft campaigns are only visible to creator and admins
  if (campaign.status === CampaignStatus.DRAFT) {
    if (!isAdmin && campaign.creator_id !== requesterId) {
      throw new NotFoundError('Campaign not found');
    }
  }

  return toCampaignWithStats(campaign);
}

// ============================================================
// 4.1 — UPDATE CAMPAIGN
// ============================================================

export async function updateCampaign(
  campaignId: string,
  creatorId: string,
  data: UpdateCampaignDto,
): Promise<CampaignRow> {
  // Fetch campaign and verify ownership
  const existingResult = await query(
    'SELECT * FROM campaigns WHERE id = $1',
    [campaignId],
  );

  if (existingResult.rows.length === 0) {
    throw new NotFoundError('Campaign not found');
  }

  const existing = existingResult.rows[0] as CampaignRow;

  if (existing.creator_id !== creatorId) {
    throw new ForbiddenError('You can only edit your own campaigns', 'NOT_CAMPAIGN_OWNER');
  }

  // Only draft or pending_review campaigns can be edited
  if (existing.status !== CampaignStatus.DRAFT && existing.status !== CampaignStatus.PENDING_REVIEW) {
    throw new ValidationError('Campaign can only be edited in draft or pending review status', 'CAMPAIGN_NOT_EDITABLE');
  }

  // Build SET clause dynamically
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    setClauses.push(`title = $${paramIndex}`);
    params.push(data.title);
    paramIndex++;
  }
  if (data.description !== undefined) {
    setClauses.push(`description = $${paramIndex}`);
    params.push(data.description);
    paramIndex++;
  }
  if (data.category !== undefined) {
    setClauses.push(`category = $${paramIndex}`);
    params.push(data.category);
    paramIndex++;
  }
  if (data.goal_amount !== undefined) {
    setClauses.push(`goal_amount = $${paramIndex}`);
    params.push(data.goal_amount);
    paramIndex++;
  }
  if (data.region !== undefined) {
    setClauses.push(`region = $${paramIndex}`);
    params.push(data.region);
    paramIndex++;
  }
  if (data.end_date !== undefined) {
    setClauses.push(`end_date = $${paramIndex}`);
    params.push(data.end_date);
    paramIndex++;
  }

  if (setClauses.length === 0) {
    throw new ValidationError('No fields to update');
  }

  setClauses.push('updated_at = NOW()');

  params.push(campaignId);
  params.push(creatorId);

  const result = await query(
    `UPDATE campaigns
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex} AND creator_id = $${paramIndex + 1}
     RETURNING *`,
    params,
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Campaign not found');
  }

  return toCampaign(result.rows[0] as CampaignRow);
}

// ============================================================
// 4.1 — DELETE CAMPAIGN
// ============================================================

export async function deleteCampaign(
  campaignId: string,
  creatorId: string,
): Promise<void> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Lock the campaign row to prevent concurrent modifications
    const existingResult = await client.query(
      'SELECT * FROM campaigns WHERE id = $1 FOR UPDATE',
      [campaignId],
    );

    if (existingResult.rows.length === 0) {
      throw new NotFoundError('Campaign not found');
    }

    const existing = existingResult.rows[0] as CampaignRow;

    if (existing.creator_id !== creatorId) {
      throw new ForbiddenError('You can only delete your own campaigns', 'NOT_CAMPAIGN_OWNER');
    }

    if (existing.status !== CampaignStatus.DRAFT) {
      throw new ValidationError('Only draft campaigns can be deleted', 'CAMPAIGN_NOT_DRAFT');
    }

    // Fetch associated documents within the transaction
    const docsResult = await client.query(
      'SELECT * FROM campaign_documents WHERE campaign_id = $1',
      [campaignId],
    );

    // Delete document files from storage
    for (const doc of docsResult.rows as CampaignDocumentRow[]) {
      try {
        await storageService.delete(doc.file_url);
      } catch (err) {
        console.warn(`Failed to delete document file ${doc.file_url}:`, err);
      }
    }

    // Delete cover image if exists
    if (existing.cover_image_url) {
      try {
        await storageService.delete(existing.cover_image_url);
      } catch (err) {
        console.warn(`Failed to delete cover image ${existing.cover_image_url}:`, err);
      }
    }

    // CASCADE on campaign_documents handles the rows
    await client.query('DELETE FROM campaigns WHERE id = $1', [campaignId]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// 4.3 — UPLOAD DOCUMENT
// ============================================================

export async function uploadDocument(
  campaignId: string,
  creatorId: string,
  file: Express.Multer.File,
  documentType: DocumentType,
  notes?: string,
  isPrivateOverride?: boolean,
): Promise<CampaignDocumentRow> {
  // Determine if private based on doc type or explicit override
  let isPrivate = isPrivateOverride ?? PRIVATE_DOC_TYPES.has(documentType);

  // Force private for inherently sensitive document types regardless of override
  if (PRIVATE_DOC_TYPES.has(documentType)) {
    isPrivate = true;
  }

  // Save file before transaction to avoid holding locks during I/O
  let fileUrl: string;
  if (isPrivate) {
    fileUrl = await storageService.savePrivate(file.buffer, file.originalname, file.mimetype);
  } else {
    fileUrl = await storageService.savePublic(file.buffer, file.originalname, file.mimetype);
  }

  // Use a transaction with FOR UPDATE to prevent race conditions on document count
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Lock the campaign row to prevent concurrent uploads exceeding the limit
    const campaignResult = await client.query(
      'SELECT * FROM campaigns WHERE id = $1 FOR UPDATE',
      [campaignId],
    );

    if (campaignResult.rows.length === 0) {
      throw new NotFoundError('Campaign not found');
    }

    const campaign = campaignResult.rows[0] as CampaignRow;

    if (campaign.creator_id !== creatorId) {
      throw new ForbiddenError('You can only upload documents to your own campaigns', 'NOT_CAMPAIGN_OWNER');
    }

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.PENDING_REVIEW) {
      throw new ValidationError('Documents can only be uploaded to draft or pending review campaigns', 'CAMPAIGN_NOT_EDITABLE');
    }

    // Check document count (max 15) — atomic with the lock above
    const countResult = await client.query(
      'SELECT COUNT(*)::int AS count FROM campaign_documents WHERE campaign_id = $1',
      [campaignId],
    );
    const docCount = (countResult.rows[0] as { count: number }).count;
    if (docCount >= 15) {
      throw new ValidationError('Maximum 15 documents per campaign', 'MAX_DOCUMENTS');
    }

    const result = await client.query(
      `INSERT INTO campaign_documents (campaign_id, document_type, file_url, file_name, file_size, mime_type, is_private, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [campaignId, documentType, fileUrl, file.originalname, file.size, file.mimetype, isPrivate, notes ?? null],
    );

    await client.query('COMMIT');
    return toDocument(result.rows[0] as CampaignDocumentRow);
  } catch (err) {
    await client.query('ROLLBACK');
    // Clean up the uploaded file on failure
    try {
      await storageService.delete(fileUrl);
    } catch {
      // best-effort cleanup
    }
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// 4.3 — LIST DOCUMENTS
// ============================================================

export async function listDocuments(
  campaignId: string,
  requesterId?: string,
  isAdmin?: boolean,
): Promise<CampaignDocumentRow[]> {
  // Verify campaign exists
  const campaignResult = await query(
    'SELECT creator_id, status FROM campaigns WHERE id = $1',
    [campaignId],
  );

  if (campaignResult.rows.length === 0) {
    throw new NotFoundError('Campaign not found');
  }

  const campaign = campaignResult.rows[0] as { creator_id: string; status: string };

  // Filter: non-admin non-creators can only see public documents of non-draft campaigns
  const isCreator = requesterId === campaign.creator_id;
  let queryText: string;
  const params: unknown[] = [campaignId];

  if (isAdmin || isCreator) {
    // Admins and creators see all documents
    queryText = 'SELECT * FROM campaign_documents WHERE campaign_id = $1 ORDER BY uploaded_at ASC';
  } else {
    // Public sees only non-private documents of non-draft campaigns
    if (campaign.status === 'draft') {
      throw new NotFoundError('Campaign not found');
    }
    queryText = 'SELECT * FROM campaign_documents WHERE campaign_id = $1 AND is_private = FALSE ORDER BY uploaded_at ASC';
  }

  const result = await query(queryText, params);
  return (result.rows as CampaignDocumentRow[]).map(toDocument);
}

// ============================================================
// 4.3 — DELETE DOCUMENT
// ============================================================

export async function deleteDocument(
  campaignId: string,
  documentId: string,
  creatorId: string,
): Promise<void> {
  // Verify campaign ownership
  const campaignResult = await query(
    'SELECT creator_id, status FROM campaigns WHERE id = $1',
    [campaignId],
  );

  if (campaignResult.rows.length === 0) {
    throw new NotFoundError('Campaign not found');
  }

  const campaign = campaignResult.rows[0] as { creator_id: string; status: string };

  if (campaign.creator_id !== creatorId) {
    throw new ForbiddenError('You can only delete documents from your own campaigns', 'NOT_CAMPAIGN_OWNER');
  }

  if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.PENDING_REVIEW) {
    throw new ValidationError('Documents can only be deleted from draft or pending review campaigns', 'CAMPAIGN_NOT_EDITABLE');
  }

  const docResult = await query(
    'SELECT * FROM campaign_documents WHERE id = $1 AND campaign_id = $2',
    [documentId, campaignId],
  );

  if (docResult.rows.length === 0) {
    throw new NotFoundError('Document not found');
  }

  const doc = docResult.rows[0] as CampaignDocumentRow;

  // Delete file from storage
  try {
    await storageService.delete(doc.file_url);
  } catch (err) {
    console.warn(`Failed to delete document file ${doc.file_url}:`, err);
  }

  await query('DELETE FROM campaign_documents WHERE id = $1', [documentId]);
}

// ============================================================
// 4.4 — CAMPAIGN STATISTICS
// ============================================================

export async function getCampaignStats(
  campaignId: string,
  requesterId?: string,
  isAdmin?: boolean,
): Promise<{
  current_amount: number;
  donor_count: number;
  progress_percentage: number;
  total_donations: number;
}> {
  // Verify campaign exists and check visibility
  const campaignResult = await query(
    'SELECT goal_amount, current_amount, status, creator_id FROM campaigns WHERE id = $1',
    [campaignId],
  );

  if (campaignResult.rows.length === 0) {
    throw new NotFoundError('Campaign not found');
  }

  const campaign = campaignResult.rows[0] as {
    goal_amount: number;
    current_amount: number;
    status: string;
    creator_id: string;
  };

  // Draft campaign stats are only visible to creator and admins
  if (campaign.status === CampaignStatus.DRAFT) {
    if (!isAdmin && campaign.creator_id !== requesterId) {
      throw new NotFoundError('Campaign not found');
    }
  }

  // Get donation stats
  const statsResult = await query(
    `SELECT
       COALESCE(SUM(net_amount), 0)::bigint AS total_net,
       COUNT(DISTINCT donor_id)::int AS donor_count,
       COUNT(*)::int AS total_donations
     FROM donations
     WHERE campaign_id = $1 AND status = 'completed'`,
    [campaignId],
  );

  const stats = statsResult.rows[0] as {
    total_net: number;
    donor_count: number;
    total_donations: number;
  };

  const goalAmount = Number(campaign.goal_amount);
  const totalNet = Number(stats.total_net);
  const progress = goalAmount > 0
    ? Math.min(100, Math.round((totalNet / goalAmount) * 100))
    : 0;

  return {
    current_amount: totalNet,
    donor_count: Number(stats.donor_count),
    progress_percentage: progress,
    total_donations: Number(stats.total_donations),
  };
}

// ============================================================
// 4.5 — LIST CAMPAIGNS WITH FILTERS
// ============================================================

export async function listCampaigns(
  filters: CampaignListQuery,
  requesterId?: string,
  isAdmin?: boolean,
): Promise<{
  data: CampaignWithStats[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  const whereClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Status filter — only admins and creators viewing their own campaigns
  // can use the status filter; everyone else is forced to 'active'
  if (isAdmin) {
    // Admin can filter by any status or see all
    if (filters.status) {
      whereClauses.push(`c.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }
  } else if (filters.creator_id && filters.creator_id === requesterId) {
    // Creator viewing their own campaigns — honor status filter or show all
    if (filters.status) {
      whereClauses.push(`c.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }
  } else {
    // Public: always force active only, ignore query parameter
    whereClauses.push(`c.status = 'active'`);
  }

  // Category filter
  if (filters.category) {
    whereClauses.push(`c.category = $${paramIndex}`);
    params.push(filters.category);
    paramIndex++;
  }

  // Region filter
  if (filters.region) {
    whereClauses.push(`c.region = $${paramIndex}`);
    params.push(filters.region);
    paramIndex++;
  }

  // Search filter (title ILIKE)
  if (filters.search) {
    whereClauses.push(`c.title ILIKE $${paramIndex}`);
    const escapedSearch = filters.search
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
    params.push(`%${escapedSearch}%`);
    paramIndex++;
  }

  // Creator filter
  if (filters.creator_id) {
    whereClauses.push(`c.creator_id = $${paramIndex}`);
    params.push(filters.creator_id);
    paramIndex++;
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Sort
  const sortColumn = filters.sort_by ?? 'created_at';
  const sortOrder = filters.sort_order ?? 'desc';
  const allowedSorts = ['created_at', 'goal_amount', 'current_amount', 'end_date'];
  const isUrgencySort = sortColumn === 'urgency';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // Urgency score: 60% funding proximity + 40% deadline proximity
  // Campaigns close to their goal AND close to their deadline rank highest
  const urgencyExpression = `(
    CASE
      WHEN c.goal_amount > 0 THEN LEAST(c.current_amount::float / c.goal_amount, 1.0) * 0.6
      ELSE 0
    END +
    CASE
      WHEN c.end_date IS NOT NULL AND c.end_date >= CURRENT_DATE THEN
        (1.0 / GREATEST(EXTRACT(EPOCH FROM (c.end_date::timestamp - CURRENT_TIMESTAMP)) / 86400.0, 1.0)) * 0.4
      ELSE 0
    END
  )`;

  let orderByClause: string;
  if (isUrgencySort) {
    // Urgency always sorts DESC (most urgent first) regardless of sort_order
    orderByClause = `ORDER BY ${urgencyExpression} DESC`;
  } else {
    const safeSortColumn = allowedSorts.includes(sortColumn) ? `c.${sortColumn}` : 'c.created_at';
    orderByClause = `ORDER BY ${safeSortColumn} ${safeSortOrder}`;
  }

  // Count total
  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM campaigns c ${whereClause}`,
    params,
  );
  const total = (countResult.rows[0] as { total: number }).total;

  // Fetch page
  const dataParams = [...params, limit, offset];
  const result = await query(
    `SELECT c.*,
            COALESCE(d.donor_count, 0) AS donor_count,
            u.display_name AS creator_display_name
     FROM campaigns c
     LEFT JOIN (
       SELECT campaign_id,
              COUNT(DISTINCT donor_id)::int AS donor_count
       FROM donations
       WHERE status = 'completed'
       GROUP BY campaign_id
     ) d ON d.campaign_id = c.id
     LEFT JOIN users u ON u.id = c.creator_id
     ${whereClause}
     ${orderByClause}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    dataParams,
  );

  const campaigns = (result.rows as CampaignWithStatsRow[]).map(toCampaignWithStats);

  return {
    data: campaigns,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============================================================
// 4.6 — SUBMIT CAMPAIGN (draft -> pending_review)
// ============================================================

export async function submitCampaign(
  campaignId: string,
  creatorId: string,
): Promise<CampaignRow> {
  const existingResult = await query(
    'SELECT * FROM campaigns WHERE id = $1',
    [campaignId],
  );

  if (existingResult.rows.length === 0) {
    throw new NotFoundError('Campaign not found');
  }

  const existing = existingResult.rows[0] as CampaignRow;

  if (existing.creator_id !== creatorId) {
    throw new ForbiddenError('You can only submit your own campaigns', 'NOT_CAMPAIGN_OWNER');
  }

  if (existing.status !== CampaignStatus.DRAFT) {
    throw new ValidationError('Only draft campaigns can be submitted for review', 'CAMPAIGN_NOT_DRAFT');
  }

  // Validate required fields
  if (!existing.title || existing.title.trim().length < 3) {
    throw new ValidationError('Campaign title is required (at least 3 characters)');
  }
  if (!existing.description || existing.description.trim().length < 10) {
    throw new ValidationError('Campaign description is required (at least 10 characters)');
  }
  if (!existing.category) {
    throw new ValidationError('Campaign category is required');
  }
  if (!existing.goal_amount || existing.goal_amount <= 0) {
    throw new ValidationError('Campaign goal amount must be positive');
  }
  if (existing.end_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(existing.end_date) < today) {
      throw new ValidationError('Campaign end date must be today or in the future');
    }
  }

  const result = await query(
    `UPDATE campaigns SET status = 'pending_review', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [campaignId],
  );

  return toCampaign(result.rows[0] as CampaignRow);
}

// ============================================================
// 4.6 — UPLOAD COVER IMAGE
// ============================================================

export async function uploadCoverImage(
  campaignId: string,
  creatorId: string,
  file: Express.Multer.File,
): Promise<CampaignRow> {
  const existingResult = await query(
    'SELECT * FROM campaigns WHERE id = $1',
    [campaignId],
  );

  if (existingResult.rows.length === 0) {
    throw new NotFoundError('Campaign not found');
  }

  const existing = existingResult.rows[0] as CampaignRow;

  if (existing.creator_id !== creatorId) {
    throw new ForbiddenError('You can only update your own campaigns', 'NOT_CAMPAIGN_OWNER');
  }

  if (existing.status !== CampaignStatus.DRAFT && existing.status !== CampaignStatus.PENDING_REVIEW) {
    throw new ValidationError('Cover image can only be updated for draft or pending review campaigns', 'CAMPAIGN_NOT_EDITABLE');
  }

  // Delete old cover image if it exists
  if (existing.cover_image_url) {
    try {
      await storageService.delete(existing.cover_image_url);
    } catch (err) {
      console.warn(`Failed to delete old cover image ${existing.cover_image_url}:`, err);
    }
  }

  // Save new cover image to public storage
  const imageUrl = await storageService.savePublic(file.buffer, file.originalname, file.mimetype);

  const result = await query(
    'UPDATE campaigns SET cover_image_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [imageUrl, campaignId],
  );

  return toCampaign(result.rows[0] as CampaignRow);
}
