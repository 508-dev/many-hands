import { requestsCopy } from "./copy/requests";
import type { ContactSnapshot } from "./types";

export interface ContactLink {
  label: string;
  href: string;
}

function digitsOnly(value: string): string {
  return value.replace(/\D+/g, "");
}

function plusNumber(value: string): string {
  return `+${digitsOnly(value)}`;
}

/**
 * Tap links for a contact snapshot, per docs/architecture.md:
 * email → mailto:, phone → tel: and sms:, WhatsApp → wa.me, Signal →
 * signal.me/#p/+, Telegram → t.me, other → plain text (no links).
 */
export function contactLinks(snapshot: ContactSnapshot): ContactLink[] {
  const value = snapshot.value.trim();
  const labels = requestsCopy.contact.linkLabels;
  switch (snapshot.method) {
    case "email":
      return [{ label: labels.email, href: `mailto:${value}` }];
    case "phone": {
      const number = plusNumber(value);
      return [
        { label: labels.call, href: `tel:${number}` },
        { label: labels.text, href: `sms:${number}` },
      ];
    }
    case "whatsapp":
      return [{ label: labels.whatsapp, href: `https://wa.me/${digitsOnly(value)}` }];
    case "signal":
      return [{ label: labels.signal, href: `https://signal.me/#p/${plusNumber(value)}` }];
    case "telegram":
      return [{ label: labels.telegram, href: `https://t.me/${value.replace(/^@/, "")}` }];
    default:
      return [];
  }
}
