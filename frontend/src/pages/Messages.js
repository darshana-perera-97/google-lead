import { useState, useEffect } from 'react';
import API_ENDPOINTS from '../config/api';

function Messages() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [type1Message1, setType1Message1] = useState('');
  const [type1Message2, setType1Message2] = useState('');
  const [type2Message1, setType2Message1] = useState('');
  const [type2Message2, setType2Message2] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedMessages, setSavedMessages] = useState([]);
  const [showSidePanel, setShowSidePanel] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchMessages();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.CATEGORIES);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.MESSAGES);
      if (response.ok) {
        const data = await response.json();
        setSavedMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  // Load messages into textareas when category or savedMessages change
  useEffect(() => {
    if (selectedCategory && savedMessages.length > 0) {
      const existing = savedMessages.find(msg => msg.category === selectedCategory);
      if (existing) {
        setType1Message1(existing.type1.message1);
        setType1Message2(existing.type1.message2);
        setType2Message1(existing.type2.message1);
        setType2Message2(existing.type2.message2);
      } else {
        // Clear fields if no existing messages for this category
        setType1Message1('');
        setType1Message2('');
        setType2Message1('');
        setType2Message2('');
      }
    } else if (!selectedCategory) {
      // Clear fields if no category selected
      setType1Message1('');
      setType1Message2('');
      setType2Message1('');
      setType2Message2('');
    }
  }, [selectedCategory, savedMessages]);

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!selectedCategory) {
      alert('Please select a category');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.MESSAGES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: selectedCategory,
          type1Message1,
          type1Message2,
          type2Message1,
          type2Message2
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Messages saved successfully!');
        // Refresh messages list to update the state
        await fetchMessages();
      } else {
        const error = await response.json();
        alert(error.error || 'Error saving messages');
      }
    } catch (error) {
      console.error('Error saving messages:', error);
      alert('Error saving messages');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        {/* Main Content Area */}
        <div className={showSidePanel ? "col-lg-8 col-12" : "col-12"}>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
            <div>
              <h2 className="mb-1" style={{ fontWeight: '600', color: '#1e293b' }}>Messages</h2>
              <p className="text-muted mb-0 d-none d-md-block" style={{ fontSize: '14px' }}>Manage your WhatsApp message templates by category</p>
            </div>
            <button
              className="btn btn-outline-secondary w-100 w-md-auto"
              onClick={() => setShowSidePanel(!showSidePanel)}
              style={{ borderRadius: '10px' }}
            >
              {showSidePanel ? '← Hide' : 'View All →'}
            </button>
          </div>

          {/* Category Selection */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex align-items-center mb-3">
                <div style={{ width: '4px', height: '24px', background: '#6366f1', borderRadius: '2px', marginRight: '12px' }}></div>
                <h5 className="card-title mb-0" style={{ fontWeight: '600', fontSize: '18px' }}>Select Category</h5>
              </div>
              <select
                className="form-select"
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                style={{ fontSize: '15px' }}
              >
                <option value="">-- Choose a category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <small className="text-muted d-block mt-2">
                  <i className="bi bi-info-circle"></i> No categories available. Add categories in Settings.
                </small>
              )}
            </div>
          </div>

          {/* Message Forms */}
          {selectedCategory ? (
            <form onSubmit={handleSave}>
              {/* Type 1 Messages */}
              <div className="card mb-4" style={{ borderLeft: '4px solid #10b981' }}>
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-4">
                    <div>
                      <h5 className="card-title mb-1" style={{ fontWeight: '600', fontSize: '18px', color: '#10b981' }}>
                        Type 1 Messages
                      </h5>
                      <small className="text-muted">For leads with valid websites</small>
                    </div>
                    <span className="badge" style={{ background: '#d1fae5', color: '#065f46', fontSize: '11px', padding: '6px 12px' }}>
                      Website Leads
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <label className="form-label d-flex justify-content-between align-items-center mb-2">
                      <span style={{ fontWeight: '500', fontSize: '14px' }}>Message 1</span>
                      <small className="text-muted" style={{ fontSize: '12px' }}>{type1Message1.length} characters</small>
                    </label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={type1Message1}
                      onChange={(e) => setType1Message1(e.target.value)}
                      placeholder="Enter your first message for Type 1 leads..."
                      required
                      style={{ fontSize: '14px', lineHeight: '1.6' }}
                    />
                  </div>
                  
                  <div className="mb-0">
                    <label className="form-label d-flex justify-content-between align-items-center mb-2">
                      <span style={{ fontWeight: '500', fontSize: '14px' }}>Message 2</span>
                      <small className="text-muted" style={{ fontSize: '12px' }}>{type1Message2.length} characters</small>
                    </label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={type1Message2}
                      onChange={(e) => setType1Message2(e.target.value)}
                      placeholder="Enter your second message for Type 1 leads..."
                      required
                      style={{ fontSize: '14px', lineHeight: '1.6' }}
                    />
                  </div>
                </div>
              </div>

              {/* Type 2 Messages */}
              <div className="card mb-4" style={{ borderLeft: '4px solid #f59e0b' }}>
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-4">
                    <div>
                      <h5 className="card-title mb-1" style={{ fontWeight: '600', fontSize: '18px', color: '#f59e0b' }}>
                        Type 2 Messages
                      </h5>
                      <small className="text-muted">For leads without valid websites (social media profiles)</small>
                    </div>
                    <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: '11px', padding: '6px 12px' }}>
                      Social Media Leads
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <label className="form-label d-flex justify-content-between align-items-center mb-2">
                      <span style={{ fontWeight: '500', fontSize: '14px' }}>Message 1</span>
                      <small className="text-muted" style={{ fontSize: '12px' }}>{type2Message1.length} characters</small>
                    </label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={type2Message1}
                      onChange={(e) => setType2Message1(e.target.value)}
                      placeholder="Enter your first message for Type 2 leads..."
                      required
                      style={{ fontSize: '14px', lineHeight: '1.6' }}
                    />
                  </div>
                  
                  <div className="mb-0">
                    <label className="form-label d-flex justify-content-between align-items-center mb-2">
                      <span style={{ fontWeight: '500', fontSize: '14px' }}>Message 2</span>
                      <small className="text-muted" style={{ fontSize: '12px' }}>{type2Message2.length} characters</small>
                    </label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={type2Message2}
                      onChange={(e) => setType2Message2(e.target.value)}
                      placeholder="Enter your second message for Type 2 leads..."
                      required
                      style={{ fontSize: '14px', lineHeight: '1.6' }}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="mb-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ padding: '12px 32px', fontSize: '15px', fontWeight: '500' }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    '💾 Save Messages'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="card">
              <div className="card-body text-center py-5">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                <h5 className="mb-2" style={{ color: '#64748b' }}>No Category Selected</h5>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                  Select a category from the dropdown above to start creating or editing messages
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel - View Messages */}
        {showSidePanel && (
          <div className="col-lg-4 col-12 mt-4 mt-lg-0">
            <div className="card" style={{ position: 'sticky', top: '20px', maxHeight: 'calc(100vh - 40px)' }}>
              <div className="card-header d-flex justify-content-between align-items-center" style={{ background: '#f8f9fa', borderBottom: '1px solid #e2e8f0', padding: '16px 20px' }}>
                <div>
                  <h5 className="mb-0" style={{ fontWeight: '600', fontSize: '16px' }}>All Messages</h5>
                  <small className="text-muted" style={{ fontSize: '12px' }}>{savedMessages.length} {savedMessages.length === 1 ? 'category' : 'categories'}</small>
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() => setShowSidePanel(false)}
                  aria-label="Close"
                  style={{ background: 'transparent', border: 'none', fontSize: '20px', color: '#64748b', padding: '0', width: '24px', height: '24px' }}
                >
                  ×
                </button>
              </div>
              <div className="card-body" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '20px' }}>
                {savedMessages.length === 0 ? (
                  <div className="text-center py-5">
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: '0.5' }}>📭</div>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>No messages saved yet</p>
                    <small className="text-muted d-block mt-2">Create messages using the form on the left</small>
                  </div>
                ) : (
                  savedMessages.map((msg, index) => (
                    <div 
                      key={msg.id} 
                      className="mb-4 pb-4"
                      style={{ 
                        borderBottom: index < savedMessages.length - 1 ? '1px solid #e2e8f0' : 'none',
                        paddingBottom: index < savedMessages.length - 1 ? '20px' : '0'
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <h6 className="mb-0" style={{ fontWeight: '600', fontSize: '15px', color: '#1e293b' }}>
                          {msg.category}
                        </h6>
                        <span className="badge" style={{ background: '#e0e7ff', color: '#6366f1', fontSize: '10px', padding: '4px 8px' }}>
                          Active
                        </span>
                      </div>
                      
                      {/* Type 1 Messages */}
                      <div className="mb-3">
                        <div className="d-flex align-items-center mb-2">
                          <div style={{ width: '3px', height: '16px', background: '#10b981', borderRadius: '2px', marginRight: '8px' }}></div>
                          <small className="text-muted" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Type 1 (Website Leads)
                          </small>
                        </div>
                        <div style={{ background: '#f0fdf4', border: '1px solid #d1fae5', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                          <small style={{ color: '#065f46', fontWeight: '500', fontSize: '11px', display: 'block', marginBottom: '6px' }}>Message 1</small>
                          <p className="mb-0" style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {msg.type1.message1.substring(0, 80)}{msg.type1.message1.length > 80 ? '...' : ''}
                          </p>
                        </div>
                        <div style={{ background: '#f0fdf4', border: '1px solid #d1fae5', borderRadius: '8px', padding: '12px' }}>
                          <small style={{ color: '#065f46', fontWeight: '500', fontSize: '11px', display: 'block', marginBottom: '6px' }}>Message 2</small>
                          <p className="mb-0" style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {msg.type1.message2.substring(0, 80)}{msg.type1.message2.length > 80 ? '...' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Type 2 Messages */}
                      <div className="mb-3">
                        <div className="d-flex align-items-center mb-2">
                          <div style={{ width: '3px', height: '16px', background: '#f59e0b', borderRadius: '2px', marginRight: '8px' }}></div>
                          <small className="text-muted" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Type 2 (Social Media Leads)
                          </small>
                        </div>
                        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                          <small style={{ color: '#92400e', fontWeight: '500', fontSize: '11px', display: 'block', marginBottom: '6px' }}>Message 1</small>
                          <p className="mb-0" style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {msg.type2.message1.substring(0, 80)}{msg.type2.message1.length > 80 ? '...' : ''}
                          </p>
                        </div>
                        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '12px' }}>
                          <small style={{ color: '#92400e', fontWeight: '500', fontSize: '11px', display: 'block', marginBottom: '6px' }}>Message 2</small>
                          <p className="mb-0" style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {msg.type2.message2.substring(0, 80)}{msg.type2.message2.length > 80 ? '...' : ''}
                          </p>
                        </div>
                      </div>

                      <button
                        className="btn btn-sm w-100"
                        onClick={() => {
                          setSelectedCategory(msg.category);
                          setShowSidePanel(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        style={{ 
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px',
                          fontSize: '13px',
                          fontWeight: '500',
                          marginTop: '12px'
                        }}
                      >
                        ✏️ Edit Messages
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Messages;

