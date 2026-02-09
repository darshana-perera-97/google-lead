import { useState, useEffect } from 'react';
import API_ENDPOINTS from '../config/api';

function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [sending, setSending] = useState(false);
  const [rateLimit, setRateLimit] = useState({
    maxLeads: 10,
    leadsSent: 0,
    availableLeads: 10,
    canSend: true,
    minutesRemaining: 0
  });

  useEffect(() => {
    fetchLeads();
    fetchRateLimitStatus();
    // Poll rate limit status every 30 seconds
    const interval = setInterval(fetchRateLimitStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRateLimitStatus = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.RATE_LIMIT_STATUS);
      if (response.ok) {
        const data = await response.json();
        setRateLimit(data);
      }
    } catch (error) {
      console.error('Error fetching rate limit status:', error);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.LEADS);
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      } else {
        console.error('Error fetching leads');
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(leads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeads = leads.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Handle checkbox selection - max 120 leads
  const handleSelectLead = (leadId) => {
    setSelectedLeads(prev => {
      if (prev.includes(leadId)) {
        return prev.filter(id => id !== leadId);
      } else {
        // Limit to 120 leads max
        if (prev.length >= 120) {
          alert('Maximum 120 leads can be selected at once. Please deselect some leads first.');
          return prev;
        }
        return [...prev, leadId];
      }
    });
  };

  // Handle select all - max 120 leads
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Limit to 120 leads max
      const maxSelectable = Math.min(120, currentLeads.length);
      setSelectedLeads(currentLeads.slice(0, maxSelectable).map(lead => lead.leadId));
      if (currentLeads.length > 120) {
        alert('Maximum 120 leads can be selected at once. Only the first 120 leads on this page were selected.');
      }
    } else {
      setSelectedLeads([]);
    }
  };

  // Check if all current page leads are selected
  const isAllSelected = currentLeads.length > 0 && 
    currentLeads.every(lead => selectedLeads.includes(lead.leadId));

  // Send messages to selected leads in batches
  const handleSendMessages = async () => {
    if (selectedLeads.length === 0) {
      alert('Please select at least one lead to send messages');
      return;
    }

    // Calculate number of batches
    const totalBatches = Math.ceil(selectedLeads.length / 10);
    const estimatedTime = totalBatches > 1 ? (totalBatches - 1) * 10 : 0;
    
    const confirmMessage = `You have selected ${selectedLeads.length} lead(s).\n\n` +
      `They will be sent in ${totalBatches} batch(es) of 10.\n` +
      (estimatedTime > 0 ? `Estimated time: ~${estimatedTime} minute(s) (10 min wait between batches).\n\n` : '\n') +
      `Are you sure you want to proceed?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setSending(true);
    
    // Show progress modal
    const progressModal = document.createElement('div');
    progressModal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
    progressModal.innerHTML = `
      <div style="background:white;padding:30px;border-radius:10px;max-width:500px;text-align:center;">
        <h3>Sending Messages...</h3>
        <p id="progress-text">Starting batch sending...</p>
        <div style="margin:20px 0;">
          <div style="background:#f0f0f0;border-radius:10px;height:20px;overflow:hidden;">
            <div id="progress-bar" style="background:#28a745;height:100%;width:0%;transition:width 0.3s;"></div>
          </div>
        </div>
        <p id="progress-details" style="color:#666;font-size:14px;"></p>
      </div>
    `;
    document.body.appendChild(progressModal);
    
    const progressText = progressModal.querySelector('#progress-text');
    const progressBar = progressModal.querySelector('#progress-bar');
    const progressDetails = progressModal.querySelector('#progress-details');

    try {
      const response = await fetch(API_ENDPOINTS.WHATSAPP_SEND_MESSAGES_BATCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadIds: selectedLeads }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update progress
        progressText.textContent = `Batch sending started! ${data.totalBatches} batch(es) queued.`;
        progressDetails.textContent = `Total leads: ${data.totalLeads} | Processing in background...`;
        progressBar.style.width = '10%';
        
        // Poll for completion (simplified - in real app you'd use WebSockets or polling)
        // For now, just show a message and close after a delay
        setTimeout(() => {
          progressText.textContent = 'Messages are being sent in the background!';
          progressDetails.textContent = `All ${data.totalBatches} batch(es) are queued. The system will automatically send them with 10-minute delays between batches.`;
          progressBar.style.width = '100%';
          
          setTimeout(() => {
            document.body.removeChild(progressModal);
            alert(`Batch sending started!\n\n` +
              `Total leads: ${data.totalLeads}\n` +
              `Total batches: ${data.totalBatches}\n\n` +
              `Messages are being sent automatically in the background.\n` +
              `Each batch of 10 will be sent with a 10-minute wait between batches.\n\n` +
              `You can close this page - the messages will continue sending.`);
            setSelectedLeads([]);
            fetchLeads(); // Refresh leads to update status
            fetchRateLimitStatus(); // Refresh rate limit status
            setSending(false);
          }, 3000);
        }, 2000);
      } else {
        document.body.removeChild(progressModal);
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to start batch sending'}`);
        setSending(false);
      }
    } catch (error) {
      document.body.removeChild(progressModal);
      console.error('Error sending messages:', error);
      alert('Error sending messages. Please try again.');
      setSending(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <h2 style={{ fontWeight: '600', color: '#1e293b', marginBottom: 0 }}>Saved Leads</h2>
        <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 w-100 w-md-auto">
          <div className="d-flex flex-column align-items-center align-items-md-start">
            <span className="text-muted text-center text-md-start">Total: {leads.length} leads</span>
            <small className={`text-center text-md-start ${rateLimit.canSend ? 'text-success' : 'text-warning'}`}>
              Rate Limit: {rateLimit.leadsSent ?? 0}/{rateLimit.maxLeads ?? 10} sent
              {!rateLimit.canSend && ` • Next batch in ${rateLimit.minutesRemaining ?? 0} min`}
            </small>
          </div>
          {selectedLeads.length > 0 && (
            <button
              className="btn btn-success"
              onClick={handleSendMessages}
              disabled={sending}
              title="Selected leads will be automatically grouped into batches of 10 and sent with 10-minute delays"
            >
              {sending ? 'Sending...' : `Send Messages (${selectedLeads.length})`}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="card">
          <div className="card-body text-center">
            <p className="text-muted mb-0">No leads saved yet.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          className="form-check-input"
                        />
                      </th>
                      <th>Lead ID</th>
                      <th>Business Name</th>
                      <th>Contact Number</th>
                      <th>Email</th>
                      <th>Link</th>
                      <th>Search Phrase</th>
                      <th>Category</th>
                      <th>Saved Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentLeads.map((lead) => (
                      <tr key={lead.leadId}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.leadId)}
                            onChange={() => handleSelectLead(lead.leadId)}
                            className="form-check-input"
                            disabled={lead.reached || lead.messageSent || (selectedLeads.length >= 120 && !selectedLeads.includes(lead.leadId))}
                          />
                        </td>
                        <td>
                          <small className="text-muted">{lead.leadId}</small>
                        </td>
                        <td>{lead.businessName}</td>
                        <td>{lead.contactNumber || 'N/A'}</td>
                        <td>{lead.emailId || 'N/A'}</td>
                        <td>
                          {lead.website ? (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-decoration-none"
                            >
                              Link
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td>
                          <span className="badge bg-secondary">
                            {lead.searchPhrase}
                          </span>
                        </td>
                        <td>
                          {lead.category ? (
                            <span className="badge bg-primary">{lead.category}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <small>
                            {new Date(lead.savedDate).toLocaleString()}
                          </small>
                        </td>
                        <td>
                          {lead.messageSent ? (
                            <span className="badge bg-success">Message Sent</span>
                          ) : lead.reached ? (
                            <span className="badge bg-warning">Reached</span>
                          ) : (
                            <span className="badge bg-secondary">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label="Leads pagination" className="mt-4">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                </li>

                {getPageNumbers().map((page) => (
                  <li
                    key={page}
                    className={`page-item ${currentPage === page ? 'active' : ''}`}
                  >
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  </li>
                ))}

                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          )}

          {/* Page info */}
          <div className="text-center mt-3">
            <small className="text-muted">
              Showing {startIndex + 1} to {Math.min(endIndex, leads.length)} of {leads.length} leads
            </small>
          </div>
        </>
      )}
    </div>
  );
}

export default Leads;

