// Landing type from AERO's site category (contracts sites.schema.json): Apollo and Artemis are the crewed programmes;
// every other category in the catalogue is a robotic lander. Display mapping only.
export const landingType = (s: { category: string }): 'crewed' | 'robotic' =>
  s.category === 'apollo' || s.category === 'artemis' ? 'crewed' : 'robotic'
