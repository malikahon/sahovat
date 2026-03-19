import { query } from '../../config/database.js';
import { paymeClient } from '../../services/payme.client.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import type { SavedCard } from '../../types/entities.js';

// ============================================================
// TYPES
// ============================================================

interface SavedCardRow {
  id: string;
  user_id: string;
  card_token: string;
  card_number_masked: string;
  card_expire: string;
  card_type: string;
  is_default: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// HELPERS
// ============================================================

function detectCardType(cardNumber: string): string {
  if (cardNumber.startsWith('8600')) return 'uzcard';
  if (cardNumber.startsWith('9860')) return 'humo';
  return 'unknown';
}

/**
 * Extract a human-readable message from a PayMe client error.
 * PayMe errors look like: "[PayMe] cards.create failed: Card expired (code: -31400)"
 */
function toPaymeValidationError(err: unknown): ValidationError {
  const msg = err instanceof Error ? err.message : 'Payment provider error';
  // Strip the "[PayMe] method failed: " prefix for a cleaner user-facing message
  const cleaned = msg.replace(/^\[PayMe\]\s*\S+\s*failed:\s*/i, '');
  return new ValidationError(cleaned, 'PAYME_ERROR');
}

/** Strips sensitive fields for API responses. */
function toSafeCard(row: SavedCardRow): Omit<SavedCardRow, 'card_token'> {
  const { card_token: _token, ...safe } = row;
  return safe;
}

// ============================================================
// INITIATE CARD ADD
// ============================================================

/**
 * Step 1 of card add flow.
 * Calls PayMe cards.create + cards.get_verify_code.
 * Inserts an unverified record into saved_cards and returns the card_id.
 */
export async function initiateCardAdd(
  userId: string,
  cardNumber: string,
  cardExpire: string,
): Promise<{ card_id: string; phone_masked: string; wait: number }> {
  // Call PayMe to tokenize the card
  let cardResult;
  try {
    cardResult = await paymeClient.cardsCreate(cardNumber, cardExpire, true);
  } catch (err) {
    throw toPaymeValidationError(err);
  }

  // Request verification code
  let verifyResult;
  try {
    verifyResult = await paymeClient.cardsGetVerifyCode(cardResult.token);
  } catch (err) {
    throw toPaymeValidationError(err);
  }

  const cardType = detectCardType(cardNumber);

  // Insert unverified card
  const insertResult = await query(
    `INSERT INTO saved_cards (user_id, card_token, card_number_masked, card_expire, card_type, is_default, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      userId,
      cardResult.token,
      cardResult.number,
      cardResult.expire,
      cardType,
      false,
      false,
    ],
  );

  const cardId = (insertResult.rows[0] as { id: string }).id;

  return {
    card_id: cardId,
    phone_masked: verifyResult.phone,
    wait: verifyResult.wait,
  };
}

// ============================================================
// VERIFY CARD
// ============================================================

/**
 * Step 2 of card add flow.
 * Verifies the OTP with PayMe and marks the card as verified.
 * If this is the user's first card, makes it the default.
 */
export async function verifyCard(
  userId: string,
  cardId: string,
  code: string,
): Promise<Omit<SavedCardRow, 'card_token'>> {
  // Find the unverified card
  const result = await query(
    `SELECT * FROM saved_cards WHERE id = $1 AND user_id = $2`,
    [cardId, userId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Card not found');
  }

  const card = result.rows[0] as SavedCardRow;

  if (card.is_verified) {
    throw new ValidationError('Card is already verified', 'CARD_ALREADY_VERIFIED');
  }

  // Verify with PayMe
  let verifiedCard;
  try {
    verifiedCard = await paymeClient.cardsVerify(card.card_token, code);
  } catch (err) {
    throw toPaymeValidationError(err);
  }

  // Check if user has any other cards (for auto-default)
  const existingCards = await query(
    `SELECT COUNT(*) AS count FROM saved_cards WHERE user_id = $1 AND is_verified = true`,
    [userId],
  );
  const isFirstCard = Number((existingCards.rows[0] as { count: string }).count) === 0;

  // Update card: mark verified, update token (may change after verification)
  const updateResult = await query(
    `UPDATE saved_cards
     SET is_verified = true,
         card_token = $1,
         card_number_masked = $2,
         card_expire = $3,
         is_default = $4,
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [
      verifiedCard.token,
      verifiedCard.number,
      verifiedCard.expire,
      isFirstCard,
      cardId,
    ],
  );

  return toSafeCard(updateResult.rows[0] as SavedCardRow);
}

// ============================================================
// LIST USER CARDS
// ============================================================

/**
 * Returns all verified cards for a user.
 * Card tokens are stripped from the response.
 */
export async function listUserCards(
  userId: string,
): Promise<Omit<SavedCardRow, 'card_token'>[]> {
  const result = await query(
    `SELECT * FROM saved_cards WHERE user_id = $1 AND is_verified = true ORDER BY is_default DESC, created_at DESC`,
    [userId],
  );

  return (result.rows as SavedCardRow[]).map(toSafeCard);
}

// ============================================================
// GET CARD TOKEN (internal — not exposed to API)
// ============================================================

/**
 * Returns the full card record including token. Only for internal use
 * (payment processing, recurring charges).
 */
export async function getCardWithToken(
  cardId: string,
  userId: string,
): Promise<SavedCardRow> {
  const result = await query(
    `SELECT * FROM saved_cards WHERE id = $1 AND user_id = $2 AND is_verified = true`,
    [cardId, userId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Saved card not found');
  }

  return result.rows[0] as SavedCardRow;
}

/**
 * Returns the user's default card with token. For recurring charges.
 */
export async function getDefaultCard(
  userId: string,
): Promise<SavedCardRow | null> {
  const result = await query(
    `SELECT * FROM saved_cards WHERE user_id = $1 AND is_default = true AND is_verified = true`,
    [userId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as SavedCardRow;
}

// ============================================================
// REMOVE CARD
// ============================================================

/**
 * Removes a saved card. Calls PayMe cards.remove to invalidate the token.
 */
export async function removeCard(
  userId: string,
  cardId: string,
): Promise<void> {
  const result = await query(
    `SELECT * FROM saved_cards WHERE id = $1 AND user_id = $2`,
    [cardId, userId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Card not found');
  }

  const card = result.rows[0] as SavedCardRow;

  // Try to remove from PayMe (non-critical if fails)
  try {
    await paymeClient.cardsRemove(card.card_token);
  } catch (err) {
    console.error(`[Sahovat] Failed to remove card from PayMe:`, err);
  }

  await query(`DELETE FROM saved_cards WHERE id = $1`, [cardId]);
}

// ============================================================
// SET DEFAULT CARD
// ============================================================

/**
 * Sets a card as the user's default. Unsets any previous default.
 */
export async function setDefaultCard(
  userId: string,
  cardId: string,
): Promise<void> {
  const result = await query(
    `SELECT id FROM saved_cards WHERE id = $1 AND user_id = $2 AND is_verified = true`,
    [cardId, userId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Card not found');
  }

  // Unset previous default
  await query(
    `UPDATE saved_cards SET is_default = false, updated_at = NOW() WHERE user_id = $1 AND is_default = true`,
    [userId],
  );

  // Set new default
  await query(
    `UPDATE saved_cards SET is_default = true, updated_at = NOW() WHERE id = $1`,
    [cardId],
  );
}
