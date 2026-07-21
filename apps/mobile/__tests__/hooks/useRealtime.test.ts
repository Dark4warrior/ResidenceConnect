import { renderHook } from '@testing-library/react-native';
import { useRealtime } from '../../hooks/useRealtime';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');

const mockedChannel = supabase.channel as jest.Mock;
const mockedRemove = supabase.removeChannel as jest.Mock;

interface ChannelHarness {
  channel: { on: jest.Mock; subscribe: jest.Mock };
  on: jest.Mock;
  subscribe: jest.Mock;
  /** Déclenche le handler enregistré via `.on(...)`. */
  fire: () => void;
}

/** Construit un canal Realtime simulé et capture le handler `postgres_changes`. */
function makeChannel(): ChannelHarness {
  let handler: (() => void) | null = null;
  const channel: { on: jest.Mock; subscribe: jest.Mock } = {
    on: jest.fn((_event: string, _filter: unknown, cb: () => void) => {
      handler = cb;
      return channel;
    }),
    subscribe: jest.fn(() => channel),
  };
  mockedChannel.mockReturnValue(channel);
  return {
    channel,
    on: channel.on,
    subscribe: channel.subscribe,
    fire: () => handler?.(),
  };
}

afterEach(() => jest.clearAllMocks());

describe('useRealtime', () => {
  it('ouvre un canal sur la table et s’abonne', () => {
    const h = makeChannel();
    renderHook(() =>
      useRealtime({ table: 'tickets', onChange: jest.fn() })
    );

    expect(mockedChannel).toHaveBeenCalledWith('realtime:tickets');
    expect(h.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tickets' },
      expect.any(Function)
    );
    expect(h.subscribe).toHaveBeenCalledTimes(1);
  });

  it('déclenche onChange à chaque événement reçu', () => {
    const h = makeChannel();
    const onChange = jest.fn();
    renderHook(() => useRealtime({ table: 'tickets', onChange }));

    h.fire();
    h.fire();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('respecte le type d’événement fourni', () => {
    const h = makeChannel();
    renderHook(() =>
      useRealtime({ table: 'notifications', event: 'INSERT', onChange: jest.fn() })
    );
    expect(h.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      expect.any(Function)
    );
  });

  it('ferme le canal au démontage', () => {
    const h = makeChannel();
    const { unmount } = renderHook(() =>
      useRealtime({ table: 'tickets', onChange: jest.fn() })
    );
    unmount();
    expect(mockedRemove).toHaveBeenCalledWith(h.channel);
  });

  it('ne s’abonne pas quand enabled vaut false', () => {
    makeChannel();
    renderHook(() =>
      useRealtime({ table: 'tickets', onChange: jest.fn(), enabled: false })
    );
    expect(mockedChannel).not.toHaveBeenCalled();
  });
});
