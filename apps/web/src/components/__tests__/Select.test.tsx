import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select, type SelectOption } from '../Select';

const OPTIONS: SelectOption<string>[] = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'resolved', label: 'Résolu' },
];

function renderSelect(onChange = vi.fn()) {
  render(
    <Select ariaLabel="Filtrer par statut" value="all" options={OPTIONS} onChange={onChange} />,
  );
  return { onChange, user: userEvent.setup() };
}

describe('Select — accessibilité clavier (motif ARIA listbox)', () => {
  it('expose le bon rôle et l’état plié/déplié', async () => {
    const { user } = renderSelect();
    const button = screen.getByRole('button', { name: 'Filtrer par statut' });
    expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    // L'option courante est marquée sélectionnée.
    expect(screen.getByRole('option', { name: 'Tous les statuts' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('s’ouvre au clavier puis sélectionne via les flèches et Entrée', async () => {
    const { onChange, user } = renderSelect();
    await user.tab(); // focus sur le bouton
    await user.keyboard('{ArrowDown}'); // ouvre la liste
    const listbox = screen.getByRole('listbox');
    // aria-activedescendant part de l'option sélectionnée (index 0).
    expect(listbox.getAttribute('aria-activedescendant')).toMatch(/option-0$/);

    await user.keyboard('{ArrowDown}{ArrowDown}'); // 0 -> 2 (« En cours »)
    expect(listbox.getAttribute('aria-activedescendant')).toMatch(/option-2$/);

    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('in_progress');
    // La liste se referme après validation.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('gère Origine/Fin', async () => {
    const { onChange, user } = renderSelect();
    await user.tab();
    await user.keyboard('{ArrowDown}{End}{Enter}');
    expect(onChange).toHaveBeenCalledWith('resolved');
  });

  it('permet la saisie au vol (typeahead)', async () => {
    const { onChange, user } = renderSelect();
    await user.tab();
    await user.keyboard('{ArrowDown}'); // ouvre
    await user.keyboard('r'); // « Résolu » est la seule option commençant par « r »
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('resolved');
  });

  it('se referme sur Échap sans rien sélectionner', async () => {
    const { onChange, user } = renderSelect();
    await user.tab();
    await user.keyboard('{ArrowDown}{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
