import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('exibe a marca Maxis como título principal', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Maxis' })).toBeInTheDocument();
  });
});
