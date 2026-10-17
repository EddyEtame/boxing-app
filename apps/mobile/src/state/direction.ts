import { create } from 'zustand';

/**
 * Les trois directions artistiques construites en parallèle, à leur sommet,
 * pour qu’Eddy choisisse par préférence. Un interrupteur en haut de l’écran
 * bascule l’app entière : structure, typographie, couleur, mouvement.
 */
export type Direction = 'A' | 'B' | 'C';

type DirectionState = {
  direction: Direction;
  setDirection: (d: Direction) => void;
  cycle: () => void;
};

const ORDER: Direction[] = ['A', 'B', 'C'];

export const useDirection = create<DirectionState>((set, get) => ({
  direction: 'A',
  setDirection: (direction) => set({ direction }),
  cycle: () => {
    const i = ORDER.indexOf(get().direction);
    set({ direction: ORDER[(i + 1) % ORDER.length] });
  },
}));
