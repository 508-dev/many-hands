export const categories = [
  { slug: "building", label: "Building & Repair", emoji: "🔨", colour: "#87402d" },
  { slug: "making", label: "Making & Crafts", emoji: "🧵", colour: "#8a3562" },
  { slug: "art", label: "Art & Design", emoji: "🎨", colour: "#843570" },
  { slug: "tech", label: "Tech & Coding", emoji: "💻", colour: "#245b85" },
  { slug: "organizing", label: "Organizing & Admin", emoji: "🗂️", colour: "#62520a" },
  { slug: "teaching", label: "Teaching & Tutoring", emoji: "📚", colour: "#355e87" },
  { slug: "languages", label: "Languages & Translation", emoji: "🗣️", colour: "#315f58" },
  { slug: "cooking", label: "Cooking & Food", emoji: "🍳", colour: "#8a4324" },
  { slug: "garden", label: "Garden & Outdoors", emoji: "🌱", colour: "#38632f" },
  { slug: "moving", label: "Moving & Driving", emoji: "🚚", colour: "#3e5f75" },
  { slug: "care", label: "Care (kids, pets, elders)", emoji: "🤲", colour: "#7e3f51" },
  { slug: "health", label: "Health & Fitness", emoji: "💪", colour: "#276455" },
  { slug: "music", label: "Music & Performance", emoji: "🎵", colour: "#654482" },
  { slug: "money", label: "Money & Careers", emoji: "💼", colour: "#4d5c27" },
  { slug: "other", label: "Other", emoji: "✨", colour: "#5f5142" },
] as const;

export type Category = (typeof categories)[number];
export type CategorySlug = Category["slug"];

export function getCategory(slug: string): Category {
  return categories.find((category) => category.slug === slug) ?? categories[categories.length - 1];
}
