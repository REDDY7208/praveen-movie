/** Shared types across all theater modules */

export type TheaterMode = 'cinema' | 'disco' | 'off'

export interface FrequencyBands {
  // 12-band spectrum
  sub1:     number  // 20–40 Hz    sub-bass rumble
  sub2:     number  // 40–80 Hz    deep bass
  bass1:    number  // 80–160 Hz   kick / punch
  bass2:    number  // 160–320 Hz  bass warmth
  lowMid1:  number  // 320–640 Hz  low mid body
  lowMid2:  number  // 640–1.2kHz  mid presence
  mid1:     number  // 1.2–2.5kHz  dialogue clarity
  mid2:     number  // 2.5–5kHz    attack transients
  high1:    number  // 5–8kHz      highs
  high2:    number  // 8–12kHz     air
  air1:     number  // 12–16kHz    shimmer
  air2:     number  // 16–20kHz    ultra high

  // Derived
  bassEnergy:    number  // avg of sub1+sub2+bass1+bass2
  midEnergy:     number  // avg of lowMid1+lowMid2+mid1+mid2
  trebleEnergy:  number  // avg of high1+high2+air1+air2
  loudness:      number  // overall RMS-like
  beat:          boolean // true on beat detection frame
  peak:          boolean // sudden loudness spike
}
