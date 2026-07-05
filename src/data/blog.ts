import { placeholderImage } from "@/lib/placeholders";
import type { BlogPost } from "@/types";

const blogSeeds = [
  ["how-to-choose-a-gallery-wall", "How to Choose Photos for a Gallery Wall", "A practical edit for turning a camera roll into a balanced display."],
  ["birthday-gifts-that-feel-personal", "Birthday Gifts That Feel Genuinely Personal", "Simple ways to make a familiar gift feel unmistakably theirs."],
  ["photo-album-storytelling", "Tell a Better Story With Your Photo Album", "Arrange moments with rhythm, contrast, and a satisfying final page."],
  ["easy-couple-photo-poses", "Easy Couple Photo Poses That Look Natural", "Low-pressure prompts that make portraits feel warm instead of staged."],
  ["housewarming-gift-guide", "A Thoughtful Housewarming Gift Guide", "Useful, personal, and display-ready ideas for a brand-new space."],
  ["preserve-family-photographs", "How to Preserve Family Photographs", "A calm workflow for organising, backing up, and displaying family archives."],
  ["travel-memory-wall", "Build a Travel Memory Wall", "Map journeys through colour, place, and small details worth keeping."],
  ["personalised-gifts-for-parents", "Personalised Gifts Parents Actually Use", "Meaningful keepsakes that can still live comfortably in everyday spaces."],
  ["choosing-the-right-photo-crop", "Choosing the Right Photo Crop", "A quick guide to portrait, landscape, square, and expressive close crops."],
] as const;

export const blogPosts: BlogPost[] = blogSeeds.map(([slug, title, excerpt], index) => ({
  slug,
  title,
  excerpt,
  date: `June ${18 - index}, 2026`,
  image: placeholderImage(index + 70, title),
  content: [
    "Personalised decor works best when the story is clear before the design becomes busy. Start by choosing one emotion or moment you want the finished piece to hold.",
    "Look for photographs with clean light, comfortable expressions, and enough space around the subject for cropping. A mix of close portraits and wider contextual images usually creates better visual rhythm.",
    "Keep colours connected without forcing a perfect match. Repeating one or two tones across images, frames, captions, or backgrounds will make the result feel intentional.",
    "Finally, leave a little breathing room. The most memorable personalised pieces feel edited, not crowded, and give the important image space to do its work.",
  ],
}));

export const blogBySlug = (slug: string) => blogPosts.find((post) => post.slug === slug);
