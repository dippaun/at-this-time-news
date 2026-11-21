/**
 * Instagram publishing adapter — STUB (out of scope for the demo).
 *
 * Roadmap (Instagram Graph API, Business/Creator account linked to a Facebook Page):
 *  1. POST /{ig-user-id}/media  { image_url, caption }          -> creation_id
 *     (Reels: media_type=REELS, video_url; Carousels: children[])
 *  2. POST /{ig-user-id}/media_publish { creation_id }          -> media id
 *  Requires a Meta app with instagram_content_publish permission (App Review), a long-lived token,
 *  and a publicly reachable PNG URL (our /api/frame/:id endpoint). Limit: ~50 API posts / 24h.
 */
export type PublishResult = { ok: false; reason: string } | { ok: true; mediaId: string };

export async function publishToInstagram(_postId: number): Promise<PublishResult> {
  return { ok: false, reason: 'Instagram publishing is coming soon (Meta app review pending).' };
}
