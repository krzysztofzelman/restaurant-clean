import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import WirtualnyKelner from './WirtualnyKelner';

// Mock dependencies
vi.mock('../../services/aiChatService', () => ({
  sendChatMessage: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    profile: null,
    loading: false,
  })),
}));

vi.mock('../../hooks/useCart', () => ({
  useCart: vi.fn(() => ({
    addToCart: vi.fn(),
    cartItems: [],
    cartCount: 0,
    cartTotal: 0,
  })),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: vi.fn(() => ({
    showToast: vi.fn(),
  })),
}));

vi.mock('../../services/api', () => ({
  createReservation: vi.fn(),
  checkReservationAvailability: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

function renderComponent() {
  return render(
    <BrowserRouter>
      <WirtualnyKelner />
    </BrowserRouter>,
  );
}

describe('WirtualnyKelner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should render floating button', () => {
    renderComponent();
    const button = screen.getByLabelText('Otwórz czat');
    expect(button).toBeInTheDocument();
  });

  it('should open chat panel when button is clicked', async () => {
    renderComponent();
    const toggleButton = screen.getByLabelText('Otwórz czat');

    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText('Wirtualny Kelner')).toBeInTheDocument();
    });
  });

  it('should display welcome message when opened', async () => {
    renderComponent();
    fireEvent.click(screen.getByLabelText('Otwórz czat'));

    await waitFor(() => {
      expect(
        screen.getByText(/witaj/i),
      ).toBeInTheDocument();
    });
  });

  it('should show loading indicator while waiting for response', async () => {
    const { sendChatMessage } = await import('../../services/aiChatService');
    // Keep the promise pending so loading stays visible
    vi.mocked(sendChatMessage).mockImplementation(
      () => new Promise(() => {}), // never resolves
    );

    renderComponent();
    fireEvent.click(screen.getByLabelText('Otwórz czat'));

    const input = screen.getByLabelText('Wiadomość do wirtualnego kelnera');
    const sendButton = screen.getByLabelText('Wyślij');

    fireEvent.change(input, { target: { value: 'Pokaż menu' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      // Spinner should appear while loading
      const spinners = document.querySelectorAll('.spinner-border');
      expect(spinners.length).toBeGreaterThan(0);
    });
  });

  it('should send message and display user message', async () => {
    const { sendChatMessage } = await import('../../services/aiChatService');
    vi.mocked(sendChatMessage).mockResolvedValue({
      reply: 'Oto nasze menu: Pizza 30 zł, Pasta 25 zł.',
      actions: [],
    });

    renderComponent();
    fireEvent.click(screen.getByLabelText('Otwórz czat'));

    const input = screen.getByLabelText('Wiadomość do wirtualnego kelnera');
    const sendButton = screen.getByLabelText('Wyślij');

    fireEvent.change(input, { target: { value: 'Pokaż menu' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Pokaż menu')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Pizza 30 zł/),
      ).toBeInTheDocument();
    });
  });

  it('should display quick actions when conversation is fresh', async () => {
    renderComponent();
    fireEvent.click(screen.getByLabelText('Otwórz czat'));

    await waitFor(() => {
      expect(screen.getByText('📋 Pokaż menu')).toBeInTheDocument();
      expect(screen.getByText('🥗 Dania wegetariańskie')).toBeInTheDocument();
    });
  });

  it('should disable send button when input is empty', async () => {
    renderComponent();
    fireEvent.click(screen.getByLabelText('Otwórz czat'));

    const sendButton = screen.getByLabelText('Wyślij');
    expect(sendButton).toBeDisabled();
  });

  it('should handle clear conversation', async () => {
    renderComponent();
    fireEvent.click(screen.getByLabelText('Otwórz czat'));

    await waitFor(() => {
      expect(screen.getByText(/witaj/i)).toBeInTheDocument();
    });

    // Find and click the clear button (trash icon)
    const clearButton = screen.getByTitle('Wyczyść rozmowę');
    fireEvent.click(clearButton);
  });
});
