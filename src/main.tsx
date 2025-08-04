import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import '@rainbow-me/rainbowkit/styles.css';
import './index.css';

createRoot(document.getElementById("root")!).render(<App />);
