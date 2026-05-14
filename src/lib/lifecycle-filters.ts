export const BRANDS = ['All', 'Aceable', 'DriversEd.com', 'PrepAgent', 'iDriveSafely'] as const;
export const VERTICALS = ['All', 'Driving', 'Insurance', 'Mortgage', 'Real Estate'] as const;

export type Brand = (typeof BRANDS)[number];
export type Vertical = (typeof VERTICALS)[number];
