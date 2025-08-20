// Basic tests to verify Jest is working
describe('App Tests', () => {
  it('should pass basic test', () => {
    expect(true).toBe(true);
  });

  it('should handle basic math', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle string operations', () => {
    const text = 'Hello World';
    expect(text.toUpperCase()).toBe('HELLO WORLD');
  });
});
