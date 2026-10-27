import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '../../src/features/store/appStore.js';
import { FindingsPage } from '../../src/pages/Findings.js';

describe('integration: findings filtering', () => {
  it('renders empty state when nothing imported', () => {
    render(<AppProvider><FindingsPage /></AppProvider>);
    expect(screen.getByText(/no findings yet/i)).toBeInTheDocument();
  });
});
