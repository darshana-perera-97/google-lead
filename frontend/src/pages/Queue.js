import { useState, useEffect } from 'react';
import API_ENDPOINTS from '../config/api';

function Queue() {
  const [queueItems, setQueueItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState([]);
  const [moving, setMoving] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.QUEUE);
      if (response.ok) {
        const data = await response.json();
        setQueueItems(data);
      } else {
        console.error('Error fetching queue');
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(queueItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = queueItems.slice(startIndex, endIndex);

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
  const handleSelectItem = (leadId) => {
    setSelectedItems(prev => {
      if (prev.includes(leadId)) {
        return prev.filter(id => id !== leadId);
      } else {
        return [...prev, leadId];
      }
    });
  };

  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(currentItems.map(item => item.leadId));
    } else {
      setSelectedItems([]);
    }
  };

  // Check if all current page items are selected
  const isAllSelected = currentItems.length > 0 && 
    currentItems.every(item => selectedItems.includes(item.leadId));

  // Process queue automatically
  const handleProcessQueue = async () => {
    if (queueItems.length === 0) {
      alert('Queue is empty. Nothing to process.');
      return;
    }

    const confirmMessage = `Are you sure you want to start processing the queue?\n\n` +
      `This will automatically send messages to all ${queueItems.length} item(s) in the queue.\n` +
      `Items will be moved to leads after successful sending.\n\n` +
      `Processing will continue until the queue is empty.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(API_ENDPOINTS.QUEUE_PROCESS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        alert('Queue processing started! Messages will be sent automatically in the background.\n\nYou can close this page - processing will continue.');
        // Refresh queue after a short delay to show updates
        setTimeout(() => {
          fetchQueue();
        }, 2000);
      } else {
        const error = await response.json();
        alert(error.error || 'Error starting queue processing');
      }
    } catch (error) {
      console.error('Error processing queue:', error);
      alert('Error starting queue processing. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Move selected items from queue to leads
  const handleMoveToLeads = async () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one item to move to leads');
      return;
    }

    const confirmMessage = `Are you sure you want to move ${selectedItems.length} item(s) from queue to leads?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setMoving(true);
    try {
      // Get selected items from queue
      const itemsToMove = queueItems.filter(item => selectedItems.includes(item.leadId));
      
      // Convert queue items to lead format
      const leadsToAdd = itemsToMove.map(item => ({
        ...item,
        reached: false,
        messageSent: false
      }));

      // Add to leads
      const leadsResponse = await fetch(API_ENDPOINTS.LEADS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leads: leadsToAdd }),
      });

      if (!leadsResponse.ok) {
        const error = await leadsResponse.json();
        alert(error.error || 'Error moving items to leads');
        setMoving(false);
        return;
      }

      // Remove from queue
      const updatedQueue = queueItems.filter(item => !selectedItems.includes(item.leadId));
      
      // Update queue in backend (we need a DELETE endpoint or update endpoint)
      // For now, we'll need to create an endpoint to remove items from queue
      // Let's use a workaround: we'll need to add a DELETE endpoint
      
      const deleteResponse = await fetch(`${API_ENDPOINTS.QUEUE}/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadIds: selectedItems }),
      });

      if (deleteResponse.ok) {
        const data = await leadsResponse.json();
        alert(`Successfully moved ${data.count || selectedItems.length} item(s) to leads!`);
        setSelectedItems([]);
        fetchQueue(); // Refresh queue
      } else {
        const error = await deleteResponse.json();
        alert(`Items added to leads but error removing from queue: ${error.error || 'Unknown error'}`);
        fetchQueue(); // Refresh queue anyway
      }
    } catch (error) {
      console.error('Error moving items to leads:', error);
      alert('Error moving items to leads. Please try again.');
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <h2 style={{ fontWeight: '600', color: '#1e293b', marginBottom: 0 }}>Queue</h2>
        <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 w-100 w-md-auto">
          <div className="d-flex flex-column align-items-center align-items-md-start">
            <span className="text-muted text-center text-md-start">Total: {queueItems.length} items</span>
          </div>
          {queueItems.length > 0 && (
            <button
              className="btn btn-success"
              onClick={handleProcessQueue}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Process Queue Automatically'}
            </button>
          )}
          {selectedItems.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={handleMoveToLeads}
              disabled={moving || processing}
            >
              {moving ? 'Moving...' : `Move to Leads (${selectedItems.length})`}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading queue...</p>
        </div>
      ) : queueItems.length === 0 ? (
        <div className="card">
          <div className="card-body text-center">
            <p className="text-muted mb-0">Queue is empty.</p>
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
                      <th>Added Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item) => (
                      <tr key={item.leadId}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.leadId)}
                            onChange={() => handleSelectItem(item.leadId)}
                            className="form-check-input"
                          />
                        </td>
                        <td>
                          <small className="text-muted">{item.leadId}</small>
                        </td>
                        <td>{item.businessName}</td>
                        <td>{item.contactNumber || 'N/A'}</td>
                        <td>{item.emailId || 'N/A'}</td>
                        <td>
                          {item.website ? (
                            <a
                              href={item.website}
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
                            {item.searchPhrase}
                          </span>
                        </td>
                        <td>
                          {item.category ? (
                            <span className="badge bg-primary">{item.category}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <small>
                            {new Date(item.savedDate).toLocaleString()}
                          </small>
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
            <nav aria-label="Queue pagination" className="mt-4">
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
              Showing {startIndex + 1} to {Math.min(endIndex, queueItems.length)} of {queueItems.length} items
            </small>
          </div>
        </>
      )}
    </div>
  );
}

export default Queue;

