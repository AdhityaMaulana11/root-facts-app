import { Sprout } from 'lucide-react';

function Header({ modelStatus, loadingProgress }) {
  const isModelReady = modelStatus === 'Model AI Siap';
  const isLoading = !isModelReady && !modelStatus?.includes('Gagal');
  const isError = modelStatus?.includes('Gagal');

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <Sprout size={20} />
          <span>Root Fact App</span>
        </div>

        <div className={`status-pill ${isModelReady ? 'ready' : isError ? 'error' : ''}`}>
          <span className={`status-dot ${isModelReady ? 'active' : isError ? 'error' : ''}`} />
          <span className="status-text">{modelStatus}</span>
        </div>
      </div>

      {/* Loading progress bar */}
      {isLoading && loadingProgress > 0 && loadingProgress < 100 && (
        <div className="loading-progress-bar">
          <div
            className="loading-progress-fill"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
      )}
    </header>
  );
}

export default Header;
