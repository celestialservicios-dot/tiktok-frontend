import { useState, useEffect } from 'react';
import MainPage from './components/pages/MainPage';
import { AdminPanel } from './components/admin/AdminPanel';

function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Combinación: Ctrl + Shift + A  o  Cmd + Shift + A (Mac)  o  Ctrl + Shift + X
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isKeyA = e.key === 'A' || e.key === 'a' || e.code === 'KeyA';
      const isKeyX = e.key === 'X' || e.key === 'x' || e.code === 'KeyX';

      if (isCtrlOrCmd && isShift && (isKeyA || isKeyX)) {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };

    // Evento personalizado por si se usa en móvil
    const handleCustomEvent = () => {
      setIsAdminOpen((prev) => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('toggle-secret-admin', handleCustomEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('toggle-secret-admin', handleCustomEvent);
    };
  }, []);

  return (
    <>
      <MainPage />
      <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </>
  );
}

export default App;
