import {
  uploadTicketPhoto,
  getTicketPhotoSignedUrl,
} from '../../lib/photos';
import { supabase } from '../../lib/supabase';
import { File } from 'expo-file-system';

jest.mock('../../lib/supabase');

// Le fichier est lu via l'API `File` d'expo-file-system (et non `fetch().blob()`,
// inutilisable en React Native). On simule donc le module natif.
jest.mock('expo-file-system', () => ({
  File: jest.fn(),
}));

// `crypto.randomUUID` n'existe pas dans Hermes : la lib passe par expo-crypto.
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'uuid-fixe-pour-les-tests',
}));

const mockedStorageFrom = supabase.storage.from as jest.Mock;
const mockedFrom = supabase.from as jest.Mock;
const MockedFile = File as unknown as jest.Mock;

/** Simule un fichier local dont la lecture renvoie `size` octets. */
function mockLocalFile(size = 4) {
  MockedFile.mockImplementation(() => ({
    arrayBuffer: async () => new ArrayBuffer(size),
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLocalFile();
});

describe('uploadTicketPhoto', () => {
  it('refuse un ticketId vide', async () => {
    await expect(uploadTicketPhoto('', 'file://x.jpg')).rejects.toThrow(
      /Identifiant de ticket manquant/,
    );
  });

  it('refuse une URI vide', async () => {
    await expect(uploadTicketPhoto('tk1', '')).rejects.toThrow(/URI locale/);
  });

  it('uploade puis insert la ligne ticket_photos', async () => {
    const upload = jest.fn().mockResolvedValue({ error: null });
    const createSignedUrl = jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://signed.example/photo.jpg' },
      error: null,
    });
    mockedStorageFrom.mockReturnValue({ upload, createSignedUrl });

    const single = jest.fn().mockResolvedValue({
      data: {
        id: 'ph1',
        storage_path: 'tk1/abc.jpg',
        url: 'https://signed.example/photo.jpg',
      },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockedFrom.mockReturnValue({ insert });

    const result = await uploadTicketPhoto('tk1', 'file://local.jpg');

    expect(upload).toHaveBeenCalled();
    expect(createSignedUrl).toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket_id: 'tk1',
        url: 'https://signed.example/photo.jpg',
      }),
    );
    expect(result.id).toBe('ph1');
  });

  it('refuse un fichier vide (0 octet) au lieu de l’envoyer silencieusement', async () => {
    mockLocalFile(0);
    await expect(uploadTicketPhoto('tk1', 'file://x.jpg')).rejects.toThrow(
      /vide \(0 octet\)/,
    );
  });

  it('remonte une erreur explicite si la lecture du fichier échoue', async () => {
    MockedFile.mockImplementation(() => ({
      arrayBuffer: async () => {
        throw new Error('fichier introuvable');
      },
    }));
    await expect(uploadTicketPhoto('tk1', 'file://x.jpg')).rejects.toThrow(
      /Impossible de lire la photo/,
    );
  });

  it('propage l’erreur Storage', async () => {
    mockedStorageFrom.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: { message: 'quota' } }),
      createSignedUrl: jest.fn(),
    });

    await expect(uploadTicketPhoto('tk1', 'file://x.jpg')).rejects.toThrow(
      /Échec de l’upload Storage/,
    );
  });
});

describe('getTicketPhotoSignedUrl', () => {
  it('renvoie l’URL signée', async () => {
    mockedStorageFrom.mockReturnValue({
      createSignedUrl: jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://signed/x' },
        error: null,
      }),
    });
    await expect(getTicketPhotoSignedUrl('tk1/a.jpg')).resolves.toBe(
      'https://signed/x',
    );
  });

  it('lève une erreur si la signature échoue', async () => {
    mockedStorageFrom.mockReturnValue({
      createSignedUrl: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'denied' },
      }),
    });
    await expect(getTicketPhotoSignedUrl('tk1/a.jpg')).rejects.toThrow(/denied/);
  });
});
