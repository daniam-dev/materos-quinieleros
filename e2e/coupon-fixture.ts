import type { Browser } from '@playwright/test';

// Transcription of the supplied image. This rendering is a regression fixture,
// not a claim to have tested the user's original image file.
export const couponPairs = [
  ['Levante', 'At. Madrid', 'M'],
  ['Rayo Vallecano', 'Celta', 'M'],
  ['Betis', 'Málaga', 'M'],
  ['Barcelona', 'Alavés', 'M'],
  ['Getafe', 'Sevilla', 'M'],
  ['Racing Santander', 'Real Madrid', 'M'],
  ['Elche', 'Valencia', 'M'],
  ['Eibar', 'Almería', 'M'],
  ['Eldense', 'Granada', 'M'],
  ['Burgos', 'Castellón', 'M'],
  ['Alavés', 'Real Sociedad', 'F'],
  ['Madrid CFF', 'Deportivo', 'F'],
  ['Sevilla', 'Real Madrid', 'F'],
  ['Tenerife', 'Athletic Club', 'F'],
  ['Athletic Club', 'Real Sociedad', 'M'],
] as const;

export async function couponImage(browser: Browser, { highlightFirst = true } = {}) {
  const fixture = await browser.newPage({ viewport: { width: 1122, height: 1134 } });
  await fixture.setContent(`<!doctype html><html lang="es"><meta charset="utf-8">
    <style>
      body { margin: 54px; background: white; color: #263d49; font: 27px/48px Arial, sans-serif; }
      p { margin: 0; height: 60px; white-space: nowrap; }
      p:nth-child(even) { background: #fff2f5; }
      b { display: inline-block; width: 80px; font-weight: normal; }
      span { display: inline-block; width: 790px; height: 48px; border: 1px solid #ddd; border-radius: 28px; padding-left: 12px; }
      ${highlightFirst ? 'p:first-child span { background: #90c4db; color: white; font-weight: bold; border-color: transparent; }' : ''}
      p:last-child { margin-top: 94px; height: 150px; background: #fce8ec; padding-top: 18px; }
      p:last-child span { border: none; }
    </style><body>${couponPairs.map(([home, away, category], i) => `<p><b>${i + 1}.</b><span>${home} (${category}) - ${away} (${category})</span></p>`).join('')}</body></html>`);
  const buffer = await fixture.screenshot({ fullPage: true });
  await fixture.close();
  return {
    name: highlightFirst ? 'colored-coupon.png' : 'unselected-coupon.png',
    mimeType: 'image/png',
    buffer,
  };
}
