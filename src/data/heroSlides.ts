import type { HeroSlide } from "@/types";

const slides = [
  ["Every wall can tell a story", "Acrylic Wall Photos", "Turn favourite moments into glossy, gallery-ready wall art.", "acrylic-wall-photo"],
  ["Time, made personal", "Photo Wall Clocks", "A practical centrepiece designed around your people.", "wall-clocks"],
  ["A warmer welcome", "Custom Name Plates", "Modern acrylic signs for homes, studios, and thoughtful housewarming gifts.", "acrylic-name-plate"],
  ["Make an entrance", "Monogram Nameplates", "Bold initials and elegant silhouettes, cut to feel unmistakably yours.", "acrylic-monogram-nameplate"],
  ["Little moments, close by", "Photo Fridge Magnets", "Build a cheerful collection of everyday memories.", "acrylic-photo-fridge-magnets"],
  ["Frame it beautifully", "Aluminium Framed Photos", "A clean, contemporary finish for portraits and landscapes.", "aluminium-framed-acrylic-photo"],
  ["Carry the memory", "Personalised Keychains", "Small keepsakes with names, photos, and plenty of personality.", "personalised-keychains"],
  ["Travel with a signature", "Custom Luggage Tags", "Spot your bags fast with a tag made only for you.", "luggage-tags"],
  ["Build your own gallery", "Mini Wall Gallery", "Mix shapes and stories into a playful photo arrangement.", "acrylic-photo-mini-wall-gallery"],
  ["A bright desk companion", "Acrylic Photo Stands", "A favourite photograph, beautifully ready for any shelf or desk.", "acrylic-photo-stand"],
  ["Keep every chapter", "Photo Albums", "Designed books for birthdays, trips, weddings, and family stories.", "photo-albums"],
  ["Gifts that feel considered", "Celebration Keepsakes", "Personal details make even small gifts feel wonderfully specific.", "personalised-keychains"],
  ["Made for your people", "Giftora Originals", "Personalised decor and keepsakes, edited by you and made with care.", "acrylic-wall-photo"],
] as const;

export const heroSlides: HeroSlide[] = slides.map(([eyebrow, title, description, categorySlug], index) => ({
  id: index + 1,
  eyebrow,
  title,
  description,
  categorySlug,
  image: `/images/catalog/${categorySlug}-hero.webp`,
}));
