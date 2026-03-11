import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/middleware.js';
import type { CreateCampaignDto, UpdateCampaignDto, CampaignListQuery } from '../../types/api.js';
import type { DocumentType } from '../../types/entities.js';
import { ValidationError } from '../../lib/errors.js';
import * as campaignsService from './campaigns.service.js';

// ============================================================
// 4.1 — CRUD
// ============================================================

/**
 * POST /api/campaigns
 */
export async function createCampaign(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const data = req.body as CreateCampaignDto;

  const campaign = await campaignsService.createCampaign(authReq.user.id, data);

  res.status(201).json({
    success: true,
    data: campaign,
  });
}

/**
 * GET /api/campaigns/:id
 */
export async function getCampaign(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const authReq = req as AuthenticatedRequest;
  const requesterId = authReq.user?.id;
  const isAdmin = authReq.user?.is_admin;

  const campaign = await campaignsService.getCampaignById(id, requesterId, isAdmin);

  res.status(200).json({
    success: true,
    data: campaign,
  });
}

/**
 * PUT /api/campaigns/:id
 */
export async function updateCampaign(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const id = req.params.id as string;
  const data = req.body as UpdateCampaignDto;

  const campaign = await campaignsService.updateCampaign(id, authReq.user.id, data);

  res.status(200).json({
    success: true,
    data: campaign,
  });
}

/**
 * DELETE /api/campaigns/:id
 */
export async function deleteCampaign(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const id = req.params.id as string;

  await campaignsService.deleteCampaign(id, authReq.user.id);

  res.status(200).json({
    success: true,
    message: 'Campaign deleted successfully',
  });
}

// ============================================================
// 4.3 — DOCUMENTS
// ============================================================

/**
 * POST /api/campaigns/:id/documents
 */
export async function uploadDocument(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const id = req.params.id as string;
  const file = req.file;

  if (!file) {
    throw new ValidationError('Document file is required');
  }

  const { document_type, notes, is_private } = req.body;

  const document = await campaignsService.uploadDocument(
    id,
    authReq.user.id,
    file,
    document_type as DocumentType,
    notes,
    is_private,
  );

  res.status(201).json({
    success: true,
    data: document,
  });
}

/**
 * GET /api/campaigns/:id/documents
 */
export async function listDocuments(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const authReq = req as AuthenticatedRequest;
  const requesterId = authReq.user?.id;
  const isAdmin = authReq.user?.is_admin;

  const documents = await campaignsService.listDocuments(id, requesterId, isAdmin);

  res.status(200).json({
    success: true,
    data: documents,
  });
}

/**
 * DELETE /api/campaigns/:id/documents/:docId
 */
export async function deleteDocument(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const id = req.params.id as string;
  const docId = req.params.docId as string;

  await campaignsService.deleteDocument(id, docId, authReq.user.id);

  res.status(200).json({
    success: true,
    message: 'Document deleted successfully',
  });
}

// ============================================================
// 4.4 — STATISTICS
// ============================================================

/**
 * GET /api/campaigns/:id/stats
 */
export async function getCampaignStats(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const authReq = req as AuthenticatedRequest;
  const requesterId = authReq.user?.id;
  const isAdmin = authReq.user?.is_admin;

  const stats = await campaignsService.getCampaignStats(id, requesterId, isAdmin);

  res.status(200).json({
    success: true,
    data: stats,
  });
}

// ============================================================
// 4.5 — LIST CAMPAIGNS
// ============================================================

/**
 * GET /api/campaigns
 */
export async function listCampaigns(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const filters = req.query as unknown as CampaignListQuery;
  const requesterId = authReq.user?.id;
  const isAdmin = authReq.user?.is_admin;

  const result = await campaignsService.listCampaigns(filters, requesterId, isAdmin);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
}

// ============================================================
// 4.6 — SUBMIT & COVER IMAGE
// ============================================================

/**
 * PUT /api/campaigns/:id/submit
 */
export async function submitCampaign(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const id = req.params.id as string;

  const campaign = await campaignsService.submitCampaign(id, authReq.user.id);

  res.status(200).json({
    success: true,
    data: campaign,
  });
}

/**
 * POST /api/campaigns/:id/cover-image
 */
export async function uploadCoverImage(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const id = req.params.id as string;
  const file = req.file;

  if (!file) {
    throw new ValidationError('Cover image file is required');
  }

  const campaign = await campaignsService.uploadCoverImage(id, authReq.user.id, file);

  res.status(200).json({
    success: true,
    data: campaign,
  });
}
