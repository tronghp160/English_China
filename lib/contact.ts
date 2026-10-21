/** The owner's public contact info, shown on /lien-he, the landing footer and Settings. */
export const CONTACT = {
  facebook: "https://www.facebook.com/trong.huynh.961169",
  zaloPhone: "0332412829",
} as const;

export const zaloUrl = (phone: string) => `https://zalo.me/${phone}`;

/** 0332412829 → 0332 412 829 */
export function formatPhone(phone: string) {
  return phone.replace(/^(\d{4})(\d{3})(\d+)$/, "$1 $2 $3");
}
