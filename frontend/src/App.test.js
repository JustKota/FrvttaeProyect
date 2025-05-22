import { render, screen } from '@testing-library/react';
import App from './reproductor';

test('renders music player', () => {
  render(<App />);
  const titleElement = screen.getByText(/Playlist/i);
  expect(titleElement).toBeInTheDocument();
});
