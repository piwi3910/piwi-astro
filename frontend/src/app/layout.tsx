import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/carousel/styles.css';
import 'leaflet/dist/leaflet.css';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { Providers } from './providers';

export const metadata = {
  title: 'piwi-astro - Astrophotography Planning & Portfolio',
  description: 'Plan your astrophotography sessions and showcase your work',
};

// Custom theme with solid backgrounds for UI components
// This prevents the starfield background from showing through UI elements
const theme = createTheme({
  components: {
    Paper: {
      defaultProps: {
        styles: {
          root: {
            backgroundColor: 'var(--mantine-color-dark-7)',
          },
        },
      },
    },
    Card: {
      defaultProps: {
        styles: {
          root: {
            backgroundColor: 'var(--mantine-color-dark-7)',
          },
        },
      },
    },
    Modal: {
      defaultProps: {
        styles: {
          content: {
            backgroundColor: 'var(--mantine-color-dark-7)',
          },
        },
      },
    },
    Menu: {
      defaultProps: {
        styles: {
          dropdown: {
            backgroundColor: 'var(--mantine-color-dark-7)',
          },
        },
      },
    },
    Popover: {
      defaultProps: {
        styles: {
          dropdown: {
            backgroundColor: 'var(--mantine-color-dark-7)',
          },
        },
      },
    },
    Select: {
      defaultProps: {
        styles: {
          dropdown: {
            backgroundColor: 'var(--mantine-color-dark-7)',
          },
        },
      },
    },
    Autocomplete: {
      defaultProps: {
        styles: {
          dropdown: {
            backgroundColor: 'var(--mantine-color-dark-7)',
          },
        },
      },
    },
    TextInput: {
      defaultProps: {
        styles: {
          input: {
            backgroundColor: 'var(--mantine-color-dark-6)',
          },
        },
      },
    },
    PasswordInput: {
      defaultProps: {
        styles: {
          input: {
            backgroundColor: 'var(--mantine-color-dark-6)',
          },
        },
      },
    },
    Textarea: {
      defaultProps: {
        styles: {
          input: {
            backgroundColor: 'var(--mantine-color-dark-6)',
          },
        },
      },
    },
    NumberInput: {
      defaultProps: {
        styles: {
          input: {
            backgroundColor: 'var(--mantine-color-dark-6)',
          },
        },
      },
    },
    DatePickerInput: {
      defaultProps: {
        styles: {
          input: {
            backgroundColor: 'var(--mantine-color-dark-6)',
          },
        },
      },
    },
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body suppressHydrationWarning style={{ background: '#0d1117' }}>
        <MantineProvider forceColorScheme="dark" theme={theme}>
          <Notifications />
          <Providers>{children}</Providers>
        </MantineProvider>
      </body>
    </html>
  );
}
