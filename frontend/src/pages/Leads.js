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

  // Handle checkbox selection
  const handleSelectLead = (leadId) => {
    setSelectedLeads(prev => {
      if (prev.includes(leadId)) {
        return prev.filter(id => id !== leadId);
      } else {
        // Limit to 10 leads max
        if (prev.length >= 10) {
          alert('Maximum 10 leads can be selected at once. Please deselect some leads first.');
          return prev;
        }
        return [...prev, leadId];
      }
    });
  };

  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Limit to 10 leads max
      const maxSelectable = Math.min(10, currentLeads.length);
      setSelectedLeads(currentLeads.slice(0, maxSelectable).map(lead => lead.leadId));
      if (currentLeads.length > 10) {
        alert('Maximum 10 leads can be selected at once. Only the first 10 leads on this page were selected.');
      }
    } else {
      setSelectedLeads([]);
    }
  };

  // Check if all current page leads are selected
  const isAllSelected = currentLeads.length > 0 && 
    currentLeads.every(lead => selectedLeads.includes(lead.leadId));

  // Send messages to selected leads
  const handleSendMessages = async () => {
    if (selectedLeads.length === 0) {
      alert('Please select at least one lead to send messages');
      return;
    }

    // Check rate limit before sending - refresh status first
    await fetchRateLimitStatus();
    
    const availableLeads = rateLimit.availableLeads ?? 0;
    const minutesRemaining = rateLimit.minutesRemaining ?? 0;
    
    if (!rateLimit.canSend) {
      alert(`Rate limit reached. You can send ${availableLeads} more lead(s). Next batch available in ${minutesRemaining} minute(s).`);
      return;
    }

    if (selectedLeads.length > availableLeads) {
      alert(`You can only send ${availableLeads} more lead(s) right now. Please select fewer leads or wait ${minutesRemaining} minute(s) for the next batch.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to send messages to ${selectedLeads.length} lead(s)?`)) {
      return;
    }

    setSending(true);
    try {
      const response = await fetch(API_ENDPOINTS.WHATSAPP_SEND_MESSAGES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadIds: selectedLeads }),
      });

      if (response.ok) {
        const data = await response.json();
        let message = `Messages sent: ${data.summary.success} successful, ${data.summary.failed} failed`;
        if (data.rateLimit) {
          const rateLimitAvailable = data.rateLimit.availableLeads ?? 0;
          const rateLimitMinutes = data.rateLimit.minutesRemaining ?? 0;
          if (data.rateLimit.canSendMore) {
            message += `\n\nYou can send ${rateLimitAvailable} more lead(s) now.`;
          } else {
            message += `\n\nRate limit reached. Next batch of 10 leads available in ${rateLimitMinutes} minute(s).`;
          }
        }
        alert(message);
        setSelectedLeads([]);
        fetchLeads(); // Refresh leads to update status
        fetchRateLimitStatus(); // Refresh rate limit status
      } else {
        const error = await response.json();
        if (error.error === 'Rate limit exceeded') {
          const errorAvailableLeads = error.availableLeads ?? 0;
          const errorMinutesRemaining = error.minutesRemaining ?? 0;
          alert(`${error.message || 'Rate limit exceeded'}\n\nAvailable: ${errorAvailableLeads} lead(s)\nWait time: ${errorMinutesRemaining} minute(s)`);
          fetchRateLimitStatus(); // Refresh rate limit status
        } else {
          alert(`Error: ${error.error || 'Failed to send messages'}`);
        }
      }
    } catch (error) {
      console.error('Error sending messages:', error);
      alert('Error sending messages. Please try again.');
    } finally {
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
              disabled={sending || !rateLimit.canSend || selectedLeads.length > rateLimit.availableLeads}
              title={!rateLimit.canSend ? `Rate limit reached. Wait ${rateLimit.minutesRemaining ?? 0} minute(s).` : ''}
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
                            disabled={lead.reached || lead.messageSent || (selectedLeads.length >= 10 && !selectedLeads.includes(lead.leadId))}
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

