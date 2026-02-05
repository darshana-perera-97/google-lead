import { useState, useEffect } from 'react';
import API_ENDPOINTS from '../config/api';

function Link() {
  const [status, setStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [accountInfo, setAccountInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWhatsAppStatus();
    // Poll for status updates every 2 seconds
    const interval = setInterval(fetchWhatsAppStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchWhatsAppStatus = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.WHATSAPP_STATUS);
      if (response.ok) {
        const data = await response.json();
        console.log('WhatsApp status:', data.status, 'QR exists:', !!data.qr, 'QR length:', data.qr ? data.qr.length : 0);
        
        // Update status
        if (data.status) {
          setStatus(data.status);
        }
        
        // Update QR code - keep existing QR if new one is null/undefined (to prevent flickering)
        if (data.qr) {
          console.log('Setting QR code, length:', data.qr.length);
          setQrCode(data.qr);
        } else if (data.qr === null) {
          // Only clear QR if explicitly null (not undefined)
          setQrCode(null);
        }
        
        if (data.status === 'connected') {
          fetchAccountInfo();
        }
      } else {
        console.error('Failed to fetch WhatsApp status:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
    }
  };

  const fetchAccountInfo = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.WHATSAPP_ACCOUNT);
      if (response.ok) {
        const data = await response.json();
        setAccountInfo(data);
      }
    } catch (error) {
      console.error('Error fetching account info:', error);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect WhatsApp?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.WHATSAPP_DISCONNECT, {
        method: 'POST',
      });
      if (response.ok) {
        setStatus('disconnected');
        setAccountInfo(null);
        setQrCode(null);
        alert('WhatsApp disconnected successfully');
      }
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      alert('Error disconnecting WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4" style={{ fontWeight: '600', color: '#1e293b' }}>WhatsApp Connection</h2>

      {!qrCode && status === 'disconnected' && (
        <div className="card">
          <div className="card-body text-center">
            <h5 className="card-title mb-3">WhatsApp Not Connected</h5>
            <p className="text-muted">Please wait for the QR code to appear...</p>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      )}

      {qrCode && status !== 'connected' && (
        <div className="card">
          <div className="card-body text-center">
            <h5 className="card-title mb-3">Scan QR Code to Connect</h5>
            <p className="text-muted mb-3">
              Open WhatsApp on your phone and scan this QR code
            </p>
            <div className="d-flex justify-content-center mb-3">
              {qrCode ? (
                <img 
                  src={qrCode} 
                  alt="WhatsApp QR Code" 
                  className="img-fluid"
                  style={{ maxWidth: '100%', width: '300px', height: 'auto', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', backgroundColor: '#fff' }}
                  onError={(e) => {
                    console.error('Error loading QR code image');
                    e.target.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('QR code image loaded successfully');
                  }}
                />
              ) : (
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading QR code...</span>
                </div>
              )}
            </div>
            <p className="text-muted mt-3 small">
              Status: {status === 'connecting' ? 'Connecting...' : status === 'disconnected' ? 'Waiting for connection...' : status}
            </p>
          </div>
        </div>
      )}

      {status === 'connected' && accountInfo && (
        <div className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="card-title mb-0">WhatsApp Connected</h5>
              <button
                className="btn btn-danger"
                onClick={handleDisconnect}
                disabled={loading}
              >
                {loading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
            <div className="row">
              <div className="col-md-6">
                <p><strong>Phone Number:</strong> {accountInfo.wid || 'N/A'}</p>
                <p><strong>Name:</strong> {accountInfo.pushname || 'N/A'}</p>
                <p><strong>Platform:</strong> {accountInfo.platform || 'N/A'}</p>
              </div>
              <div className="col-md-6">
                <div className="alert alert-success">
                  <strong>Status:</strong> Connected and ready to send messages
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {status === 'connected' && !accountInfo && (
        <div className="card">
          <div className="card-body text-center">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading account info...</span>
            </div>
            <p className="mt-2">Loading account details...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Link;

