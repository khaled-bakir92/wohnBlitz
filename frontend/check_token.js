const AsyncStorage = require('@react-native-async-storage/async-storage');

async function checkToken() {
  try {
    const token = await AsyncStorage.getItem('access_token');
    console.log(
      'Token from storage:',
      token ? token.substring(0, 50) + '...' : 'null'
    );

    if (token) {
      // Test with curl
      const { spawn } = require('child_process');
      const curl = spawn('curl', [
        '-H',
        `Authorization: Bearer ${token}`,
        '-H',
        'Content-Type: application/json',
        'http://localhost:8000/api/me',
      ]);

      curl.stdout.on('data', data => {
        console.log('API Response:', data.toString());
      });

      curl.stderr.on('data', data => {
        console.error('Error:', data.toString());
      });
    }
  } catch (error) {
    console.error('Error checking token:', error);
  }
}

checkToken();
