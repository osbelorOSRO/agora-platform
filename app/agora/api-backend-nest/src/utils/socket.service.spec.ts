const mockIo = jest.fn();
const mockSocket = {
  on: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: mockIo,
}));

const OLD_ENV = process.env;

describe('socketService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
    mockIo.mockReturnValue(mockSocket);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('crea socket con WS_SERVER y transporte websocket', () => {
    process.env.WS_SERVER = 'http://localhost:5050';
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { socketService } = require('./socket.service');

    expect(mockIo).toHaveBeenCalledWith('http://localhost:5050', {
      transports: ['websocket'],
      reconnection: true,
    });
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith(
      'connect_error',
      expect.any(Function),
    );
    expect(socketService.getSocket()).toBe(mockSocket);
  });

  it('lanza error si falta WS_SERVER', () => {
    delete process.env.WS_SERVER;

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      require('./socket.service');
    }).toThrow('Missing required env WS_SERVER');
  });
});
