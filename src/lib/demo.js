// A made-up route for trying the app without real data or GPS.
const start = [49.2636, -123.1046];
const step = [0, -0.0062]; // about 450 m west per stop

const names = ['Demo stop A', 'Demo stop B', 'Demo stop C', 'Demo stop D', 'Demo stop E', 'Demo stop F'];

export const DEMO_CODE = '00000';

export const DEMO_RAW = {
  stops: names.map((name, i) => [
    i === names.length - 1 ? DEMO_CODE : `0000${i + 1}`,
    name,
    +(start[0] + step[0] * i).toFixed(5),
    +(start[1] + step[1] * i).toFixed(5),
  ]),
  patterns: [{ r: 'Demo', h: 'Demo stop F', s: names.map((_, i) => i) }],
};
