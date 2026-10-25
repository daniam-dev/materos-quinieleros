import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** CSS es la única fuente de valores. El preset enlaza semántica PrimeNG con MQ. */
export const MaterosPreset = definePreset(Aura, {
  semantic: {
    transitionDuration: 'var(--duration-fast)',
    primary: {
      50: 'var(--color-accent)',
      100: 'var(--color-accent)',
      200: 'var(--color-accent)',
      300: 'var(--color-accent)',
      400: 'var(--color-accent)',
      500: 'var(--color-accent)',
      600: 'var(--color-accent)',
      700: 'var(--color-accent)',
      800: 'var(--color-accent)',
      900: 'var(--color-accent)',
      950: 'var(--color-accent)',
    },
    formField: {
      borderRadius: 'var(--radius-control)',
      paddingX: 'var(--space-4)',
      paddingY: 'var(--space-3)',
      focusRing: { width: '2px', style: 'solid', color: 'var(--color-accent)', offset: '3px' },
    },
    colorScheme: {
      dark: {
        primary: {
          color: 'var(--color-accent)',
          contrastColor: 'var(--color-base)',
          hoverColor: 'var(--color-silver)',
          activeColor: 'var(--color-accent)',
        },
        formField: {
          background: 'var(--color-surface)',
          color: 'var(--color-ink)',
          borderColor: 'var(--color-line)',
          hoverBorderColor: 'var(--color-muted)',
          focusBorderColor: 'var(--color-accent)',
          placeholderColor: 'var(--color-muted)',
        },
        content: {
          background: 'var(--color-surface)',
          color: 'var(--color-ink)',
          borderColor: 'var(--color-line)',
        },
        text: { color: 'var(--color-ink)', mutedColor: 'var(--color-muted)' },
        highlight: {
          background: 'var(--color-selected)',
          color: 'var(--color-accent)',
          focusBackground: 'var(--color-selected)',
          focusColor: 'var(--color-accent)',
        },
        overlay: {
          select: {
            background: 'var(--glass-floating)',
            borderColor: 'var(--color-line)',
            color: 'var(--color-ink)',
          },
          modal: {
            background: 'var(--glass-floating)',
            borderColor: 'var(--color-line)',
            color: 'var(--color-ink)',
          },
        },
      },
    },
  },
  components: {
    select: {
      root: { borderRadius: 'var(--radius-control)' },
      overlay: { borderRadius: 'var(--radius-card)' },
      option: { borderRadius: 'var(--radius-control)' },
    },
    dialog: { root: { borderRadius: 'var(--radius-dialog)', shadow: 'var(--shadow-floating)' } },
  },
});
