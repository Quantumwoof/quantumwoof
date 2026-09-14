/**
 * Compact bright-star catalog (approx J2000 RA hours / Dec degrees).
 * Magnitudes are rough visual; good enough for garden alt/az toys.
 */

export type CatalogStar = {
  id: string;
  /** Display label when connected / labelled on the board */
  name?: string;
  /** Right ascension in hours (0–24) */
  ra: number;
  /** Declination in degrees */
  dec: number;
  /** Apparent magnitude (lower = brighter) */
  mag: number;
};

export const STARS: Record<string, CatalogStar> = {
  // Orion
  betelgeuse: { id: "betelgeuse", name: "Betelgeuse", ra: 5.9195, dec: 7.407, mag: 0.45 },
  bellatrix: { id: "bellatrix", name: "Bellatrix", ra: 5.4189, dec: 6.35, mag: 1.64 },
  alnitak: { id: "alnitak", name: "Alnitak", ra: 5.6793, dec: -1.943, mag: 1.77 },
  alnilam: { id: "alnilam", name: "Alnilam", ra: 5.6036, dec: -1.202, mag: 1.69 },
  mintaka: { id: "mintaka", name: "Mintaka", ra: 5.5334, dec: -0.299, mag: 2.23 },
  saiph: { id: "saiph", name: "Saiph", ra: 5.7959, dec: -9.67, mag: 2.09 },
  rigel: { id: "rigel", name: "Rigel", ra: 5.2423, dec: -8.202, mag: 0.13 },

  // Canis Major
  sirius: { id: "sirius", name: "Sirius", ra: 6.7525, dec: -16.716, mag: -1.46 },
  mirzam: { id: "mirzam", name: "Mirzam", ra: 6.3783, dec: -17.956, mag: 1.98 },
  adhara: { id: "adhara", name: "Adhara", ra: 6.9771, dec: -28.972, mag: 1.5 },
  wezen: { id: "wezen", name: "Wezen", ra: 7.1399, dec: -26.393, mag: 1.83 },

  // Cassiopeia
  caph: { id: "caph", name: "Caph", ra: 0.1528, dec: 59.15, mag: 2.28 },
  schedar: { id: "schedar", name: "Schedar", ra: 0.6751, dec: 56.537, mag: 2.24 },
  gammaCas: { id: "gammaCas", name: "γ Cas", ra: 0.9451, dec: 60.717, mag: 2.47 },
  ruchbah: { id: "ruchbah", name: "Ruchbah", ra: 1.4302, dec: 60.235, mag: 2.68 },
  segin: { id: "segin", name: "Segin", ra: 1.9066, dec: 63.67, mag: 3.35 },

  // Ursa Minor
  polaris: { id: "polaris", name: "Polaris", ra: 2.5303, dec: 89.264, mag: 1.98 },
  yildun: { id: "yildun", ra: 17.5369, dec: 86.586, mag: 4.35 },
  epsUMi: { id: "epsUMi", ra: 16.7662, dec: 82.037, mag: 4.21 },
  zetaUMi: { id: "zetaUMi", ra: 15.7343, dec: 77.795, mag: 4.29 },
  kochab: { id: "kochab", name: "Kochab", ra: 14.8451, dec: 74.155, mag: 2.07 },
  pherkad: { id: "pherkad", name: "Pherkad", ra: 15.3455, dec: 71.834, mag: 3.0 },
  etaUMi: { id: "etaUMi", ra: 16.2918, dec: 75.755, mag: 4.95 },

  // Crux
  acrux: { id: "acrux", name: "Acrux", ra: 12.4433, dec: -63.099, mag: 0.77 },
  mimosa: { id: "mimosa", name: "Mimosa", ra: 12.7954, dec: -59.689, mag: 1.25 },
  gacrux: { id: "gacrux", name: "Gacrux", ra: 12.5194, dec: -57.113, mag: 1.59 },
  deltaCru: { id: "deltaCru", name: "δ Cru", ra: 12.2524, dec: -58.749, mag: 2.79 },

  // Centaurus pointers
  hadar: { id: "hadar", name: "Hadar", ra: 14.0637, dec: -60.373, mag: 0.61 },
  rigilKent: { id: "rigilKent", name: "α Cen", ra: 14.6601, dec: -60.835, mag: -0.01 },

  // Leo
  regulus: { id: "regulus", name: "Regulus", ra: 10.1395, dec: 11.967, mag: 1.35 },
  algieba: { id: "algieba", name: "Algieba", ra: 10.3329, dec: 19.841, mag: 2.08 },
  zosma: { id: "zosma", name: "Zosma", ra: 11.2351, dec: 20.524, mag: 2.56 },
  chertan: { id: "chertan", name: "Chertan", ra: 11.2373, dec: 15.429, mag: 3.33 },
  denebola: { id: "denebola", name: "Denebola", ra: 11.8177, dec: 14.572, mag: 2.14 },

  // Scorpius
  dschubba: { id: "dschubba", name: "Dschubba", ra: 16.0056, dec: -22.622, mag: 2.29 },
  antares: { id: "antares", name: "Antares", ra: 16.4901, dec: -26.432, mag: 0.96 },
  graffias: { id: "graffias", name: "Graffias", ra: 16.0901, dec: -19.806, mag: 2.62 },
  shaula: { id: "shaula", name: "Shaula", ra: 17.5601, dec: -37.104, mag: 1.62 },
  lesath: { id: "lesath", name: "Lesath", ra: 17.486, dec: -37.296, mag: 2.7 },
  sargas: { id: "sargas", name: "Sargas", ra: 17.6217, dec: -42.998, mag: 1.86 },

  // Summer Triangle
  vega: { id: "vega", name: "Vega", ra: 18.6156, dec: 38.784, mag: 0.03 },
  deneb: { id: "deneb", name: "Deneb", ra: 20.6905, dec: 45.28, mag: 1.25 },
  altair: { id: "altair", name: "Altair", ra: 19.8464, dec: 8.868, mag: 0.76 },

  // Pegasus square + tip
  markab: { id: "markab", name: "Markab", ra: 23.0793, dec: 15.205, mag: 2.49 },
  scheat: { id: "scheat", name: "Scheat", ra: 23.0629, dec: 28.083, mag: 2.42 },
  algenib: { id: "algenib", name: "Algenib", ra: 0.2206, dec: 15.183, mag: 2.83 },
  alpheratz: { id: "alpheratz", name: "Alpheratz", ra: 0.1398, dec: 29.091, mag: 2.07 },

  // Sagittarius teapot (bright corners)
  narkab: { id: "narkab", name: "Nunki", ra: 18.9211, dec: -26.297, mag: 2.05 },
  kausAus: { id: "kausAus", name: "Kaus Australis", ra: 18.4029, dec: -34.384, mag: 1.79 },
  ascella: { id: "ascella", name: "Ascella", ra: 19.0435, dec: -29.88, mag: 2.6 },
  kausMed: { id: "kausMed", name: "Kaus Media", ra: 18.3498, dec: -29.828, mag: 2.72 },
  kausBor: { id: "kausBor", name: "Kaus Borealis", ra: 18.4663, dec: -25.421, mag: 2.81 },

  // Extra field brighties
  canopus: { id: "canopus", name: "Canopus", ra: 6.3992, dec: -52.696, mag: -0.74 },
  arcturus: { id: "arcturus", name: "Arcturus", ra: 14.261, dec: 19.182, mag: -0.05 },
  spica: { id: "spica", name: "Spica", ra: 13.4199, dec: -11.161, mag: 0.98 },
  capella: { id: "capella", name: "Capella", ra: 5.2782, dec: 45.998, mag: 0.08 },
  aldebaran: { id: "aldebaran", name: "Aldebaran", ra: 4.5987, dec: 16.509, mag: 0.85 },
  fomalhaut: { id: "fomalhaut", name: "Fomalhaut", ra: 22.9608, dec: -29.622, mag: 1.17 },
  achernar: { id: "achernar", name: "Achernar", ra: 1.6286, dec: -57.237, mag: 0.45 },
};

export const ALL_STARS: CatalogStar[] = Object.values(STARS);
