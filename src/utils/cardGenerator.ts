/**
 * Luxury Wedding Card Generator (HTML5 Canvas)
 * Generates personalized, high-resolution (1200x800) invitation & save-the-date cards
 * with couple names, date, and venue to replace generic stock photos.
 */

export interface CardGeneratorOptions {
  theme: string;
  groom: string;
  bride: string;
  weddingDate: string;
  venue: string;
  isOfficial?: boolean;
  title?: string;
  dressCode?: string;
}

export function generateLuxuryWeddingCardDataUrl(options: CardGeneratorOptions): string {
  if (typeof document === 'undefined') return '';

  const {
    theme = 'royal_gold',
    groom = 'Devansh',
    bride = 'Helly',
    weddingDate = '12th December 2026',
    venue = 'Taj Lake Palace, Udaipur',
    isOfficial = true,
    title = 'Request the pleasure of your company to celebrate their wedding'
  } = options;

  const width = 1200;
  const height = 800;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Theme palettes configuration
  interface ThemeColors {
    bgGradient: [string, string, string];
    borderGold: string;
    borderInner: string;
    accentGold: string;
    textPrimary: string;
    textSecondary: string;
    cardBoxBg: string;
    cardBoxBorder: string;
  }

  const themes: Record<string, ThemeColors> = {
    royal_gold: {
      bgGradient: ['#1C1409', '#2E2210', '#150E05'],
      borderGold: '#D4AF37',
      borderInner: '#AA8222',
      accentGold: '#F3E5AB',
      textPrimary: '#F7E7CE',
      textSecondary: '#D1B98A',
      cardBoxBg: 'rgba(0, 0, 0, 0.45)',
      cardBoxBorder: 'rgba(212, 175, 55, 0.4)'
    },
    classic_ivory: {
      bgGradient: ['#FAF8F5', '#F2ECE1', '#EBE3D3'],
      borderGold: '#9E8044',
      borderInner: '#C5A96A',
      accentGold: '#7A5E25',
      textPrimary: '#221F1B',
      textSecondary: '#5C5449',
      cardBoxBg: 'rgba(255, 255, 255, 0.75)',
      cardBoxBorder: 'rgba(158, 128, 68, 0.35)'
    },
    floral_emerald: {
      bgGradient: ['#061A13', '#0C2D21', '#04130D'],
      borderGold: '#D4AF37',
      borderInner: '#8F7323',
      accentGold: '#E6C665',
      textPrimary: '#E8F5E9',
      textSecondary: '#A3C9B8',
      cardBoxBg: 'rgba(3, 20, 14, 0.65)',
      cardBoxBorder: 'rgba(212, 175, 55, 0.4)'
    },
    pastel_rose: {
      bgGradient: ['#FFF0F3', '#FCE4EC', '#F8BBD0'],
      borderGold: '#B76E79',
      borderInner: '#D49BA3',
      accentGold: '#8C3D4B',
      textPrimary: '#3E2723',
      textSecondary: '#6D4C41',
      cardBoxBg: 'rgba(255, 255, 255, 0.8)',
      cardBoxBorder: 'rgba(183, 110, 121, 0.4)'
    },
    imperial_indigo: {
      bgGradient: ['#050B1A', '#0B1B3D', '#030814'],
      borderGold: '#D4AF37',
      borderInner: '#A88320',
      accentGold: '#F5E19A',
      textPrimary: '#E3F2FD',
      textSecondary: '#90CAF9',
      cardBoxBg: 'rgba(4, 10, 26, 0.65)',
      cardBoxBorder: 'rgba(212, 175, 55, 0.4)'
    },
    vintage_burgundy: {
      bgGradient: ['#22030B', '#3E0817', '#170107'],
      borderGold: '#E5C158',
      borderInner: '#A38029',
      accentGold: '#F7DC89',
      textPrimary: '#FCE4EC',
      textSecondary: '#F8BBD0',
      cardBoxBg: 'rgba(20, 1, 6, 0.65)',
      cardBoxBorder: 'rgba(229, 193, 88, 0.4)'
    }
  };

  const current = themes[theme] || themes.royal_gold;

  // 1. Draw Background Gradient
  const grad = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width * 0.7);
  grad.addColorStop(0, current.bgGradient[1]);
  grad.addColorStop(0.65, current.bgGradient[0]);
  grad.addColorStop(1, current.bgGradient[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. Draw Decorative Luxury Outer & Inner Borders
  ctx.strokeStyle = current.borderGold;
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  ctx.strokeStyle = current.borderInner;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(48, 48, width - 96, height - 96);

  // Corner Diamond Accents
  const drawDiamond = (x: number, y: number, size: number) => {
    ctx.fillStyle = current.borderGold;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.fill();
  };

  drawDiamond(36, 36, 9);
  drawDiamond(width - 36, 36, 9);
  drawDiamond(36, height - 36, 9);
  drawDiamond(width - 36, height - 36, 9);

  // Corner Inner Florals
  drawDiamond(48, 48, 5);
  drawDiamond(width - 48, 48, 5);
  drawDiamond(48, height - 48, 5);
  drawDiamond(width - 48, height - 48, 5);

  ctx.textAlign = 'center';

  // 3. Header Tag (Invitation vs Save the Date)
  ctx.fillStyle = current.accentGold;
  ctx.font = 'bold 22px "Cinzel", "Times New Roman", serif';
  ctx.letterSpacing = '6px';
  const tagText = isOfficial ? '👑  WEDDING INVITATION  👑' : '💌  SAVE THE DATE  💌';
  ctx.fillText(tagText, width / 2, 120);

  // Thin Divider
  ctx.strokeStyle = current.borderGold;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 140, 142);
  ctx.lineTo(width / 2 + 140, 142);
  ctx.stroke();

  // 4. Couple Names
  ctx.fillStyle = current.borderGold;
  ctx.font = 'bold 64px "Playfair Display", "Georgia", serif';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 6;
  ctx.fillText(groom, width / 2, 230);

  ctx.font = 'italic 300 28px "Playfair Display", "Georgia", serif';
  ctx.fillStyle = current.textSecondary;
  ctx.shadowBlur = 0;
  ctx.fillText('&', width / 2, 280);

  ctx.fillStyle = current.borderGold;
  ctx.font = 'bold 64px "Playfair Display", "Georgia", serif';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 6;
  ctx.fillText(bride, width / 2, 360);
  ctx.shadowBlur = 0;

  // 5. Title / Invitation Line
  ctx.fillStyle = current.textPrimary;
  ctx.font = 'normal 22px "Cinzel", "Georgia", serif';
  const cleanTitle = (title || 'Request the honour of your presence at their wedding celebration').trim();
  ctx.fillText(cleanTitle, width / 2, 435);

  // 6. Venue & Date Box
  const boxWidth = 720;
  const boxHeight = 150;
  const boxX = (width - boxWidth) / 2;
  const boxY = 485;

  ctx.fillStyle = current.cardBoxBg;
  ctx.strokeStyle = current.cardBoxBorder;
  ctx.lineWidth = 1.5;

  // Rounded Box
  const radius = 16;
  ctx.beginPath();
  ctx.moveTo(boxX + radius, boxY);
  ctx.lineTo(boxX + boxWidth - radius, boxY);
  ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
  ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
  ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
  ctx.lineTo(boxX + radius, boxY + boxHeight);
  ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
  ctx.lineTo(boxX, boxY + radius);
  ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Date
  ctx.fillStyle = current.accentGold;
  ctx.font = 'bold 30px "Cinzel", "Times New Roman", serif';
  ctx.fillText(`📅  ${weddingDate.toUpperCase()}`, width / 2, boxY + 58);

  // Venue
  ctx.fillStyle = current.textPrimary;
  ctx.font = 'bold 24px "Cinzel", "Georgia", serif';
  ctx.fillText(`📍  ${venue}`, width / 2, boxY + 112);

  // 7. Footer Note
  ctx.fillStyle = current.textSecondary;
  ctx.font = 'italic 18px "Georgia", serif';
  ctx.fillText('Personalized Itinerary & Luxury Room Assignment link enclosed below', width / 2, 690);

  ctx.fillStyle = current.accentGold;
  ctx.font = 'bold 15px "Courier New", monospace';
  ctx.fillText('RSVP & CELEBRATION PORTAL', width / 2, 730);

  return canvas.toDataURL('image/jpeg', 0.88);
}
