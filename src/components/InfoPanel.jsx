import { Sparkles, Search, CheckCircle, Lightbulb, Copy } from 'lucide-react';

function InfoPanel({ appState, detectionResult, funFactData, error, onCopyFact }) {
  const isIdle = appState === 'idle' || appState === 'analyzing';
  const isResult = appState === 'result';

  const renderIdleState = () => (
    <div id="state-idle" className="result-card idle-card">
      <div className="idle-icon">
        <Sparkles size={40} />
      </div>
      <h2>Scan Sayuran</h2>
      <p>Ketuk tombol kamera untuk memulai dan temukan fakta menarik tentang sayuran!</p>
      {!error && appState === 'analyzing' && (
        <div className="analyzing-hint">
          <div className="analyzing-spinner" />
          <span>Mencari sayuran...</span>
        </div>
      )}
      {error && (
        <p className="error-text">{error}</p>
      )}
    </div>
  );

  const renderLoadingState = () => (
    <div id="state-loading" className="result-card loading-card">
      <div className="loading-animation">
        <div className="loading-ring" />
        <div className="loading-icon">
          <Search size={24} />
        </div>
      </div>
      <h2>Menganalisis...</h2>
      <p>Sedang mengidentifikasi sayuran Anda</p>
    </div>
  );

  const renderResultState = () => {
    if (!detectionResult) return renderLoadingState();

    const confidence = detectionResult.confidence ?? Math.round(detectionResult.score * 100);

    const renderFunFactContent = () => {
      if (funFactData === null) {
        return (
          <div id="fun-fact-loading" className="fun-fact-loading">
            <div className="fun-fact-loading-spinner" />
            <span>Menghasilkan fakta menarik...</span>
          </div>
        );
      }

      if (funFactData === 'error') {
        return (
          <div className="fun-fact-error">
            ⚠️ Gagal menghasilkan fakta. Coba arahkan kamera ke sayuran yang berbeda.
          </div>
        );
      }

      return (
        <p className="fun-fact-text">{funFactData}</p>
      );
    };

    return (
      <div id="state-result" className="result-card result-main fadeIn">
        {/* Detected badge */}
        <div className="detected-badge">
          <CheckCircle size={14} />
          <span id="detected-name">{detectionResult.className}</span>
        </div>

        {/* Confidence bar */}
        <div className="confidence-bar">
          <span className="confidence-label">Kepercayaan</span>
          <div className="confidence-track">
            <div
              id="confidence-fill"
              className="confidence-fill"
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span id="detected-confidence" className="confidence-value">{confidence}%</span>
        </div>

        {/* Fun Fact card */}
        <div className="fun-fact-card">
          <div className="fun-fact-header">
            <div className="fun-fact-icon">
              <Lightbulb size={18} />
            </div>
            <span className="fun-fact-label">Fun Fact</span>
            {funFactData && funFactData !== 'error' && (
              <button
                id="btn-copy"
                className="copy-btn"
                onClick={onCopyFact}
                title="Salin fakta ke clipboard"
                aria-label="Salin fakta"
              >
                <Copy size={16} />
              </button>
            )}
          </div>
          <div id="fun-fact-content">
            {renderFunFactContent()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="results-section" aria-live="polite">
      {isIdle && renderIdleState()}
      {isResult && renderResultState()}
    </section>
  );
}

export default InfoPanel;
