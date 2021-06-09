export const renderHelpers = `
import * as t from 'io-ts';
import { optionFromNullable } from 'io-ts-types';

const Pick = <P extends t.Props, Key extends keyof P>(p: P, ...keys: Array<Key>): t.TypeC<Pick<P, Key>> => {
  const entries = Object.keys(p).map(k => [k, p[k]]) as Array<[Key, t.mixed]>;
  const props = entries.reduce<Pick<P, Key>>(
    (acc, [key, value]) => (keys.includes(key) ? { ...acc, [key]: value } : acc),
    {} as Pick<P, Key>
  );

  return t.type(props);
};
`;
