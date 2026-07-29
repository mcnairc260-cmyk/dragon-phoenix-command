import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AppStateProvider } from './state/AppState';
import { OPPORTUNITIES } from './data/opportunities';

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </MemoryRouter>,
  );
}

describe('critical routes', () => {
  it('renders the landing page with the core promise and CTAs', () => {
    renderApp('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/see tomorrow's markets/i);
    expect(screen.getAllByRole('link', { name: /explore opportunities/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /see how it works/i })).toBeInTheDocument();
  });

  it('renders the dashboard feed after loading', async () => {
    renderApp('/dashboard');
    // The top opportunity can appear in both "Recommended" and the main feed.
    const matches = await screen.findAllByText(OPPORTUNITIES[0].title, undefined, {
      timeout: 3000,
    });
    expect(matches.length).toBeGreaterThan(0);
    expect(screen.getByRole('searchbox', { name: /search opportunities/i })).toBeInTheDocument();
  });

  it('renders an opportunity detail page with score breakdown and plans', async () => {
    const target = OPPORTUNITIES[0];
    renderApp(`/opportunities/${target.slug}`);
    expect(
      await screen.findByRole('heading', { level: 1, name: target.title }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/why now\?/i)).toBeInTheDocument();
    expect(screen.getByText(/opportunity score breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/first 7 days/i)).toBeInTheDocument();
    expect(screen.getByText(/first 30 days/i)).toBeInTheDocument();
  });

  it('shows the not-found state for an unknown opportunity slug', async () => {
    renderApp('/opportunities/does-not-exist');
    expect(
      await screen.findByText(/opportunity not found/i, undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it('renders the 404 page for invalid routes', () => {
    renderApp('/definitely/not/a/route');
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders pricing with all three tiers and placeholder labeling', () => {
    renderApp('/pricing');
    expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Founder' })).toBeInTheDocument();
    expect(screen.getAllByText(/placeholder/i).length).toBeGreaterThan(0);
  });

  it('login page is honest about auth not being configured', () => {
    renderApp('/login');
    expect(screen.getByText(/accounts aren't live yet/i)).toBeInTheDocument();
  });
});

describe('dashboard interactions', () => {
  it('search narrows the feed and shows the empty state for no matches', async () => {
    const user = userEvent.setup();
    renderApp('/dashboard');
    const search = await screen.findByRole('searchbox', { name: /search opportunities/i });

    await user.type(search, 'zzqxvnope');
    expect(await screen.findByText(/nothing matches the current filters/i)).toBeInTheDocument();

    await user.clear(search);
    const matches = await screen.findAllByText(OPPORTUNITIES[0].title);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('saving an opportunity persists it to the saved page', async () => {
    const user = userEvent.setup();
    const target = OPPORTUNITIES[0];
    const { unmount } = renderApp('/dashboard');

    const saveButton = await screen.findByRole('button', {
      name: `Save ${target.title}`,
    });
    await user.click(saveButton);
    expect(
      screen.getByRole('button', { name: `Remove ${target.title} from saved` }),
    ).toBeInTheDocument();
    unmount();

    renderApp('/saved');
    expect(await screen.findByText(target.title, undefined, { timeout: 3000 })).toBeInTheDocument();
  });
});
