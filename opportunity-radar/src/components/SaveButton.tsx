import { useSaved, useToasts } from '../state/AppState';

export function SaveButton({
  opportunityId,
  title,
  variant = 'icon',
}: {
  opportunityId: string;
  title: string;
  variant?: 'icon' | 'full';
}) {
  const { isSaved, toggle } = useSaved();
  const { showToast } = useToasts();
  const saved = isSaved(opportunityId);

  const handleClick = () => {
    toggle(opportunityId);
    showToast(saved ? `Removed “${title}” from saved` : `Saved “${title}”`);
  };

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={saved}
        className={`rounded-lg border px-4 py-2 text-sm font-bold transition-colors ${
          saved
            ? 'border-gold bg-gold/15 text-gold'
            : 'border-line-strong text-ash hover:border-gold hover:text-gold'
        }`}
      >
        {saved ? '🔖 Saved' : '🔖 Save opportunity'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      title={saved ? 'Remove from saved' : 'Save'}
      className={`rounded-lg border p-2 leading-none transition-colors ${
        saved
          ? 'border-gold bg-gold/15 text-gold'
          : 'border-line text-muted hover:border-gold hover:text-gold'
      }`}
    >
      <span aria-hidden="true">{saved ? '🔖' : '📑'}</span>
    </button>
  );
}
