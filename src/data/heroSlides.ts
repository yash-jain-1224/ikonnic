import type { HeroSlide } from "@/types";

const slides = [
  ["Every wall can tell a story", "Acrylic Wall Photos", "Turn favourite moments into glossy, gallery-ready wall art.", "acrylic-wall-photo", "personilsed photo wall gallery banner.png"],
  ["Time, made personal", "Photo Wall Clocks", "A practical centrepiece designed around your people.", "wall-clocks", "wall clock banner image.png"],
  ["A warmer welcome", "Custom Name Plates", "Modern acrylic signs for homes, studios, and thoughtful housewarming gifts.", "acrylic-name-plate", "nameplate banner image.png"],
  ["Make an entrance", "Monogram Nameplates", "Bold initials and elegant silhouettes, cut to feel unmistakably yours.", "acrylic-monogram-nameplate", "monogram banner image.png"],
  ["Little moments, close by", "Photo Fridge Magnets", "Build a cheerful collection of everyday memories.", "acrylic-photo-fridge-magnets", "personlized fridge magnets banner.png"],
  ["Frame it beautifully", "Aluminium Framed Photos", "A clean, contemporary finish for portraits and landscapes.", "aluminium-framed-acrylic-photo", "aluminium frame banner image.png"],
  ["Carry the memory", "Personalised Keychains", "Small keepsakes with names, photos, and plenty of personality.", "personalised-keychains", "personlized keychains banner.png"],
  ["Travel with a signature", "Custom Luggage Tags", "Spot your bags fast with a tag made only for you.", "luggage-tags", "luggage tag banner image.png"],
  ["Build your own gallery", "Mini Wall Gallery & Photo Stands", "Mix shapes and stories into a playful photo arrangement.", "acrylic-photo-mini-wall-gallery", "photo stands wall gallery banner.png"],
  ["Keep every chapter", "Photo Albums", "Designed books for birthdays, trips, weddings, and family stories.", "photo-albums", "photo album banner.png"],
  ["Gifts that feel considered", "Celebration Keepsakes", "Personal details make even small gifts feel wonderfully specific.", "personalised-keychains", "ustomized keepsakes.png"],
] as const;

export const heroSlides: HeroSlide[] = slides.map(([eyebrow, title, description, categorySlug, image], index) => ({
  id: index + 1,
  eyebrow,
  title,
  description,
  categorySlug,
  image: `/images/banner-slides/${image}`,
}));
