// src/components/DatabaseTest.tsx
import { useAuth } from '@/lib/auth/auth-context';

const DatabaseTest = () => {
  const { firebaseUser, databaseUser, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '20px', background: 'white', color: 'black', margin: '20px' }}>
      Loading authentication...
    </div>;
  }

  return (
    <div style={{ padding: '20px', background: 'white', color: 'black', margin: '20px', fontFamily: 'monospace' }}>
      <h2>🔍 Database Test Results</h2>
      
      <h3>Firebase User:</h3>
      {firebaseUser ? (
        <div style={{ background: '#e8f5e8', padding: '10px', marginBottom: '10px' }}>
          <strong>✅ Firebase User Found:</strong><br/>
          UID: {firebaseUser.uid}<br/>
          Email: {firebaseUser.email}<br/>
          Display Name: {firebaseUser.displayName || 'None'}<br/>
          Photo URL: {firebaseUser.photoURL || 'None'}
        </div>
      ) : (
        <div style={{ background: '#ffe8e8', padding: '10px', marginBottom: '10px' }}>
          ❌ No Firebase user signed in
        </div>
      )}

      <h3>Database User:</h3>
      {databaseUser ? (
        <div style={{ background: '#e8f5e8', padding: '10px' }}>
          <strong>✅ Database User Found:</strong><br/>
          <pre>{JSON.stringify(databaseUser, null, 2)}</pre>
        </div>
      ) : (
        <div style={{ background: '#ffe8e8', padding: '10px' }}>
          ❌ No database user found
          {firebaseUser && <div><strong>This means the sync failed!</strong></div>}
        </div>
      )}

      <h3>Sync Status:</h3>
      <div style={{ background: firebaseUser && databaseUser ? '#e8f5e8' : '#ffe8e8', padding: '10px' }}>
        {firebaseUser && databaseUser ? '✅ Sync Working' : '❌ Sync Failed'}
      </div>
    </div>
  );
};

export default DatabaseTest;