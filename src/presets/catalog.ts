import type { SubtitleStyle } from '../render/ass.js';

export type PresetId =
  | 'horror'
  | 'luxury'
  | 'comedy'
  | 'gaming'
  | 'fitness'
  | 'motivational'
  | 'news'
  | 'podcast'
  | 'storytelling'
  | 'educational'
  | 'wellness'
  | 'cinematic';

export interface VibePreset {
  id: PresetId;
  label: string;
  description: string;
  tags: string[];
  style: SubtitleStyle;
}

export const PRESET_CATALOG: VibePreset[] = [
  {
    id: 'horror',
    label: 'Horror',
    description: 'Gothic, blood-red, spooky',
    tags: ['horror', 'spooky', 'gothic', 'scary', 'halloween', 'dark', 'blood', 'creepy', 'haunted', 'witch', 'ghost'],
    style: {
      fontFamily: 'Creepster',
      fontSize: 32, primaryColor: '#8B0000', outlineColor: '#000000', shadowColor: '#1a0000',
      bold: false, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
    },
  },
  {
    id: 'luxury',
    label: 'Luxury',
    description: 'Premium serif, cream + bronze',
    tags: ['luxury', 'classy', 'elegant', 'premium', 'fashion', 'wine', 'expensive', 'high-end', 'designer'],
    style: {
      fontFamily: 'DM Serif Display',
      fontSize: 30, primaryColor: '#F5E6C8', outlineColor: '#3D2817', shadowColor: '#1a0f08',
      bold: false, italic: false, alignment: 'center', showShadow: true, textCase: 'capitalize',
    },
  },
  {
    id: 'comedy',
    label: 'Comedy',
    description: 'Bangers yellow, meme energy',
    tags: ['comedy', 'funny', 'meme', 'joke', 'lol', 'sketch', 'viral', 'humor', 'laugh', 'prank'],
    style: {
      fontFamily: 'Bangers',
      fontSize: 36, primaryColor: '#FFFF00', outlineColor: '#000000', shadowColor: '#000000',
      bold: false, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
    },
  },
  {
    id: 'gaming',
    label: 'Gaming',
    description: 'Pixel arcade, neon green',
    tags: ['gaming', 'game', 'esports', 'twitch', 'pixel', 'retro', 'arcade', 'streamer', 'rpg', 'fps'],
    style: {
      fontFamily: 'Press Start 2P',
      fontSize: 22, primaryColor: '#39FF14', outlineColor: '#000000', shadowColor: '#003300',
      bold: false, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
    },
  },
  {
    id: 'fitness',
    label: 'Fitness',
    description: 'Hardcore red on white',
    tags: ['fitness', 'workout', 'gym', 'motivation', 'intense', 'hardcore', 'lift', 'cardio', 'gains', 'training'],
    style: {
      fontFamily: 'Gabarito',
      fontSize: 32, primaryColor: '#FF4444', outlineColor: '#FFFFFF', shadowColor: '#000000',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
    },
  },
  {
    id: 'motivational',
    label: 'Motivational',
    description: 'Yellow Anton, hustle energy',
    tags: ['motivation', 'motivational', 'inspire', 'mindset', 'hustle', 'grind', 'success', 'wealth', 'mindfulness'],
    style: {
      fontFamily: 'Anton',
      fontSize: 32, primaryColor: '#FFE600', outlineColor: '#000000', shadowColor: '#333300',
      bold: false, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
    },
  },
  {
    id: 'news',
    label: 'News',
    description: 'Clean white sans on black',
    tags: ['news', 'breaking', 'journalism', 'anchor', 'headline', 'report', 'press', 'media'],
    style: {
      fontFamily: 'Roboto',
      fontSize: 26, primaryColor: '#FFFFFF', outlineColor: '#000000', shadowColor: '#000000',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'normal',
    },
  },
  {
    id: 'podcast',
    label: 'Podcast',
    description: 'Heavy Montserrat, conversational',
    tags: ['podcast', 'interview', 'conversation', 'host', 'talk', 'discussion', 'chat', 'guest'],
    style: {
      fontFamily: 'Montserrat Black',
      fontSize: 28, primaryColor: '#FFFFFF', outlineColor: '#1a1a1a', shadowColor: '#000000',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'normal',
    },
  },
  {
    id: 'storytelling',
    label: 'Storytelling',
    description: 'Playfair beige, narrative',
    tags: ['story', 'storytelling', 'narrative', 'drama', 'once-upon-a-time', 'tale', 'fairy-tale', 'novel', 'memoir'],
    style: {
      fontFamily: 'Playfair Display',
      fontSize: 28, primaryColor: '#F5F5DC', outlineColor: '#8B4513', shadowColor: '#3D2817',
      bold: false, italic: true, alignment: 'center', showShadow: true, textCase: 'capitalize',
    },
  },
  {
    id: 'educational',
    label: 'Educational',
    description: 'Friendly blue Poppins',
    tags: ['educational', 'education', 'tutorial', 'learn', 'explain', 'lesson', 'teach', 'how-to', 'study', 'school', 'class'],
    style: {
      fontFamily: 'Poppins',
      fontSize: 26, primaryColor: '#4A90E2', outlineColor: '#FFFFFF', shadowColor: '#1a3a5c',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'normal',
    },
  },
  {
    id: 'wellness',
    label: 'Wellness',
    description: 'Calm teal, mindful',
    tags: ['wellness', 'yoga', 'calm', 'mindful', 'health', 'meditation', 'breathing', 'spa', 'self-care', 'zen'],
    style: {
      fontFamily: 'Roboto',
      fontSize: 26, primaryColor: '#00D9B1', outlineColor: '#FFFFFF', shadowColor: '#005c4d',
      bold: false, italic: false, alignment: 'center', showShadow: true, textCase: 'capitalize',
    },
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    description: 'Heavy white sans, epic',
    tags: ['cinematic', 'trailer', 'epic', 'vista', 'dramatic', 'music-video', 'film', 'movie', 'travel'],
    style: {
      fontFamily: 'Fira Sans Condensed',
      fontSize: 30, primaryColor: '#FFFFFF', outlineColor: '#1a1a1a', shadowColor: '#000000',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
    },
  },
];

const BY_ID: Record<string, VibePreset> = Object.fromEntries(
  PRESET_CATALOG.map(p => [p.id, p])
);

export function getPreset(id: string): VibePreset | undefined {
  return BY_ID[id];
}

export function listPresetIds(): PresetId[] {
  return PRESET_CATALOG.map(p => p.id);
}
