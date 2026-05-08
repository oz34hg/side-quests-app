import { DarkTheme } from '@react-navigation/native';

import { Mocha } from '@/constants/mocha';

export const MochaNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Mocha.blue,
    background: Mocha.bg0,
    card: Mocha.bg1,
    text: Mocha.fg0,
    border: Mocha.bg3,
    notification: Mocha.red,
  },
};
