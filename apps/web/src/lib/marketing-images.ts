/**
 * Marketing photography, served from Unsplash's CDN (Unsplash License — free
 * for commercial use, no attribution required). Rendered through next/image;
 * `images.unsplash.com` is allowed in next.config.mjs.
 *
 * Build URLs with `unsplash(id, width)` so every image is requested at a
 * sensible size instead of the multi-megabyte original.
 */
export function unsplash(id: string, width = 1200, quality = 75) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=${quality}`;
}

export const photos = {
  /** Fashion entrepreneur in her studio, on the phone at her laptop. */
  heroFounder: { id: "1753164597612-5e71b83fda91", alt: "Fashion brand founder taking a customer call in her studio" },
  /** Woman laughing while reading her phone. */
  happyCustomer: { id: "1595986630530-969786b19b4d", alt: "Customer smiling at a message on her phone" },
  /** Woman at a café counter using her phone. */
  shopOwnerPhone: { id: "1687293233269-c6df38c3662f", alt: "Shop owner replying to customers on her phone" },
  /** Food vendor in an apron checking orders on a phone. */
  foodVendor: { id: "1687422808248-f807f4ea2a2e", alt: "Restaurant owner checking new orders on his phone" },
  /** Customer support agents with headsets. */
  supportTeam: { id: "1766066014237-00645c74e9c6", alt: "Support agent with a headset helping customers" },
  /** Two shoppers smiling with shopping bags. */
  shoppers: { id: "1753161022479-c69e063535f3", alt: "Shoppers smiling with their shopping bags" },
  /** Boutique owner standing in her clothing store. */
  boutiqueOwner: { id: "1753161618091-b4cf35b9aa99", alt: "Boutique owner in her clothing store" },
  /** Retail store interior with clothing racks. */
  storeInterior: { id: "1595991209266-5ff5a3a2f008", alt: "Clothing store interior" },
  /** Two men reviewing numbers on a laptop in a shop. */
  ownersReviewing: { id: "1764391791965-e57ac12cbb80", alt: "Business owners reviewing sales on a laptop" },
  /** Woman smiling while using her phone on a sofa. */
  womanPhone: { id: "1573496782432-8690d8148c46", alt: "Woman chatting with a brand on her phone" },
  /** Friends at a café looking at a phone together. */
  friendsCafe: { id: "1758520388274-1b89bfe92b08", alt: "Friends at a café looking at a phone together" },
  /** Woman at a café table looking at her phone. */
  cafePhone: { id: "1653762379954-8943c787e78b", alt: "Woman reading a message at a café" },
} as const;

/** Square portraits for testimonials and avatars. */
export const portraits = {
  womanRed: { id: "1494790108377-be9c29b29330", alt: "Portrait of a smiling woman" },
  manVneck: { id: "1507003211169-0a1dd7228f2d", alt: "Portrait of a smiling man" },
  manHenley: { id: "1500648767791-00dcc994a43e", alt: "Portrait of a man" },
  womanScarf: { id: "1609436132311-e4b0c9370469", alt: "Portrait of a woman" },
  womanGlasses: { id: "1701728667207-54b43dbdab97", alt: "Portrait of a woman wearing glasses" },
  womanBlonde: { id: "1764971591006-b6eb67a8f0cb", alt: "Portrait of a smiling woman" },
} as const;

export type Photo = { id: string; alt: string };
